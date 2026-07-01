import type { Metadata } from "next";
import Link from "next/link";
import { getAccountingDocuments, getUploadedDocuments, getSupplierOptions } from "@/lib/admin-kiosko/database";
import { requireOwnerRole } from "@/lib/admin-kiosko/roles";
import { AdminHeader } from "../_components/AdminHeader";

export const metadata: Metadata = {
  title: "Contabilidad y compras | Panel interno",
  description: "Facturas, albaranes, IVA, conciliación e inventario.",
};

export default async function ContabilidadPage({
  searchParams,
}: {
  searchParams?: Promise<{ from?: string; to?: string; supplier?: string; type?: string; status?: string }>;
}) {
  await requireOwnerRole();
  const params = await searchParams;
  const [documentsResult, uploadsResult, suppliersResult] = await Promise.all([
    getAccountingDocuments({ dateFrom: params?.from, dateTo: params?.to, supplier: params?.supplier, type: params?.type, status: params?.status }),
    getUploadedDocuments(20),
    getSupplierOptions(),
  ]);
  const documents = documentsResult.ok ? documentsResult.data : [];
  const uploads = uploadsResult.ok ? uploadsResult.data : [];
  const suppliers = suppliersResult.ok ? suppliersResult.data : [];
  const totals = documents.reduce((acc, document) => ({
    taxable: acc.taxable + Number(document.taxable_base || 0),
    vat: acc.vat + Number(document.vat_amount || 0),
    total: acc.total + Number(document.total_amount || 0),
  }), { taxable: 0, vat: 0, total: 0 });
  const pending = documents.filter((document) => document.reconciliation_status === "pendiente_conciliar").length;
  const reconciled = documents.filter((document) => document.reconciliation_status === "conciliado").length;
  const differences = documents.filter((document) => String(document.reconciliation_status || "").includes("diferencia")).length;
  const bySupplier = Array.from(documents.reduce((map, document) => {
    const key = document.supplier_name || "Proveedor no consignado";
    map.set(key, (map.get(key) || 0) + Number(document.total_amount || 0));
    return map;
  }, new Map<string, number>()).entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Contabilidad y compras" description="Central de facturas, albaranes, IVA, conciliación e inventario." role="owner" />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12">
        <div className="grid gap-6">
          <section className="grid gap-3 md:grid-cols-4 xl:grid-cols-7">
            {[
              ["Total compras", `${totals.total.toFixed(2)} €`],
              ["Base imponible", `${totals.taxable.toFixed(2)} €`],
              ["IVA soportado", `${totals.vat.toFixed(2)} €`],
              ["Documentos", documents.length],
              ["Pendientes", pending],
              ["Conciliados", reconciled],
              ["Diferencias", differences],
            ].map(([label, value]) => (
              <article key={label} className="rounded-[1.3rem] border border-white/10 bg-[#151515] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">{label}</p>
                <p className="mt-2 text-xl font-black text-white">{value}</p>
              </article>
            ))}
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
            <div className="flex flex-wrap gap-3">
              <Link href="/admin-kiosko/ia" className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Subir factura/albarán OCR</Link>
              <Link href="/admin-kiosko/contabilidad/exportar" className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Exportar CSV</Link>
              <Link href="/admin-kiosko/proveedores" className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Proveedores</Link>
              <Link href="/admin-kiosko/inventario" className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Inventario</Link>
            </div>
            <form className="mt-5 grid gap-3 md:grid-cols-6">
              <input name="from" type="date" defaultValue={params?.from || ""} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950" />
              <input name="to" type="date" defaultValue={params?.to || ""} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950" />
              <input name="supplier" list="accounting-suppliers" defaultValue={params?.supplier || ""} placeholder="Proveedor" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950" />
              <datalist id="accounting-suppliers">{suppliers.map((supplier) => <option key={supplier.id} value={supplier.name} />)}</datalist>
              <select name="type" defaultValue={params?.type || "todos"} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950">
                <option value="todos">Tipo</option>
                <option value="factura">Factura</option>
                <option value="albaran">Albarán</option>
              </select>
              <select name="status" defaultValue={params?.status || "todos"} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950">
                <option value="todos">Estado conciliación</option>
                <option value="pendiente_conciliar">Pendiente</option>
                <option value="conciliado">Conciliado</option>
                <option value="diferencia_importe">Diferencia importe</option>
                <option value="diferencia_producto">Diferencia producto</option>
                <option value="diferencia_cantidad">Diferencia cantidad</option>
                <option value="revisado_manualmente">Revisado manualmente</option>
              </select>
              <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Filtrar</button>
            </form>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1fr_24rem]">
            <div className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
              <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Documentos contables</h2>
              <div className="mt-5 overflow-x-auto">
                <table className="min-w-[70rem] w-full border-separate border-spacing-y-2 text-left text-sm">
                  <thead className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f2c6bb]">
                    <tr><th className="px-3 py-2">Fecha</th><th className="px-3 py-2">Tipo</th><th className="px-3 py-2">Número</th><th className="px-3 py-2">Proveedor</th><th className="px-3 py-2">Base</th><th className="px-3 py-2">IVA</th><th className="px-3 py-2">Total</th><th className="px-3 py-2">Estado</th></tr>
                  </thead>
                  <tbody>
                    {documents.map((document) => (
                      <tr key={document.id} className="bg-[#fffaf4] text-stone-950">
                        <td className="rounded-l-2xl px-3 py-3">{document.document_date || "-"}</td>
                        <td className="px-3 py-3">{document.document_type || "-"}</td>
                        <td className="px-3 py-3">{document.document_number || "-"}</td>
                        <td className="px-3 py-3 font-black">{document.supplier_name || "-"}</td>
                        <td className="px-3 py-3">{Number(document.taxable_base || 0).toFixed(2)} €</td>
                        <td className="px-3 py-3">{Number(document.vat_amount || 0).toFixed(2)} €</td>
                        <td className="px-3 py-3">{Number(document.total_amount || 0).toFixed(2)} €</td>
                        <td className="rounded-r-2xl px-3 py-3">{document.reconciliation_status || "pendiente_conciliar"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="grid gap-6">
              <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
                <h2 className="text-xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Compras por proveedor</h2>
                <div className="mt-4 grid gap-2">
                  {bySupplier.map(([supplier, total]) => <p key={supplier} className="rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-sm text-stone-200">{supplier} · {total.toFixed(2)} €</p>)}
                </div>
              </section>
              <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
                <h2 className="text-xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Originales OCR</h2>
                <div className="mt-4 grid gap-2">
                  {uploads.slice(0, 8).map((upload) => <p key={upload.id} className="rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-sm text-stone-200">{upload.original_filename} · {upload.storage_status}</p>)}
                </div>
              </section>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
