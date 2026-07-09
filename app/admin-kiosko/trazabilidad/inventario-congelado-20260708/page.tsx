import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import {
  FREEZER_BATCH_20260708,
  applyRegisteredFreezerLotStatus,
  buildFreezerInventoryLabelEzpl,
  freezerInventory20260708Service,
  freezerInventoryCatalog20260708,
  type FreezerInventoryLot,
} from "@/lib/admin-kiosko/domain/freezer-inventory-20260708.service";
import { summarizeGodexEzpl } from "@/lib/admin-kiosko/printing/godex-80x50-ezpl.mjs";
import { AdminHeader } from "../../_components/AdminHeader";
import { Label80x50Preview } from "../../_components/Label80x50Preview";
import { FreezerInventoryPrintButton } from "./FreezerInventoryPrintButton";

export const metadata: Metadata = {
  title: "Inventario congelado 08/07/2026 | Panel interno",
  description: "Batch APPCC FRZ-20260708 recibido congelado, previews e impresión GoDEX 80x50.",
};

function stateLabel(value: FreezerInventoryLot["effectiveStatus"]) {
  if (value === "apto") return "Apto congelado";
  if (value === "cuarentena") return "Cuarentena";
  return "Revisión";
}

function stateClass(value: FreezerInventoryLot["effectiveStatus"]) {
  if (value === "apto") return "border-emerald-300/30 bg-emerald-100/10 text-emerald-100";
  if (value === "cuarentena") return "border-[#d94b2b]/50 bg-[#3b1510] text-[#ffd6cc]";
  return "border-amber-200/30 bg-amber-100/10 text-amber-100";
}

