import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getAccountingDocuments, getInventoryMovements, getInventoryProducts, getRecentGoodsReceptionRecords, getSupplierOptions, getSupplierProfiles, getExecutiveDashboardMetrics, getUploadedDocuments } from "@/lib/admin-kiosko/database";
import { AdminEmptyState } from "../_components/AdminEmptyState";
import { AdminHeader } from "../_components/AdminHeader";
import { registerManualGoodsReceptionAction } from "../actions";
import { ManualGoodsReceptionSubmitButton } from "./ManualGoodsReceptionSubmitButton";

export const metadata: Metadata = {
  title: "Compras y proveedores APPCC | Panel interno",
  description: "OCR, recepciones, proveedores, inventario y documentación de compra.",
};

function madridDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function madridTime() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.hour === "24" ? "00" : values.hour}:${values.minute}`;
}

export default async function ComprasPage({
  searchParams,
}: {
  searchParams?: Promise<{ receipt?: string; batch?: string; receipt_existing?: string; print_job?: string; print_existing?: string; print_error?: string; receipt_error?: string }>;
}) {
  await requireAdminSession();
  const params = await searchParams;
  const [metricsResult, receptionsResult, suppliersResult, movementsResult, accountingResult, uploadsResult, productsResult, supplierOptionsResult] = await Promise.all([
    getExecutiveDashboardMetrics(),
    getRecentGoodsReceptionRecords(),
    getSupplierProfiles(),
    getInventoryMovements(),
    getAccountingDocuments(),
    getUploadedDocuments(8),
    getInventoryProducts({ status: "activos" }),
    getSupplierOptions(),
  ]);
  const metrics = metricsResult.ok ? metricsResult.data : null;
  const receptions = receptionsResult.ok ? receptionsResult.data : [];
  const suppliers = suppliersResult.ok ? suppliersResult.data : [];
  const movements = movementsResult.ok ? movementsResult.data.filter((movement) => movement.movement_type === "entrada").slice(0, 8) : [];
  const accounting = accountingResult.ok ? accountingResult.data : [];
  const uploads = uploadsResult.ok ? uploadsResult.data : [];
  const products = productsResult.ok ? productsResult.data : [];
  const supplierOptions = supplierOptionsResult.ok ? supplierOptionsResult.data : [];
  const incompleteSuppliers = suppliers.filter((supplier) => !supplier.cif || !supplier.certificates);
  const pendingReview = accounting.filter((document) => document.review_status === "pendiente_revision").length + uploads.filter((upload) => upload.review_status === "pendiente_revision").length;
  const pendingConciliation = accounting.filter((document) => document.reconciliation_status === "pendiente_conciliar").length;
  const differences = accounting.filter((document) => String(document.reconciliation_status || "").includes("diferencia")).length;
  const reconciled = accounting.filter((document) => document.reconciliation_status === "conciliado").length;

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Compras y proveedores" description="Recepciones, OCR, proveedores autorizados e inventario de entrada." />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12">
        <div className="grid gap-6">
          <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            {[
              ["OCR pendientes", metrics?.ocrToReview || 0],
              ["Recepciones mes", metrics?.receptionsThisMonth || receptions.length],
              ["Recepciones rechazadas", metrics?.rejectedReceptions || 0],
              ["Proveedores", suppliers.length],
              ["Pendientes completar", incompleteSuppliers.length],
              ["Stock bajo", metrics?.lowStockProducts || 0],
              ["Doc. revisión", pendingReview],
              ["Pend. conciliar", pendingConciliation],
              ["Conciliados", reconciled],
              ["Diferencias", differences],
            ].map(([label, value]) => (
              <article key={label} className="rounded-[1.3rem] border border-white/10 bg-[#151515] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">{label}</p>
                <p className="mt-2 text-2xl font-black text-white">{value}</p>
              </article>
            ))}
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            {[
              ["Escanear factura/albarán", "/admin-kiosko/ia"],
              ["Recepciones", "/admin-kiosko/recepcion-mercancia"],
              ["Proveedores", "/admin-kiosko/proveedores"],
              ["Inventario", "/admin-kiosko/inventario"],
              ["Documentos OCR", "/admin-kiosko/ia/historial"],
              ["Contabilidad", "/admin-kiosko/contabilidad"],
              ["Trazabilidad", "/admin-kiosko/trazabilidad"],
            ].map(([title, href]) => (
              <Link key={href} href={href} className="rounded-[1.5rem] border border-white/10 bg-[#fffaf4] p-5 text-xl font-black uppercase tracking-[-0.03em] text-stone-950 transition hover:border-[#d94b2b] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2c6bb]">{title}</Link>
            ))}
          </section>

          <section className="rounded-[1.4rem] border border-white/10 bg-[#151515] p-5">
            <div className="flex flex-col gap-2 border-b border-white/10 pb-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">Recepcion manual</p>
                <h2 className="mt-1 text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Registrar mercancia</h2>
              </div>
              <Link href="/admin-kiosko/impresiones?sourceType=goods_reception&template=ingredient_label_basic" className="text-sm font-bold text-[#f2c6bb] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2c6bb]">
                Ver etiquetas de recepcion
              </Link>
            </div>

            {params?.receipt ? (
              <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-950/30 p-3 text-sm text-emerald-50">
                {params.receipt_existing ? "Recepcion ya registrada" : "Recepcion registrada"}: lote {params.batch || "sin lote"}.
                {params.print_job ? ` Etiqueta enviada a cola (${params.print_job.slice(0, 8)}).` : ""}
                {params.print_existing ? ` Etiqueta ya existente (${params.print_existing.slice(0, 8)}).` : ""}
                {params.print_error ? ` Etiqueta pendiente: ${params.print_error}` : ""}
              </div>
            ) : null}
            {params?.receipt_error ? (
              <div className="mt-4 rounded-xl border border-[#d94b2b]/40 bg-[#3b1510] p-3 text-sm text-[#ffd6cc]">
                {params.receipt_error}
              </div>
            ) : null}

            <form action={registerManualGoodsReceptionAction} className="mt-4 grid gap-3 lg:grid-cols-12">
              <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-stone-300 lg:col-span-3">
                Proveedor
                <input name="supplier_name" list="supplier-options" required placeholder="Proveedor" className="rounded-xl border border-white/12 bg-white px-3 py-2 text-sm normal-case tracking-normal text-stone-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2c6bb]" />
                <datalist id="supplier-options">
                  {supplierOptions.map((supplier) => (
                    <option key={supplier.id} value={supplier.name} />
                  ))}
                </datalist>
              </label>
              <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-stone-300 lg:col-span-3">
                Producto
                <select name="product_id" required className="rounded-xl border border-white/12 bg-white px-3 py-2 text-sm normal-case tracking-normal text-stone-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2c6bb]">
                  <option value="">Seleccionar</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>{product.name}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-stone-300 lg:col-span-2">
                Lote
                <input name="batch_code" required placeholder="Lote proveedor" className="rounded-xl border border-white/12 bg-white px-3 py-2 text-sm normal-case tracking-normal text-stone-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2c6bb]" />
              </label>
              <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-stone-300 lg:col-span-1">
                Cant.
                <input name="quantity" required type="number" min="0.001" step="0.001" className="rounded-xl border border-white/12 bg-white px-3 py-2 text-sm normal-case tracking-normal text-stone-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2c6bb]" />
              </label>
              <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-stone-300 lg:col-span-1">
                Unidad
                <input name="unit" placeholder="ud" className="rounded-xl border border-white/12 bg-white px-3 py-2 text-sm normal-case tracking-normal text-stone-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2c6bb]" />
              </label>
              <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-stone-300 lg:col-span-2">
                Caducidad
                <input name="expiry_date" type="date" className="rounded-xl border border-white/12 bg-white px-3 py-2 text-sm normal-case tracking-normal text-stone-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2c6bb]" />
              </label>
              <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-stone-300 lg:col-span-2">
                Fecha
                <input name="received_date" type="date" defaultValue={madridDate()} className="rounded-xl border border-white/12 bg-white px-3 py-2 text-sm normal-case tracking-normal text-stone-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2c6bb]" />
              </label>
              <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-stone-300 lg:col-span-2">
                Hora
                <input name="received_time" type="time" defaultValue={madridTime()} className="rounded-xl border border-white/12 bg-white px-3 py-2 text-sm normal-case tracking-normal text-stone-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2c6bb]" />
              </label>
              <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-stone-300 lg:col-span-3">
                Conservacion
                <select name="storage_condition" defaultValue="Refrigerado 0-4 C" className="rounded-xl border border-white/12 bg-white px-3 py-2 text-sm normal-case tracking-normal text-stone-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2c6bb]">
                  <option>Refrigerado 0-4 C</option>
                  <option>Congelado -18 C</option>
                  <option>Ambiente seco</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-stone-300 lg:col-span-3">
                Responsable
                <input name="received_by" defaultValue="F. Javier Bocanegra Sanjuan" className="rounded-xl border border-white/12 bg-white px-3 py-2 text-sm normal-case tracking-normal text-stone-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2c6bb]" />
              </label>
              <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-stone-300 lg:col-span-2">
                Observaciones
                <input name="observations" placeholder="Opcional" className="rounded-xl border border-white/12 bg-white px-3 py-2 text-sm normal-case tracking-normal text-stone-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2c6bb]" />
              </label>
              <div className="flex items-end lg:col-span-2">
                <ManualGoodsReceptionSubmitButton />
              </div>
            </form>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
              <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Últimas entradas</h2>
              <div className="mt-4 grid gap-3">
                {movements.map((movement) => (
                  <Link key={movement.id} href={`/admin-kiosko/inventario?product=${movement.product_id || ""}`} className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4 text-sm text-stone-200 transition hover:border-[#d94b2b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2c6bb]">
                    {movement.admin_inventory_products?.name || "Producto"} · {movement.quantity ?? 0} {movement.unit || "ud"} · lote {movement.batch_number || "no consignado"}
                  </Link>
                ))}
                {!movements.length ? (
                  <AdminEmptyState
                    title="Sin entradas recientes"
                    description="Registra recepciones de mercancia para alimentar inventario, lotes y etiquetas de trazabilidad."
                    href="/admin-kiosko/recepcion-mercancia"
                    cta="Registrar recepcion"
                  />
                ) : null}
              </div>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
              <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Proveedores pendientes</h2>
              <div className="mt-4 grid gap-3">
                {incompleteSuppliers.slice(0, 8).map((supplier) => (
                  <Link key={supplier.id} href={`/admin-kiosko/proveedores?q=${encodeURIComponent(supplier.supplier)}`} className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4 text-sm text-stone-200 transition hover:border-[#d94b2b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2c6bb]">
                    <span className="block font-black text-white">{supplier.supplier}</span>
                    <span className="mt-1 block">Información administrativa o certificados sanitarios pendientes.</span>
                  </Link>
                ))}
                {!incompleteSuppliers.length ? (
                  <AdminEmptyState
                    title="Proveedores completos"
                    description="No hay proveedores principales con CIF o certificados pendientes."
                    href="/admin-kiosko/proveedores"
                    cta="Ver proveedores"
                  />
                ) : null}
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
              <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Documentos pendientes</h2>
              <div className="mt-4 grid gap-3">
                {accounting.filter((document) => document.review_status === "pendiente_revision" || document.reconciliation_status === "pendiente_conciliar").slice(0, 8).map((document) => (
                  <Link key={document.id} href={`/admin-kiosko/contabilidad/documentos/${document.id}`} className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4 text-sm text-stone-200 transition hover:border-[#d94b2b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2c6bb]">
                    <span className="block font-black text-white">{document.supplier_name || "Proveedor no consignado"}</span>
                    <span className="mt-1 block">{document.document_type || "Documento"} {document.document_number || ""} · {document.reconciliation_status || "pendiente_conciliar"}</span>
                  </Link>
                ))}
                {!pendingReview && !pendingConciliation ? (
                  <AdminEmptyState
                    title="Sin documentos pendientes"
                    description="No constan facturas, albaranes u originales esperando revision o conciliacion."
                    href="/admin-kiosko/ia"
                    cta="Subir documento"
                  />
                ) : null}
              </div>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
              <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Originales recientes</h2>
              <div className="mt-4 grid gap-3">
                {uploads.map((upload) => (
                  <a key={upload.id} href={`/admin-kiosko/contabilidad/documentos/${upload.id}/original`} target="_blank" rel="noreferrer" className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4 text-sm text-stone-200 transition hover:border-[#d94b2b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2c6bb]">
                    <span className="block font-black text-white">{upload.original_filename || "Documento original"}</span>
                    <span className="mt-1 block">{upload.detected_type || "tipo pendiente"} · {upload.review_status || "pendiente_revision"}</span>
                  </a>
                ))}
                {!uploads.length ? (
                  <AdminEmptyState
                    title="Sin originales recientes"
                    description="Los documentos subidos por OCR apareceran aqui con acceso al archivo original."
                    href="/admin-kiosko/ia"
                    cta="Abrir IA / OCR"
                  />
                ) : null}
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
