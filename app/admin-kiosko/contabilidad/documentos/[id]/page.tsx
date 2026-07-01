import type { Metadata } from "next";
import Link from "next/link";
import { getAccountingDocumentById, getAccountingDocumentItems, getUploadedDocumentById } from "@/lib/admin-kiosko/database";
import { requireOwnerRole } from "@/lib/admin-kiosko/roles";
import { AdminHeader } from "../../../_components/AdminHeader";
import { updateAccountingReconciliationAction } from "../../../actions";

export const metadata: Metadata = {
  title: "Documento contable | Panel interno",
  description: "Visor privado de documento original, OCR, contabilidad y conciliación.",
};

function money(value: number | null) {
  return `${Number(value || 0).toFixed(2)} €`;
}

export default async function AccountingDocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOwnerRole();
  const { id } = await params;
  const documentResult = await getAccountingDocumentById(id);
  const document = documentResult.ok ? documentResult.data : null;
  const [itemsResult, uploadResult] = await Promise.all([
    getAccountingDocumentItems(id),
    document?.uploaded_document_id ? getUploadedDocumentById(document.uploaded_document_id) : Promise.resolve({ ok: true as const, data: null }),
  ]);
  const items = itemsResult.ok ? itemsResult.data : [];
  const upload = uploadResult.ok ? uploadResult.data : null;
  const originalUrl = upload?.id ? `/admin-kiosko/contabilidad/documentos/${upload.id}/original` : "";
  const isPdf = upload?.mime_type?.includes("pdf");
  const isImage = upload?.mime_type?.startsWith("image/");

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Documento contable" description="Original privado, revisión OCR, líneas e integración APPCC." role="owner" />
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 md:py-12">
        {!document ? (
          <p className="rounded-[1.5rem] border border-amber-300/30 bg-amber-100 p-5 text-sm font-semibold text-amber-950">
            Documento no disponible. Comprueba que el SQL de contabilidad está aplicado.
          </p>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              {[
                ["Proveedor", document.supplier_name || "Proveedor no consignado"],
                ["Documento", `${document.document_type || "Documento"} ${document.document_number || ""}`.trim()],
                ["Fecha", document.document_date || "Fecha no consignada"],
                ["Estado", document.reconciliation_status || "pendiente_conciliar"],
              ].map(([label, value]) => (
                <article key={label} className="rounded-[1.3rem] border border-white/10 bg-[#151515] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">{label}</p>
                  <p className="mt-2 text-sm font-black text-white">{value}</p>
                </article>
              ))}
            </section>

            <section className="grid gap-6 lg:grid-cols-[1fr_24rem]">
              <div className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Original privado</h2>
                  {originalUrl ? (
                    <a href={originalUrl} target="_blank" rel="noreferrer" className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">
                      Descargar original
                    </a>
                  ) : null}
                </div>
                <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0d0d0d]">
                  {originalUrl && isPdf ? <iframe src={originalUrl} className="h-[36rem] w-full" title="Documento original" /> : null}
                  {originalUrl && isImage ? (
                    <object data={originalUrl} type={upload?.mime_type || "image/jpeg"} className="h-[36rem] w-full" aria-label="Documento original" />
                  ) : null}
                  {!originalUrl || (!isPdf && !isImage) ? (
                    <p className="p-5 text-sm font-semibold text-stone-300">
                      El original está registrado en Storage privado. Usa la descarga firmada temporal para abrirlo.
                    </p>
                  ) : null}
                </div>
              </div>

              <aside className="grid gap-4">
                <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
                  <h2 className="text-xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Importes</h2>
                  <div className="mt-4 grid gap-2 text-sm text-stone-200">
                    <p>Base imponible: <strong>{money(document.taxable_base)}</strong></p>
                    <p>IVA soportado: <strong>{money(document.vat_amount)}</strong></p>
                    <p>Total: <strong>{money(document.total_amount)}</strong></p>
                    <p>Revisión: <strong>{document.review_status || "pendiente_revision"}</strong></p>
                  </div>
                </section>
                <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
                  <h2 className="text-xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Conciliación</h2>
                  <form action={updateAccountingReconciliationAction} className="mt-4 grid gap-3">
                    <input type="hidden" name="document_id" value={document.id} />
                    <select name="reconciliation_status" defaultValue={document.reconciliation_status || "pendiente_conciliar"} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950">
                      <option value="pendiente_conciliar">Pendiente de conciliar</option>
                      <option value="conciliado">Conciliado</option>
                      <option value="diferencia_importe">Diferencia importe</option>
                      <option value="diferencia_producto">Diferencia producto</option>
                      <option value="diferencia_cantidad">Diferencia cantidad</option>
                      <option value="revisado_manual">Revisado manualmente</option>
                    </select>
                    <textarea name="observations" defaultValue={document.observations || ""} rows={3} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950" />
                    <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">
                      Guardar estado
                    </button>
                  </form>
                </section>
                <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
                  <h2 className="text-xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Accesos</h2>
                  <div className="mt-4 grid gap-2">
                    <Link href={`/admin-kiosko/proveedores?q=${encodeURIComponent(document.supplier_name || "")}`} className="rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-sm font-semibold text-stone-200">Ver proveedor</Link>
                    <Link href="/admin-kiosko/inventario" className="rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-sm font-semibold text-stone-200">Ver inventario</Link>
                    <Link href="/admin-kiosko/trazabilidad" className="rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-sm font-semibold text-stone-200">Ver trazabilidad</Link>
                  </div>
                </section>
              </aside>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
              <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Productos</h2>
              <div className="mt-5 overflow-x-auto">
                <table className="min-w-[58rem] w-full border-separate border-spacing-y-2 text-left text-sm">
                  <thead className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f2c6bb]">
                    <tr><th className="px-3 py-2">Producto</th><th className="px-3 py-2">Cantidad</th><th className="px-3 py-2">Precio</th><th className="px-3 py-2">Total</th><th className="px-3 py-2">Lote</th><th className="px-3 py-2">Caducidad</th></tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="bg-[#fffaf4] text-stone-950">
                        <td className="rounded-l-2xl px-3 py-3 font-black">{item.product_name || "Producto no consignado"}</td>
                        <td className="px-3 py-3">{item.quantity || 0} {item.unit || "ud"}</td>
                        <td className="px-3 py-3">{money(item.unit_price)}</td>
                        <td className="px-3 py-3">{money(item.total_amount)}</td>
                        <td className="px-3 py-3">{item.batch_number || "No consignado"}</td>
                        <td className="rounded-r-2xl px-3 py-3">{item.expiry_date || "No consignada"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
