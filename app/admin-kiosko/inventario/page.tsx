import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getExpiryBuckets, getInventoryLotMovements, getInventoryLots, getInventoryMovements, getInventoryProductById, getInventoryProducts } from "@/lib/admin-kiosko/database";
import { buildZebraLabelZpl } from "@/lib/admin-kiosko/zebra";
import { AdminHeader } from "../_components/AdminHeader";
import { ZebraPrintButton } from "../_components/ZebraPrintButton";
import { saveInventoryMovementAction, saveInventoryProductAction } from "../actions";

export const metadata: Metadata = {
  title: "Inventario APPCC | Panel interno",
  description: "Control interno de stock, lotes y caducidades.",
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function statusForProduct(expiry: string | null, stock: number | null, minimum: number | null, active: boolean) {
  const current = today();
  const soon = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  if (!active) return "baja";
  if (expiry && expiry < current) return "incidencia";
  if ((expiry && expiry <= soon) || Number(stock || 0) <= Number(minimum || 0)) return "revisar";
  return "correcto";
}

function Field({ name, label, value = "", type = "text", required = false }: { name: string; label: string; value?: string | number | null; type?: string; required?: boolean }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-stone-200">
      {label}
      <input required={required} name={name} type={type} defaultValue={value ?? ""} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b]" />
    </label>
  );
}

