import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getInternalRecipes, getProductionBatches } from "@/lib/admin-kiosko/database";
import { buildZebraLabelZpl } from "@/lib/admin-kiosko/zebra";
import { AdminHeader } from "../_components/AdminHeader";
import { ZebraPrintButton } from "../_components/ZebraPrintButton";
import { saveInternalRecipeAction, saveProductionBatchAction, saveProductionMovementAction } from "../actions";

export const metadata: Metadata = {
  title: "Producción interna | Panel interno",
  description: "Transformación de materias primas, elaboraciones, congelación, descongelación, mermas y salidas internas.",
};

const movementActions = [
  { type: "congelacion", label: "Congelar", toState: "congelado", reason: "Congelación de lote interno" },
  { type: "descongelacion", label: "Descongelar", toState: "descongelado", reason: "Descongelación para servicio" },
  { type: "consumo", label: "Consumir", toState: "consumido", reason: "Consumo o venta" },
  { type: "merma", label: "Merma", toState: "mermado", reason: "Merma de producción" },
  { type: "personal", label: "Personal", toState: "personal", reason: "Consumo personal" },
  { type: "invitacion", label: "Invitación", toState: "consumido", reason: "Invitación" },
  { type: "degustacion", label: "Degustación", toState: "consumido", reason: "Degustación" },
  { type: "regularizacion", label: "Regularizar", toState: "", reason: "Regularización de stock interno" },
];

function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function Field({ name, label, value = "", type = "text", required = false }: { name: string; label: string; value?: string | number | null; type?: string; required?: boolean }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-stone-200">
      {label}
      <input name={name} type={type} defaultValue={value ?? ""} required={required} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b]" />
    </label>
  );
}

function SelectField({ name, label, value, options }: { name: string; label: string; value?: string | null; options: string[] }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-stone-200">
      {label}
      <select name={name} defaultValue={value || options[0]} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b]">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function TextArea({ name, label, value = "" }: { name: string; label: string; value?: string | null }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-stone-200">
      {label}
      <textarea name={name} defaultValue={value || ""} rows={4} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b]" />
    </label>
  );
}

function stateClass(state?: string | null) {
  if (state === "congelado") return "border-sky-300 bg-sky-100 text-sky-950";
  if (state === "descongelado") return "border-amber-300 bg-amber-100 text-amber-950";
  if (["consumido", "mermado", "personal"].includes(state || "")) return "border-stone-300 bg-stone-100 text-stone-800";
  return "border-emerald-300 bg-emerald-100 text-emerald-950";
}

