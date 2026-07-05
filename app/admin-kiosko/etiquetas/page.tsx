import type { Metadata } from "next";
import Image from "next/image";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getLabelRecords, getLabelSourceOptions, listLabelEligibleInventoryLots } from "@/lib/admin-kiosko/database";
import { buildZebraLabelZpl, type ZebraTemplate } from "@/lib/admin-kiosko/zebra";
import { AdminHeader } from "../_components/AdminHeader";
import { ZebraPrintButton } from "../_components/ZebraPrintButton";
import { saveLabelRecordAction } from "../actions";
import { GodexPrintButton } from "./GodexPrintButton";
import { PrintButton } from "./PrintButton";

export const metadata: Metadata = {
  title: "Etiquetas APPCC | Panel interno",
  description: "Etiquetas APPCC listas para impresión térmica o A4.",
};

function zebraTemplate(model: string): ZebraTemplate {
  if (model === "Congelación") return "congelacion";
  if (model === "Descongelación") return "descongelacion";
  if (model === "Recepción") return "recepcion";
  if (model === "Lote") return "trazabilidad";
  if (model === "Caducidad") return "trazabilidad";
  return "elaboracion";
}

function labelFromParams(params: Record<string, string>) {
  const supplier = params.supplier || params.source_supplier || "";
  return {
    model: params.model || "Elaboración",
    product: params.product || "",
    batch: params.batch || "",
    supplier,
    elaboration_date: params.elaboration_date || "",
    opening_date: params.opening_date || "",
    freezing_date: params.freezing_date || "",
    defrosting_date: params.defrosting_date || "",
    best_before_date: params.best_before_date || "",
    responsible: params.responsible || "F. Javier Bocanegra Sanjuan",
    print_format: params.print_format || "a4",
    copies: Number(params.copies || 8),
    qr_payload: params.qr_payload || JSON.stringify({
      type: "appcc-label",
      product: params.product || "",
      batch: params.batch || "",
      supplier,
      source_batch_number: params.source_batch_number || "",
      freezing_date: params.freezing_date || "",
      defrosting_date: params.defrosting_date || "",
    }),
  };
}

function sourceLabel(source?: string | null) {
  if (source === "real_documentada") return "Caducidad real documentada";
  if (source === "estimada_por_regla") return "Caducidad estimada/revisada";
  if (source === "revisada_manual") return "Caducidad revisada manualmente";
  return "Fuente de caducidad pendiente";
}

function appccLabel(status?: string | null) {
  if (status === "aprobado" || status === "revisado") return "Lote revisado y apto";
  if (status === "requiere_documentacion") return "Requiere documentación";
  return "Pendiente de revisión";
}