export default async function InventarioPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; status?: string; stock?: string; expiry?: string; product?: string; saved?: string; error?: string }>;
}) {
  await requireAdminSession();
  const params = await searchParams;
  const [productsResult, movementsResult, selectedResult, expiryResult, lotsResult, lotMovementsResult] = await Promise.all([
    getInventoryProducts({ q: params?.q, status: params?.status, stock: params?.stock, expiry: params?.expiry }),
    getInventoryMovements(params?.product),
    params?.product ? getInventoryProductById(params.product) : Promise.resolve({ ok: true as const, data: null }),
    getExpiryBuckets(),
    getInventoryLots({ q: params?.q, activeOnly: false }),
    getInventoryLotMovements(),
  ]);
  const products = productsResult.ok ? productsResult.data : [];
  const movements = movementsResult.ok ? movementsResult.data : [];
  const selected = selectedResult.ok ? selectedResult.data : null;
  const expiry = expiryResult.ok ? expiryResult.data : { expired: [], seven: [], fifteen: [], thirty: [] };
  const lots = lotsResult.ok ? lotsResult.data : [];
  const lotMovements = lotMovementsResult.ok ? lotMovementsResult.data : [];
  const lotsByProduct = new Map(lots.map((lot) => [lot.product_id, [] as typeof lots]));
  lots.forEach((lot) => {
    if (!lot.product_id) return;
    const rows = lotsByProduct.get(lot.product_id) || [];
    rows.push(lot);
    lotsByProduct.set(lot.product_id, rows);
  });
  const stockLow = products.filter((product) => product.active && Number(product.current_stock || 0) <= Number(product.minimum_stock || 0)).length;
  const withoutMovements = products.filter((product) => product.active && !product.last_entry_date && !product.last_exit_date).length;

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Inventario APPCC" description="Stock operativo, lotes, caducidades y movimientos." />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12">
        <div className="grid gap-6">
          {params?.saved === "1" ? <p className="rounded-2xl border border-emerald-300 bg-emerald-100 px-4 py-3 text-sm font-black text-emerald-950">Inventario actualizado.</p> : null}
          {params?.error ? <p className="rounded-2xl border border-[#d94b2b]/40 bg-[#d94b2b]/12 px-4 py-3 text-sm font-semibold text-[#f2c6bb]">{params.error}</p> : null}

          <section className="grid gap-3 md:grid-cols-4">
            {[
              ["Productos activos", products.filter((product) => product.active).length],
              ["Stock bajo", stockLow],
              ["Caducados", expiry.expired.length],
              ["Sin movimientos", withoutMovements],
            ].map(([label, value]) => (
              <article key={label} className="rounded-[1.4rem] border border-white/10 bg-[#151515] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">{label}</p>
                <p className="mt-2 text-3xl font-black text-white">{String(value)}</p>
              </article>
            ))}
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
            <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Caducidades</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-4">
              {[
                ["Caducados", expiry.expired],
                ["7 días", expiry.seven],
                ["15 días", expiry.fifteen],
                ["30 días", expiry.thirty],
              ].map(([label, rows]) => (
                <article key={label as string} className="rounded-[1.4rem] border border-white/10 bg-white/6 p-4">
                  <p className="text-sm font-black uppercase tracking-[0.14em] text-[#f2c6bb]">{label as string}</p>
                  <div className="mt-3 grid gap-2">
                    {(rows as typeof products).slice(0, 5).map((product) => (
                      <a key={product.id} href={`/admin-kiosko/inventario?product=${product.id}`} className="rounded-xl border border-white/10 bg-[#0d0d0d] px-3 py-2 text-sm text-stone-200">
                        <span className="block font-black text-white">{product.name}</span>
                        <span className="block text-xs text-stone-400">{product.expiry_date} · lote {product.current_batch || "-"}</span>
                      </a>
                    ))}
                    {!(rows as typeof products).length ? <p className="text-sm text-stone-400">Categoría preparada para próximos productos.</p> : null}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
            <form className="grid gap-3 md:grid-cols-[1fr_11rem_11rem_13rem_auto]">
              <input name="q" defaultValue={params?.q || ""} placeholder="Buscar producto, proveedor, lote o ubicación" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b]" />
              <select name="status" defaultValue={params?.status || "activos"} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950">
                <option value="activos">Activos</option>
                <option value="todos">Todos</option>
                <option value="inactivos">Baja</option>
              </select>
              <select name="stock" defaultValue={params?.stock || "todos"} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950">
                <option value="todos">Stock</option>
                <option value="bajo">Stock bajo</option>
                <option value="sin_stock">Sin stock</option>
              </select>
              <select name="expiry" defaultValue={params?.expiry || "todos"} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950">
                <option value="todos">Caducidad</option>
                <option value="proximos">Próximos</option>
                <option value="caducados">Caducados</option>
                <option value="sin_caducidad">Sin fecha</option>
              </select>
              <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white">Filtrar</button>
            </form>
          </section>

          <section className="grid gap-6 lg:grid-cols-[26rem_1fr]">
            <div className="grid gap-6">
              <form action={saveInventoryProductAction} className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
                <input type="hidden" name="id" value={selected?.id || ""} />
                <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">{selected ? "Editar producto" : "Alta manual"}</h2>
                <div className="mt-5 grid gap-4">
                  <Field name="name" label="Producto" value={selected?.name} required />
                  <Field name="category" label="Categoría" value={selected?.category} />
                  <Field name="usual_supplier" label="Último proveedor" value={selected?.usual_supplier} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field name="current_stock" label="Stock actual" value={selected?.current_stock ?? 0} type="number" />
                    <Field name="minimum_stock" label="Stock mínimo" value={selected?.minimum_stock ?? 0} type="number" />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field name="recommended_stock" label="Stock recomendado" value={selected?.recommended_stock ?? 0} type="number" />
                    <Field name="last_purchase_price" label="Precio compra" value={selected?.last_purchase_price ?? 0} type="number" />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field name="unit" label="Unidad" value={selected?.unit || "ud"} />
                    <Field name="location" label="Ubicación" value={selected?.location} />
                  </div>
                  <Field name="current_batch" label="Último lote" value={selected?.current_batch} />
                  <Field name="expiry_date" label="Caducidad" value={selected?.expiry_date} type="date" />
                  <label className="grid gap-2 text-sm font-semibold text-stone-200">
                    Observaciones
                    <textarea name="observations" defaultValue={selected?.observations || ""} rows={3} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b]" />
                  </label>
                  <select name="active" defaultValue={selected?.active === false ? "false" : "true"} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950">
                    <option value="true">Activo</option>
                    <option value="false">Baja lógica</option>
                  </select>
                  <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white">Guardar producto</button>
                </div>
              </form>

              <form action={saveInventoryMovementAction} className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
                <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Movimiento</h2>
                <div className="mt-5 grid gap-4">
                  <label className="grid gap-2 text-sm font-semibold text-stone-200">
                    Producto
                    <select required name="product_id" defaultValue={selected?.id || ""} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950">
                      <option value="">Seleccionar</option>
                      {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                    </select>
                  </label>
                  {selected ? (
                    <label className="grid gap-2 text-sm font-semibold text-stone-200">
                      Lote real
                      <select name="lot_id" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950">
                        <option value="">FEFO automático</option>
                        {(lotsByProduct.get(selected.id) || []).filter((lot) => lot.status !== "agotado").map((lot) => (
                          <option key={lot.id} value={lot.id}>
                            {lot.batch_number || "sin lote"} · {lot.current_quantity ?? 0} {lot.unit || selected.unit || "ud"} · caduca {lot.expiry_date || "sin fecha"}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <select name="movement_type" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950">
                    <option value="entrada">Entrada</option>
                    <option value="consumo">Consumo</option>
                    <option value="merma">Merma</option>
                    <option value="regularizacion">Regularización</option>
                    <option value="baja">Baja lógica</option>
                  </select>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field name="quantity" label="Cantidad" type="number" required />
                    <Field name="unit" label="Unidad" value={selected?.unit || "ud"} />
                  </div>
                  <Field name="supplier" label="Proveedor" value={selected?.usual_supplier} />
                  <Field name="batch_number" label="Lote" value={selected?.current_batch} />
                  <Field name="expiry_date" label="Caducidad" value={selected?.expiry_date} type="date" />
                  <label className="grid gap-2 text-sm font-semibold text-stone-200">
                    Motivo
                    <textarea name="observations" rows={3} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b]" />
                  </label>
                  <button className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white">Registrar movimiento</button>
                </div>
              </form>
            </div>

            <div className="grid gap-6">
              <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
                <div className="flex flex-col gap-3 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f2c6bb]">Inventario</p>
                    <h2 className="mt-2 text-3xl font-black uppercase tracking-[-0.04em] text-[#fff8ef]">Productos</h2>
                  </div>
                  <p className="text-sm text-stone-300">{products.filter((product) => product.active).length} activos · {products.length} visibles</p>
                </div>
                <div className="mt-6 overflow-x-auto">
                  <table className="min-w-[82rem] w-full border-separate border-spacing-y-2 text-left text-sm">
                    <thead className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f2c6bb]">
                      <tr>
                        <th className="px-3 py-2">Producto</th>
                        <th className="px-3 py-2">Stock</th>
                        <th className="px-3 py-2">Mínimo</th>
                        <th className="px-3 py-2">Recomendado</th>
                        <th className="px-3 py-2">Precio medio</th>
                        <th className="px-3 py-2">Último proveedor</th>
                        <th className="px-3 py-2">Último lote</th>
                        <th className="px-3 py-2">Última entrada</th>
                        <th className="px-3 py-2">Última salida</th>
                        <th className="px-3 py-2">Estado</th>
                        <th className="px-3 py-2">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((product) => {
                        const status = statusForProduct(product.expiry_date, product.current_stock, product.minimum_stock, product.active);
                        const zpl = buildZebraLabelZpl({
                          template: "recepcion",
                          product: product.name,
                          batch: product.current_batch || "",
                          supplier: product.usual_supplier || "",
                          sourceBatch: product.current_batch || "",
                          receptionDate: product.last_entry_date || "",
                          expiryDate: product.expiry_date || "",
                          copies: 1,
                        });
                        return (
                          <tr key={product.id} className="bg-[#fffaf4] text-stone-950">
                            <td className="rounded-l-2xl px-3 py-3 font-black">{product.name}<span className="block text-xs font-semibold text-stone-600">{product.category || product.location || ""}</span></td>
                            <td className="px-3 py-3">{product.current_stock ?? 0} {product.unit || "ud"}</td>
                            <td className="px-3 py-3">{product.minimum_stock ?? 0}</td>
                            <td className="px-3 py-3">{product.recommended_stock ?? 0}</td>
                            <td className="px-3 py-3">{product.average_purchase_price ? `${product.average_purchase_price} €` : "-"}</td>
                            <td className="px-3 py-3">{product.usual_supplier || "-"}</td>
                            <td className="px-3 py-3">{product.current_batch || "-"}</td>
                            <td className="px-3 py-3">{product.last_entry_date || "-"}</td>
                            <td className="px-3 py-3">{product.last_exit_date || "-"}</td>
                            <td className="px-3 py-3 font-black">{status}</td>
                            <td className="rounded-r-2xl px-3 py-3">
                              <div className="flex flex-wrap gap-2">
                                <a href={`/admin-kiosko/inventario?product=${product.id}`} className="rounded-full border border-stone-950 px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em]">Editar</a>
                                <a href={`/admin-kiosko/inventario?product=${product.id}#movimientos`} className="rounded-full border border-stone-950 px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em]">Movimientos</a>
                                <a href={`/admin-kiosko/trazabilidad?q=${encodeURIComponent(product.current_batch || product.name)}`} className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white">Trazar</a>
                                <ZebraPrintButton
                                  zpl={zpl}
                                  filename={`${product.current_batch || product.name}.zpl`}
                                  label="Imprimir"
                                  historyPayload={{
                                    model: "Recepción",
                                    template: "recepcion",
                                    product: product.name,
                                    batch: product.current_batch || "",
                                    supplier: product.usual_supplier || "",
                                    expiry_date: product.expiry_date || "",
                                    copies: 1,
                                  }}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
                <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Lotes activos y FEFO</h2>
                <div className="mt-5 grid gap-3">
                  {products.map((product) => {
                    const productLots = (lotsByProduct.get(product.id) || [])
                      .filter((lot) => lot.status !== "agotado")
                      .sort((a, b) => {
                        if (!a.expiry_date && !b.expiry_date) return 0;
                        if (!a.expiry_date) return 1;
                        if (!b.expiry_date) return -1;
                        return a.expiry_date.localeCompare(b.expiry_date);
                      });
                    if (!productLots.length) return null;
                    return (
                      <details key={product.id} className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4">
                        <summary className="cursor-pointer text-sm font-black uppercase tracking-[0.12em] text-white">
                          {product.name} · {productLots.length} lotes · FEFO {productLots[0]?.batch_number || "sin lote"}
                        </summary>
                        <div className="mt-4 grid gap-2">
                          {productLots.map((lot, index) => (
                            <article key={lot.id} className="rounded-xl border border-white/10 bg-[#0d0d0d] p-3 text-sm text-stone-200">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="font-black text-white">{index === 0 ? "FEFO · " : ""}Lote {lot.batch_number || "sin lote"}</p>
                                <a href={`/admin-kiosko/trazabilidad?q=${encodeURIComponent(lot.batch_number || product.name)}`} className="rounded-full border border-[#d94b2b] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#f2c6bb]">Trazar</a>
                              </div>
                              <p className="mt-2">{lot.current_quantity ?? 0} {lot.unit || product.unit || "ud"} · caduca {lot.expiry_date || "sin fecha"} · {lot.location || "ubicación registrada"}</p>
                              <p className="mt-1 text-stone-400">Proveedor {lot.supplier_name || product.usual_supplier || "registrado"} · recibido {lot.received_date || "fecha no consignada"}</p>
                            </article>
                          ))}
                        </div>
                      </details>
                    );
                  })}
                  {!lots.length ? <p className="text-sm text-stone-400">Ejecuta el SQL de lotes para activar el inventario FEFO por lote real.</p> : null}
                </div>
              </section>

              <section id="movimientos" className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
                <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Histórico de movimientos</h2>
                <div className="mt-5 grid gap-3">
                  {lotMovements.slice(0, 80).map((movement) => (
                    <article key={`lot-${movement.id}`} className="rounded-[1.2rem] border border-emerald-300/20 bg-emerald-100/10 p-4 text-sm text-stone-200">
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <p className="font-black text-white">Lote real · {movement.movement_type}</p>
                        <p className="text-xs text-stone-400">{movement.movement_date || ""} {movement.movement_time || ""}</p>
                      </div>
                      <p className="mt-2">{movement.quantity ?? 0} {movement.unit || "ud"} · {movement.reason || "Movimiento por lote"}</p>
                      <p className="mt-1 text-stone-300">{movement.observations || "Movimiento trazable registrado"}</p>
                    </article>
                  ))}
                  {movements.map((movement) => (
                    <article key={movement.id} className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4 text-sm text-stone-200">
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <p className="font-black text-white">{movement.admin_inventory_products?.name || "Producto"} · {movement.movement_type}</p>
                        <p className="text-xs text-stone-400">{new Date(movement.created_at).toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}</p>
                      </div>
                      <p className="mt-2">{movement.quantity ?? 0} {movement.unit || "ud"} · lote {movement.batch_number || "no consignado"} · proveedor {movement.supplier || "no consignado"}</p>
                      <p className="mt-1 text-stone-300">{movement.observations || "Movimiento registrado"}</p>
                    </article>
                  ))}
                  {!movements.length ? <p className="text-sm text-stone-400">Histórico preparado para registrar próximos movimientos.</p> : null}
                </div>
              </section>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