function dateText(value?: string | null) {
  if (!value) return "revisar";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function freezerReceptionText(lot: FreezerInventoryLot) {
  return lot.receivedAt ? `Recep. factura: ${dateText(lot.receivedAt)}` : "Recep. factura: revisar";
}

function groupLots(lots: FreezerInventoryLot[]) {
  return freezerInventoryCatalog20260708.map((product) => ({
    product,
    lots: lots.filter((lot) => lot.itemNo === product.itemNo),
  }));
}

function productEffectiveStatus(lots: FreezerInventoryLot[]): FreezerInventoryLot["effectiveStatus"] {
  if (lots.some((lot) => lot.effectiveStatus === "cuarentena")) return "cuarentena";
  if (lots.length > 0 && lots.every((lot) => lot.effectiveStatus === "apto")) return "apto";
  return "revision";
}

function LabelPreviewCard({ lot }: { lot: FreezerInventoryLot }) {
  const ezplSummary = summarizeGodexEzpl(buildFreezerInventoryLabelEzpl(lot));
  return (
    <article className="grid gap-3 rounded-[1rem] border border-white/10 bg-white/6 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="break-words text-sm font-black text-white">{lot.internalLot}</p>
          <p className="mt-1 text-xs text-stone-400">{lot.productName}</p>
        </div>
        <span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em] ${stateClass(lot.effectiveStatus)}`}>
          {stateLabel(lot.effectiveStatus)}
        </span>
      </div>
      <Label80x50Preview
        title={lot.productName}
        kind={lot.effectiveStatus === "cuarentena" ? "CUARENTENA" : lot.effectiveStatus === "apto" ? "CONGELADO" : "REVISIÓN"}
        batch={lot.internalLot}
        productionDate={freezerReceptionText(lot)}
        expiryDate={lot.expiryVisible || dateText(lot.expiryDate)}
        quantity={lot.quantityText}
        responsible="F. Javier Bocanegra Sanjuan"
        storage="-18 C o inferior"
        trace={lot.traceValue}
        observations={lot.reviewWarning || `Registro inv.: ${dateText(lot.inventoryCheckedAt)}`}
      />
      <p className="text-[10px] text-stone-500">EZPL {ezplSummary.rawCommandLength} bytes · GoDEX 80x50 · 203 dpi</p>
      {lot.invoiceRef || lot.purchaseSource?.supplierLot ? (
        <p className="text-[10px] font-semibold text-stone-400">
          {lot.invoiceRef ? `FACT/REF ${lot.invoiceRef}` : ""}
          {lot.invoiceRef && lot.purchaseSource?.supplierLot ? " · " : ""}
          {lot.purchaseSource?.supplierLot ? `LOTE PROV ${lot.purchaseSource.supplierLot}` : ""}
        </p>
      ) : null}
    </article>
  );
}

export default async function FrozenInventoryPage() {
  await requireAdminSession();

  const verification = await freezerInventory20260708Service.verifyBatchRegistration();
  const lotsResult = await freezerInventory20260708Service.listLotsWithRegisteredStatus();
  const lots = lotsResult.ok ? lotsResult.data : applyRegisteredFreezerLotStatus(freezerInventory20260708Service.listLots(), []);
  const metrics = {
    products: freezerInventoryCatalog20260708.length,
    labels: lots.length,
    aptLabels: lots.filter((lot) => lot.effectiveStatus === "apto").length,
    reviewLabels: lots.filter((lot) => lot.effectiveStatus === "revision").length,
    quarantineLabels: lots.filter((lot) => lot.effectiveStatus === "cuarentena").length,
  };
  const grouped = groupLots(lots);
  const canPrint = verification.status === "verified";
  const verificationError = verification.error?.slice(0, 200) || "Impresión bloqueada hasta verificar 52 lotes en BD.";
  const aptLots = lots.filter((lot) => lot.effectiveStatus === "apto");
  const reviewLots = lots.filter((lot) => lot.effectiveStatus === "revision" || lot.effectiveStatus === "cuarentena");

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader
        title="Inventario congelado FRZ-20260708"
        description="Batch inventariado el 08/07/2026. Recepción documental pendiente de revisión. Previews e impresión manual GoDEX 80x50."
      />
      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-8 sm:px-6 md:py-12">
        <section className="rounded-[1.4rem] border border-white/10 bg-[#151515] p-5">
          <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">Batch APPCC</p>
              <h1 className="mt-1 text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">{FREEZER_BATCH_20260708.batchCode}</h1>
              <div className="mt-3 grid gap-1 text-sm text-stone-300 sm:grid-cols-2">
                <p>Recepción factura/albarán: pendiente revisión</p>
                <p>Registro inventario: 08/07/2026</p>
                <p>Estado entrada: RECIBIDO CONGELADO</p>
                <p>Estado actual: CONGELADO</p>
                <p>Conservación: -18 C o inferior</p>
                <p>Fuente: {FREEZER_BATCH_20260708.sourceDocument}</p>
                <p>Notas: {FREEZER_BATCH_20260708.notes}</p>
              </div>
            </div>
            <div className="grid gap-2 rounded-xl border border-white/10 bg-white/6 p-4 text-sm text-stone-200">
              <p><span className="font-black text-white">{metrics.products}</span> productos</p>
              <p><span className="font-black text-white">{metrics.labels}</span> etiquetas/envases</p>
              <p><span className="font-black text-emerald-100">{metrics.aptLabels}</span> aptas congeladas</p>
              <p><span className="font-black text-amber-100">{metrics.reviewLabels}</span> revisión</p>
              <p><span className="font-black text-[#ffd6cc]">{metrics.quarantineLabels}</span> cuarentena</p>
              <p><span className={canPrint ? "font-black text-emerald-100" : "font-black text-amber-100"}>{verification.registeredTotal}</span> lotes localizados en BD</p>
              <p><span className="font-black text-emerald-100">{verification.registeredApt}</span> aptas BD · <span className="font-black text-amber-100">{verification.registeredReview}</span> revisión BD · <span className="font-black text-[#ffd6cc]">{verification.registeredQuarantine}</span> cuarentena BD</p>
            </div>
          </div>
        </section>

        {!canPrint ? (
          <p className="rounded-xl border border-amber-200/30 bg-amber-100/10 px-4 py-3 text-sm font-semibold text-amber-100">
            {verificationError} La pantalla sigue mostrando el batch preparado y los previews, pero la impresión está bloqueada.
          </p>
        ) : null}

        <section className="grid gap-4 rounded-[1.4rem] border border-white/10 bg-[#151515] p-5 lg:grid-cols-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">Impresión manual</p>
            <h2 className="mt-1 text-xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Cola GoDEX</h2>
            <p className="mt-2 text-sm leading-6 text-stone-300">No se imprime al cargar. Cada botón pide confirmación y crea trabajos nuevos en `print_jobs` con EZPL 80x50.</p>
            {!canPrint ? (
              <p className="mt-3 rounded-xl border border-amber-200/30 bg-amber-100/10 px-3 py-2 text-sm font-semibold text-amber-100">
                Impresión bloqueada hasta verificar 52 lotes en BD.
              </p>
            ) : (
              <p className="mt-3 rounded-xl border border-emerald-300/30 bg-emerald-100/10 px-3 py-2 text-sm font-semibold text-emerald-100">
                BD verificada: 52 lotes FRZ-20260708 localizados.
              </p>
            )}
          </div>
          <div className="grid gap-3">
            <FreezerInventoryPrintButton scope="apt" count={aptLots.length} disabled={!canPrint || aptLots.length === 0} disabledReason={!canPrint ? "Impresión bloqueada hasta verificar 52 lotes en BD." : "No hay etiquetas aptas verificadas en BD."} />
            <FreezerInventoryPrintButton scope="review_or_quarantine" count={reviewLots.length} disabled={!canPrint} disabledReason="Impresión bloqueada hasta verificar 52 lotes en BD." />
          </div>
        </section>

        <section className="overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#151515]">
          <div className="border-b border-white/10 p-5">
            <h2 className="text-xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Productos y envases</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[74rem] text-left text-sm">
              <thead className="bg-white/6 text-[10px] uppercase tracking-[0.12em] text-stone-400">
                <tr>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Marca/proveedor</th>
                  <th className="px-4 py-3">Envases</th>
                  <th className="px-4 py-3">Peso/unidades</th>
                  <th className="px-4 py-3">Lotes internos</th>
                  <th className="px-4 py-3">Lote fab.</th>
                  <th className="px-4 py-3">Caducidad</th>
                  <th className="px-4 py-3">Estado revisión</th>
                  <th className="px-4 py-3">Alérgenos/resumen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {grouped.map(({ product, lots: productLots }) => (
                  <tr key={product.itemNo} className="align-top text-stone-200">
                    <td className="px-4 py-4 font-black text-white">{product.productName}</td>
                    <td className="px-4 py-4">{product.brandSupplier || "revisar"}</td>
                    <td className="px-4 py-4">{product.packageCount}</td>
                    <td className="px-4 py-4">{productLots[0]?.quantityText || "revisar"}</td>
                    <td className="px-4 py-4">
                      <span className="break-words text-xs">{productLots.map((lot) => lot.internalLot).join(", ")}</span>
                    </td>
                    <td className="px-4 py-4">{product.manufacturerLot || product.manufacturerLotVisible || "revisar"}</td>
                    <td className="px-4 py-4">{product.expiryVisible || dateText(product.expiryDate)}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em] ${stateClass(productEffectiveStatus(productLots))}`}>
                        {stateLabel(productEffectiveStatus(productLots))}
                      </span>
                      {productLots[0]?.reviewWarning ? <p className="mt-2 text-xs text-stone-400">{productLots[0].reviewWarning}</p> : product.reviewNote ? <p className="mt-2 text-xs text-stone-400">{product.reviewNote}</p> : null}
                    </td>
                    <td className="px-4 py-4 text-xs leading-5">{product.allergensSummary || product.ingredientsSummary || "revisar ficha"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-[1.4rem] border border-white/10 bg-[#151515] p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">Preview por batch</p>
              <h2 className="mt-1 text-xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Todas las etiquetas individuales</h2>
            </div>
            <span className="text-xs font-semibold text-stone-400">{lots.length} previews · GoDEX 80x50</span>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {lots.map((lot) => <LabelPreviewCard key={lot.internalLot} lot={lot} />)}
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link href="/admin-kiosko/impresiones?sourceType=freezer_inventory_20260708" className="rounded-full border border-white/20 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Ver cola impresión</Link>
          <Link href="/admin-kiosko/trazabilidad" className="rounded-full border border-white/20 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Abrir trazabilidad</Link>
        </div>
      </section>
    </main>
  );
}
