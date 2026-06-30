import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getTraceabilityRows } from "@/lib/admin-kiosko/database";
import { AdminHeader } from "../_components/AdminHeader";

export const metadata: Metadata = {
  title: "Trazabilidad APPCC | Panel interno",
  description: "Búsqueda de lotes, proveedores, documentos OCR y caducidades.",
};

export default async function TrazabilidadPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; date?: string }>;
}) {
  await requireAdminSession();
  const params = await searchParams;
  const result = await getTraceabilityRows({ q: params?.q, date: params?.date });
  const rows = result.ok ? result.data : [];

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Trazabilidad APPCC" description="Proveedor, recepción, productos, lotes, inventario, incidencias y cronología." />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12">
        <div className="grid gap-6">
          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
            <form className="grid gap-3 md:grid-cols-[1fr_12rem_auto]">
              <input name="q" defaultValue={params?.q || ""} placeholder="Buscar lote, proveedor, documento o producto" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b]" />
              <input name="date" defaultValue={params?.date || ""} type="date" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b]" />
              <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white">Buscar</button>
            </form>
          </section>

          <section className="grid gap-4">
            {rows.map((row) => (
              <article key={row.id} className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
                <div className="grid gap-3 md:grid-cols-5">
                  {[
                    ["Proveedor", row.admin_supplier_documents?.supplier_name || "-"],
                    ["Documento", [row.admin_supplier_documents?.document_type, row.admin_supplier_documents?.document_number].filter(Boolean).join(" · ") || row.admin_supplier_documents?.original_filename || "-"],
                    ["Producto", row.product_name || "-"],
                    ["Lote", row.batch_number || "-"],
                    ["Caducidad", row.expiry_date || "-"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-white/10 bg-[#fffaf4] p-4 text-stone-950">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#d94b2b]">{label}</p>
                      <p className="mt-2 text-sm font-black">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  <section className="rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                    <h2 className="text-lg font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Inventario</h2>
                    {row.inventory_product ? (
                      <div className="mt-3 grid gap-2 text-sm text-stone-200">
                        <p><strong>Stock:</strong> {row.inventory_product.current_stock ?? 0} {row.inventory_product.unit || "ud"}</p>
                        <p><strong>Mínimo:</strong> {row.inventory_product.minimum_stock ?? 0}</p>
                        <p><strong>Ubicación:</strong> {row.inventory_product.location || "-"}</p>
                        <p><strong>Última entrada:</strong> {row.inventory_product.last_entry_date || "-"}</p>
                        <p><strong>Última salida:</strong> {row.inventory_product.last_exit_date || "-"}</p>
                        <a href={`/admin-kiosko/inventario?product=${row.inventory_product.id}`} className="mt-2 inline-flex w-fit rounded-full border border-[#d94b2b] bg-[#d94b2b] px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white">Abrir inventario</a>
                      </div>
                    ) : <p className="mt-3 text-sm text-stone-300">Producto pendiente de vincular al inventario operativo.</p>}
                  </section>

                  <section className="rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                    <h2 className="text-lg font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Recepciones</h2>
                    <div className="mt-3 grid gap-2">
                      {row.goods_receptions?.map((record) => (
                        <p key={record.id} className="rounded-xl border border-white/10 bg-[#0d0d0d] px-3 py-2 text-sm text-stone-200">{record.record_date} · {record.main}</p>
                      ))}
                      {!row.goods_receptions?.length ? <p className="text-sm text-stone-300">Recepción pendiente de vincular a este lote.</p> : null}
                    </div>
                  </section>

                  <section className="rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                    <h2 className="text-lg font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Incidencias</h2>
                    <div className="mt-3 grid gap-2">
                      {row.incidents?.map((record) => (
                        <p key={record.id} className="rounded-xl border border-white/10 bg-[#0d0d0d] px-3 py-2 text-sm text-stone-200">{record.record_date} · {record.main} · {record.status || "Registro disponible"}</p>
                      ))}
                      {!row.incidents?.length ? <p className="text-sm text-stone-300">No constan incidencias vinculadas al lote.</p> : null}
                    </div>
                  </section>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <section className="rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                    <h2 className="text-lg font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Etiquetas impresas</h2>
                    <div className="mt-3 grid gap-2">
                      {row.labels?.map((label) => (
                        <a key={label.id} href={`/admin-kiosko/etiquetas?id=${label.id}`} className="rounded-xl border border-white/10 bg-[#0d0d0d] px-3 py-2 text-sm text-stone-200">
                          {label.created_at.slice(0, 10)} · {label.model} · {label.product || "Producto no consignado"}
                        </a>
                      ))}
                      {!row.labels?.length ? <p className="text-sm text-stone-300">Etiquetas preparadas para registrar cuando proceda.</p> : null}
                    </div>
                  </section>

                  <section className="rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                    <h2 className="text-lg font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Temperaturas de almacenamiento</h2>
                    <div className="mt-3 grid gap-2">
                      {row.temperatures?.slice(0, 8).map((temperature) => (
                        <p key={temperature.id} className="rounded-xl border border-white/10 bg-[#0d0d0d] px-3 py-2 text-sm text-stone-200">
                          {temperature.record_date} · {temperature.equipment} · {temperature.temperature ?? "lectura pendiente"} ºC · {temperature.status || "Registro disponible"}
                        </p>
                      ))}
                      {!row.temperatures?.length ? <p className="text-sm text-stone-300">Temperaturas pendientes de vincular al lote.</p> : null}
                    </div>
                  </section>
                </div>

                <section className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                  <h2 className="text-lg font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Cronología del lote</h2>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <p className="rounded-xl border border-white/10 bg-[#0d0d0d] px-3 py-2 text-sm text-stone-200">
                      {row.created_at.slice(0, 10)} · OCR registrado · {row.admin_supplier_documents?.original_filename || "Documento"}
                    </p>
                    {row.inventory_movements?.map((movement) => (
                      <p key={movement.id} className="rounded-xl border border-white/10 bg-[#0d0d0d] px-3 py-2 text-sm text-stone-200">
                        {movement.created_at.slice(0, 10)} · {movement.movement_type} · {movement.quantity ?? 0} {movement.unit || "ud"}
                      </p>
                    ))}
                  </div>
                </section>
              </article>
            ))}
            {!rows.length ? <p className="rounded-[1.5rem] border border-white/10 bg-[#151515] p-5 text-sm text-stone-300">Trazabilidad preparada para el filtro indicado. Registra recepciones o lotes para completar la ficha.</p> : null}
          </section>
        </div>
      </section>
    </main>
  );
}