function LabelCard({ label }: { label: ReturnType<typeof labelFromParams> }) {
  const qr = `/admin-kiosko/etiquetas/qr?p=${encodeURIComponent(label.qr_payload)}`;
  return (
    <article className="break-inside-avoid rounded-xl border-2 border-stone-950 bg-white p-4 text-stone-950">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-black uppercase tracking-[0.08em]">KIOSKO ALFRESKO</p>
          <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-[#d94b2b]">{label.model}</p>
        </div>
        <Image src={qr} alt="QR APPCC" width={80} height={80} className="h-20 w-20 border border-stone-950 bg-white" unoptimized />
      </div>
      <div className="mt-3 grid gap-1 text-sm">
        <p><strong>Producto:</strong> {label.product || "-"}</p>
        <p><strong>Lote:</strong> {label.batch || "-"}</p>
        <p><strong>Proveedor:</strong> {label.supplier || "-"}</p>
        <p><strong>Elaboración:</strong> {label.elaboration_date || "-"}</p>
        <p><strong>Apertura:</strong> {label.opening_date || "-"}</p>
        <p><strong>Congelación:</strong> {label.freezing_date || "-"}</p>
        <p><strong>Descongelación:</strong> {label.defrosting_date || "-"}</p>
        <p><strong>Consumir antes de:</strong> {label.best_before_date || "-"}</p>
        <p><strong>Responsable:</strong> {label.responsible || "-"}</p>
      </div>
    </article>
  );
}

export default async function EtiquetasPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string>>;
}) {
  await requireAdminSession();
  const params = await searchParams || {};
  const [historyResult, sourcesResult, inventoryLotsResult] = await Promise.all([
    getLabelRecords(20),
    getLabelSourceOptions(),
    listLabelEligibleInventoryLots(120),
  ]);
  const history = historyResult.ok ? historyResult.data : [];
  const sources = sourcesResult.ok ? sourcesResult.data : [];
  const inventoryLots = inventoryLotsResult.ok ? inventoryLotsResult.data : [];
  const selected = history.find((record) => record.id === params.id);
  const selectedSource = sources.find((source) => source.key === params.source);
  const selectedInventoryLot = inventoryLots.find((lot) => lot.inventory_lot_id === params.inventory_lot);
  const current = selected
    ? {
        model: selected.model,
        product: selected.product || "",
        batch: selected.batch || "",
        supplier: selected.supplier || "",
        elaboration_date: selected.elaboration_date || "",
        opening_date: selected.opening_date || "",
        freezing_date: selected.freezing_date || "",
        defrosting_date: selected.defrosting_date || "",
        best_before_date: selected.best_before_date || "",
        responsible: selected.responsible || "F. Javier Bocanegra Sanjuan",
        print_format: selected.print_format || "a4",
        copies: selected.copies || 8,
        qr_payload: selected.qr_payload || "",
        inventory_lot_id: selected.inventory_lot_id || "",
        product_id: selected.product_id || "",
        accounting_document_id: selected.accounting_document_id || "",
        supplier_document_id: selected.supplier_document_id || "",
        uploaded_document_id: selected.uploaded_document_id || "",
        label_type: selected.label_type || "",
        expiry_source: selected.expiry_source || "",
        appcc_review_status: selected.appcc_review_status || "",
        review_warning: selected.review_warning || "",
        factura: "",
        storage_temperature: "",
      }
    : selectedInventoryLot
      ? {
          model: "Recepción",
          product: selectedInventoryLot.producto || "",
          batch: selectedInventoryLot.lote || "",
          supplier: selectedInventoryLot.proveedor || "",
          elaboration_date: selectedInventoryLot.fecha_compra || "",
          opening_date: "",
          freezing_date: "",
          defrosting_date: "",
          best_before_date: selectedInventoryLot.caducidad || "",
          responsible: "F. Javier Bocanegra Sanjuan",
          print_format: "termica",
          copies: 1,
          qr_payload: JSON.stringify({
            type: "inventory_lot",
            inventory_lot_id: selectedInventoryLot.inventory_lot_id,
            product: selectedInventoryLot.producto || "",
            batch: selectedInventoryLot.lote || "",
            supplier: selectedInventoryLot.proveedor || "",
            invoice: selectedInventoryLot.factura || "",
            expiry_date: selectedInventoryLot.caducidad || "",
            expiry_source: selectedInventoryLot.expiry_source || "",
          }),
          inventory_lot_id: selectedInventoryLot.inventory_lot_id,
          product_id: selectedInventoryLot.product_id || "",
          accounting_document_id: selectedInventoryLot.purchase_document_id || "",
          supplier_document_id: selectedInventoryLot.supplier_document_id || "",
          uploaded_document_id: selectedInventoryLot.uploaded_document_id || "",
          label_type: "inventory_lot",
          expiry_source: selectedInventoryLot.expiry_source || "",
          appcc_review_status: selectedInventoryLot.appcc_review_status || "",
          review_warning: selectedInventoryLot.labelValidation.warning || "",
          factura: selectedInventoryLot.factura || "",
          storage_temperature: selectedInventoryLot.storage_temperature || selectedInventoryLot.ubicacion || "",
        }
    : selectedSource
      ? {
          model: selectedSource.model,
          product: selectedSource.product,
          batch: selectedSource.batch,
          supplier: selectedSource.supplier,
          elaboration_date: selectedSource.elaboration_date,
          opening_date: "",
          freezing_date: selectedSource.model === "Congelación" ? selectedSource.elaboration_date : "",
          defrosting_date: selectedSource.model === "Descongelación" ? selectedSource.elaboration_date : "",
          best_before_date: selectedSource.best_before_date,
          responsible: selectedSource.responsible,
          print_format: "termica",
          copies: 1,
          qr_payload: JSON.stringify({
            type: "appcc-label",
            product: selectedSource.product,
            batch: selectedSource.batch,
            supplier: selectedSource.supplier,
            source_batch_number: selectedSource.source_batch_number,
          }),
          inventory_lot_id: "",
          product_id: "",
          accounting_document_id: "",
          supplier_document_id: "",
          uploaded_document_id: "",
          label_type: "",
          expiry_source: "",
          appcc_review_status: "",
          review_warning: "",
          factura: "",
          storage_temperature: "",
        }
    : {
        ...labelFromParams(params),
        inventory_lot_id: "",
        product_id: "",
        accounting_document_id: "",
        supplier_document_id: "",
        uploaded_document_id: "",
        label_type: "",
        expiry_source: "",
        appcc_review_status: "",
        review_warning: "",
        factura: "",
        storage_temperature: "",
      };
  const copies = Math.max(1, Math.min(48, current.copies || 8));
  const template = zebraTemplate(current.model);
  const currentLotValidation = selectedInventoryLot?.labelValidation;
  const zpl = buildZebraLabelZpl({
    template,
    product: current.product,
    batch: current.batch,
    supplier: current.supplier,
    productionDate: current.elaboration_date,
    freezingDate: current.freezing_date,
    defrostingDate: current.defrosting_date,
    expiryDate: current.best_before_date,
    responsible: current.responsible,
    copies,
    warningText: current.review_warning || undefined,
    invoice: current.factura,
    inventoryLotId: current.inventory_lot_id,
    expirySource: current.expiry_source,
    appccReviewStatus: current.appcc_review_status,
  });

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Etiquetas APPCC" description="Generador de etiquetas con historial e impresión A4 o térmica." />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12">
        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(20rem,25rem)_minmax(0,1fr)]">
          <div className="grid min-w-0 gap-6 print:hidden">
            <form action={saveLabelRecordAction} className="min-w-0 rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
              <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Etiqueta desde lote</h2>
              <div className="mt-5 grid gap-4">
                <input type="hidden" name="model" value={current.model} />
                <input type="hidden" name="product" value={current.product} />
                <input type="hidden" name="batch" value={current.batch} />
                <input type="hidden" name="supplier_name" value={current.supplier} />
                <input type="hidden" name="elaboration_date" value={current.elaboration_date} />
                <input type="hidden" name="opening_date" value={current.opening_date} />
                <input type="hidden" name="freezing_date" value={current.freezing_date} />
                <input type="hidden" name="defrosting_date" value={current.defrosting_date} />
                <input type="hidden" name="best_before_date" value={current.best_before_date} />
                <input type="hidden" name="responsible" value={current.responsible} />
                <input type="hidden" name="print_format" value={current.print_format} />
                <input type="hidden" name="inventory_lot_id" value={current.inventory_lot_id} />
                <input type="hidden" name="product_id" value={current.product_id} />
                <input type="hidden" name="accounting_document_id" value={current.accounting_document_id} />
                <input type="hidden" name="supplier_document_id" value={current.supplier_document_id} />
                <input type="hidden" name="uploaded_document_id" value={current.uploaded_document_id} />
                <input type="hidden" name="label_type" value={current.label_type} />
                <input type="hidden" name="expiry_source" value={current.expiry_source} />
                <input type="hidden" name="appcc_review_status" value={current.appcc_review_status} />
                <input type="hidden" name="review_warning" value={current.review_warning} />
                <div className="rounded-[1.3rem] border border-white/10 bg-white/6 p-4 text-sm text-stone-200">
                  <p className="font-black text-white">{current.model} · {current.product || "Selecciona un lote"}</p>
                  <p className="mt-2">Lote {current.batch || "pendiente"} · proveedor {current.supplier || "pendiente"} · caducidad {current.best_before_date || "vida útil no consignada"}</p>
                  {current.inventory_lot_id ? (
                    <p className="mt-2 text-xs text-stone-300">{sourceLabel(current.expiry_source)} · {appccLabel(current.appcc_review_status)} · factura {current.factura || "origen enlazado"}</p>
                  ) : null}
                  {current.review_warning ? <p className="mt-2 rounded-xl border border-amber-200/30 bg-amber-100/10 px-3 py-2 text-xs font-black text-amber-100">{current.review_warning}</p> : null}
                </div>
                <label className="grid gap-2 text-sm font-semibold text-stone-200">Copias Zebra
                  <select name="copies" defaultValue={String(copies)} className="w-full min-w-0 rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950">
                    {[1, 2, 4, 8].map((copy) => <option key={copy} value={copy}>{copy} copia{copy > 1 ? "s" : ""}</option>)}
                  </select>
                </label>
                <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white">Guardar etiqueta</button>
              </div>
            </form>

            <section className="min-w-0 rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
              <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Etiquetas desde inventario</h2>
              <div className="mt-4 grid gap-3">
                {inventoryLots.slice(0, 18).map((lot) => (
                  <article key={lot.inventory_lot_id} className="min-w-0 rounded-[1.2rem] border border-white/10 bg-white/6 p-4 text-sm text-stone-200">
                    <div className="flex flex-col gap-3">
                      <div>
                        <p className="break-words font-black text-white">{lot.producto || "Producto"}</p>
                        <p className="mt-1 text-xs text-stone-400">
                          Lote {lot.lote || "sin lote"} · {lot.stock ?? 0} {lot.unidad || "ud"} · caduca {lot.caducidad || "pendiente"} · {lot.proveedor || "proveedor registrado"}
                        </p>
                        <p className="mt-1 text-xs text-stone-400">
                          {sourceLabel(lot.expiry_source)} · {appccLabel(lot.appcc_review_status)} · factura {lot.factura || "origen enlazado"}
                        </p>
                      </div>
                      <p className={lot.labelValidation.directPrintAllowed ? "rounded-xl border border-emerald-300/20 bg-emerald-100/10 px-3 py-2 text-xs font-semibold text-emerald-100" : "rounded-xl border border-amber-200/20 bg-amber-100/10 px-3 py-2 text-xs font-semibold text-amber-100"}>
                        {lot.labelValidation.message}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <a href={`/admin-kiosko/etiquetas?inventory_lot=${lot.inventory_lot_id}`} className="rounded-full border border-white/20 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-white">Preview</a>
                        {lot.labelValidation.directPrintAllowed ? (
                          <a href={`/admin-kiosko/etiquetas?inventory_lot=${lot.inventory_lot_id}`} className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-white">Preparar impresión</a>
                        ) : (
                          <a href="/admin-kiosko/inventario#lotes-pendientes-revision" className="rounded-full border border-amber-200/40 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-amber-100">Revisar lote</a>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
                {!inventoryLots.length ? <p className="text-sm text-stone-400">No constan lotes de inventario listos para preparar etiqueta.</p> : null}
              </div>
            </section>

            <form className="min-w-0 rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
              <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Seleccionar lote</h2>
              <div className="mt-5 grid gap-4">
                <select name="source" defaultValue={params.source || ""} className="w-full min-w-0 rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950">
                  <option value="">Lote interno o lote proveedor</option>
                  {sources.map((source) => (
                    <option key={source.key} value={source.key}>
                      {source.kind === "internal" ? "Interno" : "Proveedor"} · {source.batch} · {source.product} · {source.supplier || "proveedor registrado"}
                    </option>
                  ))}
                </select>
                <button className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white">Cargar lote</button>
              </div>
            </form>

            <section className="min-w-0 rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
              <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Historial</h2>
              <div className="mt-4 grid gap-3">
                {history.map((record) => (
                  <a key={record.id} href={`/admin-kiosko/etiquetas?id=${record.id}`} className="min-w-0 rounded-[1.2rem] border border-white/10 bg-white/6 p-4 text-sm text-stone-200 transition hover:border-[#d94b2b]">
                    <span className="block font-black text-white">{record.model} · {record.product || "Producto no consignado"}</span>
                    <span className="mt-1 block text-xs text-stone-400">Lote {record.batch || "no consignado"} · {record.created_at.slice(0, 10)}</span>
                  </a>
                ))}
                {!history.length ? <p className="text-sm text-stone-400">Historial preparado para próximas etiquetas.</p> : null}
              </div>
            </section>
          </div>

          <section className="min-w-0 overflow-hidden rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6 print:border-0 print:bg-white print:p-0">
            <div className="flex min-w-0 flex-col gap-4 print:hidden 2xl:flex-row 2xl:items-center 2xl:justify-between">
              <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Vista imprimible</h2>
              <div className="flex min-w-0 flex-wrap items-start gap-3">
                {currentLotValidation && !currentLotValidation.directPrintAllowed ? (
                  <a href="/admin-kiosko/inventario#lotes-pendientes-revision" className="rounded-full border border-amber-200/40 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-amber-100">Revisar antes de imprimir</a>
                ) : (
                  <>
                    <GodexPrintButton
                      payload={{
                        model: current.model,
                        product: current.product,
                        batch: current.batch,
                        supplier: current.supplier,
                        elaboration_date: current.elaboration_date,
                        opening_date: current.opening_date,
                        freezing_date: current.freezing_date,
                        defrosting_date: current.defrosting_date,
                        best_before_date: current.best_before_date,
                        responsible: current.responsible,
                        copies,
                        qr_payload: current.qr_payload,
                        inventory_lot_id: current.inventory_lot_id,
                        product_id: current.product_id,
                        accounting_document_id: current.accounting_document_id,
                        supplier_document_id: current.supplier_document_id,
                        uploaded_document_id: current.uploaded_document_id,
                        label_type: current.label_type || "inventory_lot",
                        expiry_source: current.expiry_source,
                        appcc_review_status: current.appcc_review_status,
                        review_warning: current.review_warning,
                      }}
                      disabled={!current.product || !current.batch}
                    />
                    <ZebraPrintButton
                      zpl={zpl}
                      filename={`${current.batch || current.product || "etiqueta-appcc"}.zpl`}
                      historyPayload={{
                        model: current.model,
                        template,
                        product: current.product,
                        batch: current.batch,
                        supplier: current.supplier,
                        production_date: current.elaboration_date,
                        freezing_date: current.freezing_date,
                        defrosting_date: current.defrosting_date,
                        expiry_date: current.best_before_date,
                        responsible: current.responsible,
                        copies,
                        inventory_lot_id: current.inventory_lot_id,
                        product_id: current.product_id,
                        accounting_document_id: current.accounting_document_id,
                        supplier_document_id: current.supplier_document_id,
                        uploaded_document_id: current.uploaded_document_id,
                        label_type: current.label_type || "inventory_lot",
                        expiry_source: current.expiry_source,
                        appcc_review_status: current.appcc_review_status,
                        review_warning: current.review_warning,
                      }}
                    />
                  </>
                )}
                <PrintButton />
              </div>
            </div>
            <div className="mt-6 max-h-[75vh] min-w-0 overflow-auto rounded-[1.2rem] bg-white/5 p-2 print:mt-0 print:max-h-none print:overflow-visible print:bg-transparent print:p-0">
              <div className={current.print_format === "termica" ? "grid w-full max-w-[26rem] gap-3 print:mt-0" : "grid min-w-[34rem] gap-4 md:grid-cols-2 xl:min-w-0 print:mt-0 print:grid-cols-2"}>
                {Array.from({ length: copies }).map((_, index) => <LabelCard key={index} label={current} />)}
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
