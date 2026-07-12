import type { Metadata } from "next";
import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { getInventoryLots, getInventoryLotMovements, getProductionTraceabilityRows, getTraceabilityRows } from "@/lib/admin-kiosko/database";
import { buildZebraLabelZpl } from "@/lib/admin-kiosko/zebra";
import { AdminHeader } from "../_components/AdminHeader";
import { ZebraPrintButton } from "../_components/ZebraPrintButton";

export const metadata: Metadata = {
  title: "Trazabilidad APPCC | Panel interno",
  description: "Búsqueda de lotes, proveedores, documentos OCR y caducidades.",
};

export default async function TrazabilidadPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; date?: string }>;
}) {
  await requireAdminPermission("traceability:manage");
  const params = await searchParams;
  const [result, productionResult, lotsResult, lotMovementsResult] = await Promise.all([
    getTraceabilityRows({ q: params?.q, date: params?.date }),
    getProductionTraceabilityRows({ q: params?.q }),
    getInventoryLots({ q: params?.q, activeOnly: false }),
    getInventoryLotMovements(),
  ]);
  const rows = result.ok ? result.data : [];
  const productionRows = productionResult.ok ? productionResult.data : [];
  const lotRows = lotsResult.ok ? lotsResult.data : [];
  const lotMovements = lotMovementsResult.ok ? lotMovementsResult.data : [];

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
            {lotRows.map((lot) => {
              const movements = lotMovements.filter((movement) => movement.lot_id === lot.id);
              return (
                <article key={lot.id} className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f2c6bb]">Lote real de inventario</p>
                      <h2 className="mt-2 text-3xl font-black uppercase tracking-[-0.04em] text-[#fff8ef]">{lot.batch_number || "sin lote"}</h2>
                      <p className="mt-2 text-sm leading-6 text-stone-300">{lot.product_name} · {lot.current_quantity ?? 0} {lot.unit || "ud"} · {lot.status || "activo"}</p>
                    </div>
                    <a href={`/admin-kiosko/inventario?product=${lot.product_id || ""}`} className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Abrir inventario</a>
                  </div>
                  <div className="mt-5 grid gap-3 md:grid-cols-6">
                    {[
                      ["Proveedor", lot.supplier_name || "Proveedor registrado"],
                      ["Producto", lot.product_name || "Producto"],
                      ["Recepción", lot.received_date || "Fecha no consignada"],
                      ["Caducidad", lot.expiry_date || "Sin caducidad consignada"],
                      ["Ubicación", lot.location || "Ubicación registrada"],
                      ["Stock", `${lot.current_quantity ?? 0} ${lot.unit || "ud"}`],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl border border-white/10 bg-[#fffaf4] p-4 text-stone-950">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#d94b2b]">{label}</p>
                        <p className="mt-2 text-sm font-black">{value}</p>
                      </div>
                    ))}
                  </div>
                  <section className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                    <h3 className="text-lg font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Cadena trazable</h3>
                    <div className="mt-3 grid gap-2 text-sm text-stone-200">
                      <p className="rounded-xl border border-white/10 bg-[#0d0d0d] px-3 py-2">Proveedor → {lot.supplier_name || "registrado"}</p>
                      <p className="rounded-xl border border-white/10 bg-[#0d0d0d] px-3 py-2">Documento OCR → {lot.supplier_document_id || lot.uploaded_document_id || "pendiente de vínculo"}</p>
                      <p className="rounded-xl border border-white/10 bg-[#0d0d0d] px-3 py-2">Recepción → {lot.received_date || "fecha registrada en documento"}</p>
                      <p className="rounded-xl border border-white/10 bg-[#0d0d0d] px-3 py-2">Lote inventario → {lot.batch_number || "sin lote"}</p>
                      {movements.map((movement) => (
                        <p key={movement.id} className="rounded-xl border border-white/10 bg-[#0d0d0d] px-3 py-2">
                          {movement.movement_date} · {movement.movement_type} · {movement.quantity ?? 0} {movement.unit || lot.unit || "ud"} · {movement.reason || "movimiento"}
                        </p>
                      ))}
                    </div>
                  </section>
                </article>
              );
            })}

            {productionRows.map((batch) => {
              const movements = batch.movements || [];
              const byType = (type: string) => movements.filter((movement) => movement.movement_type === type);
              const zpl = buildZebraLabelZpl({
                template: "trazabilidad",
                product: batch.output_product || "",
                batch: batch.batch_code || "",
                supplier: batch.source_supplier || "",
                sourceBatch: batch.source_batch_number || "",
                productionDate: batch.production_date,
                expiryDate: batch.expiry_date || "",
                responsible: batch.responsible || "F. Javier Bocanegra Sanjuan",
              });
              return (
                <article key={batch.id} className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f2c6bb]">Lote interno de producción</p>
                      <h2 className="mt-2 text-3xl font-black uppercase tracking-[-0.04em] text-[#fff8ef]">{batch.batch_code}</h2>
                      <p className="mt-2 text-sm leading-6 text-stone-300">{batch.output_product} · {batch.output_quantity ?? 0} {batch.output_unit || "ud"} · {batch.storage_state || "refrigerado"}</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <a href={`/admin-kiosko/produccion?batch=${batch.id}`} className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Abrir producción</a>
                      <ZebraPrintButton
                        zpl={zpl}
                        filename={`${batch.batch_code || "trazabilidad"}.zpl`}
                        historyPayload={{
                          model: "Lote",
                          template: "trazabilidad",
                          product: batch.output_product || "",
                          batch: batch.batch_code || "",
                          supplier: batch.source_supplier || "",
                          production_date: batch.production_date,
                          expiry_date: batch.expiry_date || "",
                          responsible: batch.responsible || "F. Javier Bocanegra Sanjuan",
                          copies: 1,
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-5">
                    {[
                      ["Proveedor origen", batch.source_supplier || "Proveedor no consignado"],
                      ["Producto origen", batch.source_product || "Materia prima no consignada"],
                      ["Lote proveedor", batch.source_batch_number || "Lote no consignado"],
                      ["Fecha producción", batch.production_date],
                      ["Caducidad", batch.expiry_date || "Vida útil no consignada"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl border border-white/10 bg-[#fffaf4] p-4 text-stone-950">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#d94b2b]">{label}</p>
                        <p className="mt-2 text-sm font-black">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-3">
                    {[
                      ["Congelaciones", byType("congelacion")],
                      ["Descongelaciones", byType("descongelacion")],
                      ["Consumos", byType("consumo")],
                      ["Mermas", byType("merma")],
                      ["Salidas personales", movements.filter((movement) => ["personal", "invitacion", "degustacion"].includes(movement.movement_type || ""))],
                      ["Regularizaciones", byType("regularizacion")],
                    ].map(([title, items]) => (
                      <section key={title as string} className="rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                        <h3 className="text-lg font-black uppercase tracking-[-0.03em] text-[#fff8ef]">{title as string}</h3>
                        <div className="mt-3 grid gap-2">
                          {(items as typeof movements).map((movement) => (
                            <p key={movement.id} className="rounded-xl border border-white/10 bg-[#0d0d0d] px-3 py-2 text-sm text-stone-200">
                              {movement.movement_date} · {movement.quantity ?? 0} {movement.unit || batch.output_unit || "ud"} · {movement.responsible || "Responsable no consignado"}
                            </p>
                          ))}
                          {!(items as typeof movements).length ? <p className="text-sm text-stone-300">Movimiento preparado para registrar cuando proceda.</p> : null}
                        </div>
                      </section>
                    ))}
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <section className="rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                      <h3 className="text-lg font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Etiquetas asociadas</h3>
                      <div className="mt-3 grid gap-2">
                        {batch.labels?.map((label) => (
                          <a key={label.id} href={`/admin-kiosko/etiquetas?id=${label.id}`} className="rounded-xl border border-white/10 bg-[#0d0d0d] px-3 py-2 text-sm text-stone-200">
                            {label.created_at.slice(0, 10)} · {label.model} · {label.product || batch.output_product}
                          </a>
                        ))}
                        {!batch.labels?.length ? <p className="text-sm text-stone-300">Etiquetas listas para generar desde el lote interno.</p> : null}
                      </div>
                    </section>

                    <section className="rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                      <h3 className="text-lg font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Cronología completa</h3>
                      <div className="mt-3 grid gap-2">
                        <p className="rounded-xl border border-white/10 bg-[#0d0d0d] px-3 py-2 text-sm text-stone-200">{batch.production_date} · producción · {batch.output_product}</p>
                        {movements.map((movement) => (
                          <p key={movement.id} className="rounded-xl border border-white/10 bg-[#0d0d0d] px-3 py-2 text-sm text-stone-200">
                            {movement.movement_date} · {movement.movement_type} · {movement.quantity ?? 0} {movement.unit || batch.output_unit || "ud"}
                          </p>
                        ))}
                      </div>
                    </section>
                  </div>
                </article>
              );
            })}

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
            {!rows.length && !productionRows.length && !lotRows.length ? <p className="rounded-[1.5rem] border border-white/10 bg-[#151515] p-5 text-sm text-stone-300">Trazabilidad preparada para el filtro indicado. Registra recepciones, producciones o lotes para completar la ficha.</p> : null}
          </section>
        </div>
      </section>
    </main>
  );
}