export default async function ProduccionPage({
  searchParams,
}: {
  searchParams?: Promise<{ saved?: string; error?: string; warning?: string; batch?: string }>;
}) {
  await requireAdminSession();
  const params = await searchParams;
  const [batchesResult, recipesResult] = await Promise.all([
    getProductionBatches(80),
    getInternalRecipes(),
  ]);
  const batches = batchesResult.ok ? batchesResult.data : [];
  const recipes = recipesResult.ok ? recipesResult.data : [];
  const todayValue = today();

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader
        title="Producción interna"
        description="Transformación de materias primas, elaboraciones, congelación, descongelación, mermas y salidas internas."
      />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12">
        <div className="grid gap-6">
          {params?.saved === "1" ? <p className="rounded-2xl border border-emerald-300 bg-emerald-100 px-4 py-3 text-sm font-black text-emerald-950">Producción interna registrada.</p> : null}
          {params?.warning ? <p className="rounded-2xl border border-amber-300 bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-950">{params.warning}</p> : null}
          {params?.error ? <p className="rounded-2xl border border-[#d94b2b]/40 bg-[#d94b2b]/12 px-4 py-3 text-sm font-semibold text-[#f2c6bb]">{params.error}</p> : null}

          <section className="grid gap-6 xl:grid-cols-[1fr_24rem]">
            <form action={saveProductionBatchAction} className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
              <div className="flex flex-col gap-3 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f2c6bb]">Nuevo lote interno</p>
                  <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Registrar elaboración</h2>
                </div>
                <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Registrar producción</button>
              </div>

              <div className="mt-5 grid gap-6 lg:grid-cols-2">
                <section className="rounded-[1.4rem] border border-white/10 bg-white/6 p-4">
                  <h3 className="text-lg font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Materia prima</h3>
                  <div className="mt-4 grid gap-4">
                    <Field name="source_supplier" label="Proveedor origen" />
                    <Field name="source_product" label="Producto origen" required />
                    <Field name="source_batch_number" label="Lote proveedor" />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field name="input_quantity" label="Cantidad usada" type="number" />
                      <Field name="input_unit" label="Unidad" value="kg" />
                    </div>
                    <Field name="source_document_id" label="Documento origen si existe" />
                  </div>
                </section>

                <section className="rounded-[1.4rem] border border-white/10 bg-white/6 p-4">
                  <h3 className="text-lg font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Elaboración resultante</h3>
                  <div className="mt-4 grid gap-4">
                    <Field name="output_product" label="Producto elaborado" required />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field name="output_quantity" label="Cantidad producida" type="number" />
                      <Field name="output_unit" label="Unidad" value="ud" />
                    </div>
                    <Field name="unit_weight" label="Peso unitario" type="number" />
                    <SelectField name="storage_state" label="Estado de conservación" value="refrigerado" options={["refrigerado", "congelado", "descongelado", "consumido", "mermado", "personal"]} />
                  </div>
                </section>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <Field name="production_date" label="Fecha producción" type="date" value={todayValue} required />
                <Field name="production_time" label="Hora producción" type="time" />
                <Field name="responsible" label="Responsable" value="F. Javier Bocanegra Sanjuan" />
                <Field name="expiry_date" label="Caducidad / consumir antes de" type="date" />
                <div className="md:col-span-2"><TextArea name="observations" label="Observaciones" /></div>
              </div>
            </form>

            <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
              <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Recetas base</h2>
              <form action={saveInternalRecipeAction} className="mt-5 grid gap-4">
                <Field name="recipe_name" label="Nombre receta" value="Bolas smash" required />
                <Field name="input_product" label="Materia prima" value="Carne fresca burgers" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field name="input_quantity" label="Cantidad input" type="number" value={1} />
                  <Field name="input_unit" label="Unidad input" value="kg" />
                </div>
                <Field name="output_product" label="Elaboración resultante" value="Bolas smash" required />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field name="expected_yield" label="Rendimiento" type="number" />
                  <Field name="output_unit" label="Unidad salida" value="ud" />
                </div>
                <Field name="unit_weight" label="Peso unitario" type="number" value={100} />
                <TextArea name="instructions" label="Instrucciones" />
                <button className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white">Guardar receta</button>
              </form>

              <div className="mt-5 grid gap-3">
                {recipes.slice(0, 6).map((recipe) => (
                  <article key={recipe.id} className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4 text-sm text-stone-200">
                    <p className="font-black text-white">{recipe.recipe_name}</p>
                    <p className="mt-1">{recipe.inputs?.map((input) => `${input.input_product} ${input.quantity || ""} ${input.unit || ""}`.trim()).join(", ") || "Materia prima por definir"} → {recipe.output_product}</p>
                    <p className="mt-1 text-xs text-stone-400">Rendimiento: {recipe.expected_yield || "por definir"} {recipe.output_unit || "ud"} · peso {recipe.unit_weight || "por definir"} g</p>
                  </article>
                ))}
                {!recipes.length ? <p className="text-sm text-stone-400">Recetario preparado para elaboraciones internas.</p> : null}
              </div>
            </section>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f2c6bb]">Trazabilidad</p>
                <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Lotes internos</h2>
              </div>
              <Link href="/admin-kiosko/trazabilidad" className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Abrir trazabilidad</Link>
            </div>

            <div className="mt-5 grid gap-4">
              {batches.map((batch) => {
                const lastFreeze = batch.movements?.find((movement) => movement.movement_type === "congelacion");
                const lastDefrost = batch.movements?.find((movement) => movement.movement_type === "descongelacion");
                const labelParams = new URLSearchParams({
                  model: batch.storage_state === "descongelado" ? "Descongelación" : batch.storage_state === "congelado" ? "Congelación" : "Elaboración",
                  product: batch.output_product || "",
                  batch: batch.batch_code || "",
                  elaboration_date: batch.production_date,
                  freezing_date: lastFreeze?.movement_date || "",
                  defrosting_date: lastDefrost?.movement_date || "",
                  best_before_date: batch.expiry_date || "",
                  responsible: batch.responsible || "F. Javier Bocanegra Sanjuan",
                  supplier: batch.source_supplier || "",
                  source_batch_number: batch.source_batch_number || "",
                  copies: "8",
                });
                const zebraTemplate = batch.storage_state === "descongelado" ? "descongelacion" : batch.storage_state === "congelado" ? "congelacion" : "elaboracion";
                const zpl = buildZebraLabelZpl({
                  template: zebraTemplate,
                  product: batch.output_product || "",
                  batch: batch.batch_code || "",
                  supplier: batch.source_supplier || "",
                  sourceBatch: batch.source_batch_number || "",
                  productionDate: batch.production_date,
                  freezingDate: lastFreeze?.movement_date || "",
                  defrostingDate: lastDefrost?.movement_date || "",
                  expiryDate: batch.expiry_date || "",
                  responsible: batch.responsible || "F. Javier Bocanegra Sanjuan",
                  copies: 1,
                });

                return (
                  <article key={batch.id} className="rounded-[1.6rem] border border-white/10 bg-[#fffaf4] p-5 text-stone-950">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#d94b2b]">Lote interno</p>
                        <h3 className="mt-2 text-2xl font-black uppercase tracking-[-0.03em]">{batch.batch_code}</h3>
                        <p className="mt-2 text-sm font-semibold text-stone-700">{batch.source_supplier || "Proveedor no consignado"} · {batch.source_product || "Materia prima"} · lote {batch.source_batch_number || "no consignado"}</p>
                      </div>
                      <span className={`w-fit rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${stateClass(batch.storage_state)}`}>{batch.storage_state || "refrigerado"}</span>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-5">
                      {[
                        ["Elaboración", batch.output_product || "Producto elaborado"],
                        ["Fecha", batch.production_date],
                        ["Cantidad restante", `${batch.output_quantity ?? 0} ${batch.output_unit || "ud"}`],
                        ["Caducidad", batch.expiry_date || "Vida útil no consignada"],
                        ["Responsable", batch.responsible || "Responsable no consignado"],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-2xl border border-stone-950/10 bg-white p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#d94b2b]">{label}</p>
                          <p className="mt-2 text-sm font-black">{value}</p>
                        </div>
                      ))}
                    </div>

                    {batch.storage_state === "descongelado" ? (
                      <p className="mt-4 rounded-2xl border border-amber-300 bg-amber-100 px-4 py-3 text-sm font-black text-amber-950">
                        Producto descongelado: controlar vida útil según APPCC interno.
                      </p>
                    ) : null}

                    <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_22rem]">
                      <section className="rounded-[1.3rem] border border-stone-950/10 bg-white p-4">
                        <h4 className="text-sm font-black uppercase tracking-[0.14em] text-stone-950">Movimientos del lote</h4>
                        <div className="mt-3 grid gap-2">
                          {batch.movements?.slice(0, 8).map((movement) => (
                            <p key={movement.id} className="rounded-xl border border-stone-950/10 bg-stone-50 px-3 py-2 text-sm text-stone-700">
                              {movement.movement_date} · {movement.movement_type} · {movement.quantity ?? 0} {movement.unit || batch.output_unit || "ud"} · {movement.to_state || batch.storage_state || "refrigerado"}
                            </p>
                          ))}
                          {!batch.movements?.length ? <p className="text-sm text-stone-600">Cronología preparada para movimientos internos.</p> : null}
                        </div>
                      </section>

                      <section className="rounded-[1.3rem] border border-stone-950/10 bg-white p-4">
                        <h4 className="text-sm font-black uppercase tracking-[0.14em] text-stone-950">Acciones rápidas</h4>
                        <div className="mt-3 grid gap-3">
                          {movementActions.map((action) => (
                            <form key={action.type} action={saveProductionMovementAction} className="grid gap-2 rounded-xl border border-stone-950/10 bg-stone-50 p-3">
                              <input type="hidden" name="batch_id" value={batch.id} />
                              <input type="hidden" name="movement_type" value={action.type} />
                              <input type="hidden" name="from_state" value={batch.storage_state || "refrigerado"} />
                              <input type="hidden" name="to_state" value={action.toState || batch.storage_state || "refrigerado"} />
                              <input type="hidden" name="reason" value={action.reason} />
                              <input type="hidden" name="unit" value={batch.output_unit || "ud"} />
                              <input type="hidden" name="movement_date" value={todayValue} />
                              <input type="hidden" name="responsible" value={batch.responsible || "F. Javier Bocanegra Sanjuan"} />
                              <div className="grid grid-cols-[1fr_auto] gap-2">
                                <input name="quantity" inputMode="decimal" defaultValue={action.type === "regularizacion" ? batch.output_quantity || 0 : ""} aria-label={`Cantidad ${action.label}`} className="rounded-xl border border-stone-950/10 bg-white px-3 py-2 text-sm text-stone-950" />
                                <button className="rounded-full border border-stone-950 bg-stone-950 px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white">{action.label}</button>
                              </div>
                              {action.type === "descongelacion" ? <input name="expiry_date" type="date" aria-label="Consumir antes de" className="rounded-xl border border-stone-950/10 bg-white px-3 py-2 text-sm text-stone-950" /> : null}
                              <input name="observations" aria-label={`Observaciones ${action.label}`} className="rounded-xl border border-stone-950/10 bg-white px-3 py-2 text-sm text-stone-950" />
                            </form>
                          ))}
                          <Link href={`/admin-kiosko/etiquetas?${labelParams.toString()}`} className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-center text-xs font-black uppercase tracking-[0.14em] text-white">Generar etiqueta</Link>
                          <ZebraPrintButton
                            zpl={zpl}
                            filename={`${batch.batch_code || "lote-interno"}.zpl`}
                            label={batch.storage_state === "congelado" ? "Imprimir etiqueta congelación" : batch.storage_state === "descongelado" ? "Imprimir etiqueta descongelación" : "Imprimir etiqueta"}
                            historyPayload={{
                              model: batch.storage_state === "congelado" ? "Congelación" : batch.storage_state === "descongelado" ? "Descongelación" : "Elaboración",
                              template: zebraTemplate,
                              product: batch.output_product || "",
                              batch: batch.batch_code || "",
                              supplier: batch.source_supplier || "",
                              production_date: batch.production_date,
                              freezing_date: lastFreeze?.movement_date || "",
                              defrosting_date: lastDefrost?.movement_date || "",
                              expiry_date: batch.expiry_date || "",
                              responsible: batch.responsible || "F. Javier Bocanegra Sanjuan",
                              copies: 1,
                            }}
                          />
                        </div>
                      </section>
                    </div>
                  </article>
                );
              })}
              {!batches.length ? <p className="rounded-[1.5rem] border border-white/10 bg-white/6 p-5 text-sm text-stone-300">Producción interna preparada para el primer lote elaborado.</p> : null}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
