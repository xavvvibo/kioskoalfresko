import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getInternalRecipes, getProductionBatches, getProductionMaterialOptions, getProductionMetrics, getInventoryProducts, previewProductionBatch, type InternalRecipe, type ProductionMaterialOption, type InventoryProduct } from "@/lib/admin-kiosko/database";
import type { ProductionPreview } from "@/lib/admin-kiosko/production/contracts";
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

function optionalPositiveNumber(value?: string) {
  const number = Number(String(value || "").replace(",", "."));
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function formatNumber(value: number | null | undefined, digits = 2) {
  return Number(value || 0).toLocaleString("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

function formatMoney(value: number | null | undefined) {
  return `${formatNumber(value, 2)} €`;
}

function Field({ name, label, value = "", type = "text", required = false, step }: { name: string; label: string; value?: string | number | null; type?: string; required?: boolean; step?: string }) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-semibold text-stone-200">
      {label}
      <input name={name} type={type} step={step} defaultValue={value ?? ""} required={required} className="w-full min-w-0 rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b]" />
    </label>
  );
}

function SelectField({ name, label, value, options }: { name: string; label: string; value?: string | null; options: string[] }) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-semibold text-stone-200">
      {label}
      <select name={name} defaultValue={value || options[0]} className="w-full min-w-0 rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b]">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function TextArea({ name, label, value = "" }: { name: string; label: string; value?: string | null }) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-semibold text-stone-200">
      {label}
      <textarea name={name} defaultValue={value || ""} rows={4} className="w-full min-w-0 rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b]" />
    </label>
  );
}

function MaterialSelector({ materials }: { materials: ProductionMaterialOption[] }) {
  return (
    <div className="grid min-w-0 gap-3">
      <label className="grid min-w-0 gap-2 text-sm font-semibold text-stone-200">
        Materia prima disponible
        <select name="source_material" required className="w-full min-w-0 rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b]">
          {materials.map((item) => (
            <option
              key={item.key}
              value={JSON.stringify({
                lot_id: item.lot_id,
                product_id: item.product_id,
                product: item.product,
                supplier: item.supplier,
                batch: item.batch,
                unit: item.unit,
                expiry_date: item.expiry_date,
                source_document_id: item.source_document_id,
              })}
            >
              {item.fefo ? "FEFO · " : ""}{item.product} · {item.supplier || "Proveedor registrado"} · lote {item.batch || "stock"} · {item.stock ?? 0} {item.unit || "ud"} · caduca {item.expiry_date || "sin fecha"} · {item.location || "ubicación registrada"}
            </option>
          ))}
        </select>
      </label>
      <p className="rounded-2xl border border-emerald-300 bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-950">
        El listado se ordena por caducidad para sugerir FEFO automáticamente.
      </p>
    </div>
  );
}

function RecipeSummary({ recipe }: { recipe: InternalRecipe | undefined }) {
  if (!recipe) {
    return <p className="rounded-2xl border border-amber-300 bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-950">Registra una receta base antes de producir.</p>;
  }

  return (
    <div className="grid min-w-0 gap-3 rounded-[1.3rem] border border-white/10 bg-white/6 p-4 text-sm text-stone-200">
      <p className="break-words font-black text-white">{recipe.recipe_name} · {recipe.output_product}</p>
      <p className="break-words">Resultado previsto: {recipe.expected_yield || 0} {recipe.output_unit || "ud"} · peso unitario {recipe.unit_weight || 0} g · merma {recipe.expected_waste || 0} g.</p>
      <p className="break-words">Vida útil: {recipe.shelf_life_refrigerated_hours || 0} h refrigerado · {recipe.shelf_life_frozen_days || 0} días congelado · conservación {recipe.conservation_type || "refrigerado"}.</p>
    </div>
  );
}

function InventoryProductSelect({ inventory, defaultName }: { inventory: InventoryProduct[]; defaultName?: string | null }) {
  const selected = inventory.find((product) => product.name === defaultName) || inventory[0];

  return (
    <label className="grid min-w-0 gap-2 text-sm font-semibold text-stone-200">
      Ingrediente desde inventario
      <select
        name="recipe_input_product"
        defaultValue={selected ? JSON.stringify({ id: selected.id, name: selected.name, unit: selected.unit }) : ""}
        className="w-full min-w-0 rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b]"
      >
        {inventory.map((product) => (
          <option key={product.id} value={JSON.stringify({ id: product.id, name: product.name, unit: product.unit })}>
            {product.name} · {product.current_stock ?? 0} {product.unit || "ud"} · lote {product.current_batch || "stock"}
          </option>
        ))}
      </select>
    </label>
  );
}

function stateClass(state?: string | null) {
  if (state === "congelado") return "border-sky-300 bg-sky-100 text-sky-950";
  if (state === "descongelado") return "border-amber-300 bg-amber-100 text-amber-950";
  if (["consumido", "mermado", "personal"].includes(state || "")) return "border-stone-300 bg-stone-100 text-stone-800";
  return "border-emerald-300 bg-emerald-100 text-emerald-950";
}

function ProductionCalculatorResult({ preview }: { preview: ProductionPreview | null }) {
  if (!preview) {
    return (
      <div className="rounded-[1.4rem] border border-white/10 bg-white/6 p-5 text-sm text-stone-300">
        Selecciona una receta y una cantidad objetivo para preparar la producción antes de registrar un lote interno.
      </div>
    );
  }

  const scaling = preview.scaling;
  const costPerServing = scaling.targetServings ? scaling.cost.ingredientsCost / scaling.targetServings : null;

  return (
    <div className="grid gap-5">
      <section className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Producto", scaling.outputProduct],
          ["Factor", `x${formatNumber(scaling.factor, 3)}`],
          ["Rendimiento", `${formatNumber(scaling.expectedYieldQuantity, 3)} ${scaling.expectedYieldUnit}`],
          ["Coste", formatMoney(scaling.cost.ingredientsCost)],
        ].map(([label, value]) => (
          <article key={label} className="min-w-0 rounded-[1.2rem] border border-white/10 bg-[#0d0d0d] p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f2c6bb]">{label}</p>
            <p className="mt-2 break-words text-lg font-black text-white">{value}</p>
          </article>
        ))}
      </section>

      <section className="grid min-w-0 gap-3 md:grid-cols-3">
        <article className="min-w-0 rounded-[1.2rem] border border-white/10 bg-white/6 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f2c6bb]">Coste por ración</p>
          <p className="mt-2 break-words text-lg font-black text-white">{costPerServing ? formatMoney(costPerServing) : "Calculable al usar raciones"}</p>
        </article>
        <article className="min-w-0 rounded-[1.2rem] border border-white/10 bg-white/6 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f2c6bb]">Merma prevista</p>
          <p className="mt-2 break-words text-lg font-black text-white">{formatNumber(scaling.expectedWasteQuantity, 3)} {scaling.expectedWasteUnit}</p>
        </article>
        <article className="min-w-0 rounded-[1.2rem] border border-white/10 bg-white/6 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f2c6bb]">Caducidad</p>
          <p className="mt-2 break-words text-lg font-black text-white">{scaling.expiryDate || "Vida útil por definir"}</p>
        </article>
      </section>

      {preview.warnings.length ? (
        <div className="grid gap-2 rounded-[1.2rem] border border-amber-300 bg-amber-100 p-4 text-sm font-semibold text-amber-950">
          {preview.warnings.map((warning) => <p key={warning}>{warning}</p>)}
        </div>
      ) : (
        <p className="rounded-[1.2rem] border border-emerald-300 bg-emerald-100 p-4 text-sm font-black text-emerald-950">
          Stock conocido suficiente para esta vista previa. No se ha consumido inventario.
        </p>
      )}

      <section className="grid gap-3">
        <h3 className="text-lg font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Ingredientes escalados</h3>
        <div className="grid min-w-0 gap-3 xl:grid-cols-2">
          {scaling.scaledIngredients.map((ingredient) => (
            <article key={ingredient.id || ingredient.name} className={`min-w-0 rounded-[1.2rem] border p-4 text-sm ${ingredient.limiting ? "border-amber-300 bg-amber-100 text-amber-950" : "border-white/10 bg-white/6 text-stone-200"}`}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className={`break-words font-black ${ingredient.limiting ? "text-amber-950" : "text-white"}`}>{ingredient.name}</p>
                  <p className="mt-1">
                    Necesario: {formatNumber(ingredient.totalRequiredQuantity, 3)} {ingredient.unit}
                    {ingredient.scaledWasteQuantity ? ` · merma ${formatNumber(ingredient.scaledWasteQuantity, 3)} ${ingredient.unit}` : ""}
                  </p>
                </div>
                <span className={`w-fit rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${ingredient.limiting ? "border-amber-500 text-amber-950" : "border-emerald-300 text-emerald-200"}`}>
                  {ingredient.limiting ? "Falta stock" : "FEFO ok"}
                </span>
              </div>
              <div className="mt-3 grid gap-2">
                <p>Disponible FEFO: {formatNumber(ingredient.availableQuantity, 3)} {ingredient.unit}</p>
                {ingredient.missingQuantity ? <p>Faltante: {formatNumber(ingredient.missingQuantity, 3)} {ingredient.unit}</p> : null}
                <p>Coste estimado: {ingredient.estimatedCost == null ? "sin coste unitario" : formatMoney(ingredient.estimatedCost)}</p>
                {ingredient.candidates?.slice(0, 3).map((candidate) => (
                  <p key={`${candidate.lotId || candidate.productName}-${candidate.batch || "stock"}`} className={`break-words rounded-xl px-3 py-2 ${ingredient.limiting ? "bg-white/60" : "bg-[#0d0d0d]"}`}>
                    {candidate.fefo ? "FEFO · " : ""}{candidate.supplier || "Proveedor"} · lote {candidate.batch || "stock"} · {formatNumber(candidate.availableQuantity, 3)} {candidate.unit || ingredient.unit} · caduca {candidate.expiryDate || "sin fecha"} · {candidate.location || "ubicación"}
                  </p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid min-w-0 gap-4 xl:grid-cols-2">
        <article className="min-w-0 rounded-[1.3rem] border border-white/10 bg-white/6 p-4">
          <h3 className="text-lg font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Pasos de elaboración</h3>
          <div className="mt-3 grid gap-2 text-sm text-stone-200">
            {scaling.steps.map((step) => (
              <p key={`${step.order}-${step.title}`} className="break-words rounded-xl border border-white/10 bg-[#0d0d0d] px-3 py-2">
                <span className="font-black text-white">{step.order}. {step.title}</span> · {step.description}
                {step.criticalControlPoint ? <span className="block text-[#f2c6bb]">APPCC: {step.criticalControlPoint}</span> : null}
              </p>
            ))}
            {!scaling.steps.length ? <p>Pasos pendientes de completar en la ficha técnica.</p> : null}
          </div>
        </article>

        <article className="min-w-0 rounded-[1.3rem] border border-white/10 bg-white/6 p-4">
          <h3 className="text-lg font-black uppercase tracking-[-0.03em] text-[#fff8ef]">APPCC y etiqueta futura</h3>
          <div className="mt-3 grid gap-2 text-sm text-stone-200">
            <p>Alérgenos: {scaling.allergens.length ? scaling.allergens.join(", ") : "Sin alérgenos declarados en la ficha."}</p>
            <p>Conservación: {scaling.conservationType || "por definir"}</p>
            <p>Consumir antes de: {scaling.expiryDate || "por definir"}</p>
            <p>Etiqueta preparada: {scaling.futureLabel.model} · {scaling.futureLabel.product}</p>
            <p>Ingrediente limitante: {scaling.fefo.limitingIngredient || "Ninguno con stock conocido"}</p>
            {scaling.preservationNotes ? <p>Notas: {scaling.preservationNotes}</p> : null}
          </div>
        </article>
      </section>
    </div>
  );
}

export default async function ProduccionPage({
  searchParams,
}: {
  searchParams?: Promise<{
    saved?: string;
    error?: string;
    warning?: string;
    batch?: string;
    recipe?: string;
    preview?: string;
    preview_mode?: string;
    target_quantity?: string;
    target_unit?: string;
    target_servings?: string;
    serving_quantity?: string;
    serving_unit?: string;
    print_job?: string;
    print_error?: string;
    batch_code?: string;
  }>;
}) {
  await requireAdminSession();
  const params = await searchParams;
  const [batchesResult, recipesResult, materialsResult, metricsResult, inventoryResult] = await Promise.all([
    getProductionBatches(80),
    getInternalRecipes(),
    getProductionMaterialOptions(),
    getProductionMetrics(),
    getInventoryProducts({ status: "activos" }),
  ]);
  const batches = batchesResult.ok ? batchesResult.data : [];
  const recipes = recipesResult.ok ? recipesResult.data : [];
  const materials = materialsResult.ok ? materialsResult.data : [];
  const metrics = metricsResult.ok ? metricsResult.data : null;
  const inventory = inventoryResult.ok ? inventoryResult.data : [];
  const selectedRecipe = recipes.find((recipe) => recipe.id === params?.recipe) || recipes[0];
  const recipeInput = selectedRecipe?.inputs?.[0];
  const todayValue = today();
  const previewMode = params?.preview_mode === "servings" ? "servings" : "quantity";
  const previewResult = params?.preview === "1" && selectedRecipe
    ? await previewProductionBatch({
        recipeId: selectedRecipe.id,
        targetQuantity: previewMode === "quantity" ? optionalPositiveNumber(params?.target_quantity) : undefined,
        targetUnit: previewMode === "quantity" ? params?.target_unit || selectedRecipe.output_unit || "kg" : undefined,
        targetServings: previewMode === "servings" ? optionalPositiveNumber(params?.target_servings) : undefined,
        servingQuantity: previewMode === "servings" ? optionalPositiveNumber(params?.serving_quantity) : undefined,
        servingUnit: previewMode === "servings" ? params?.serving_unit || selectedRecipe.output_unit || "ud" : undefined,
        productionDate: todayValue,
      })
    : null;
  const productionPreview = previewResult?.ok ? previewResult.data : null;

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader
        title="Producción interna"
        description="Transformación de materias primas, elaboraciones, congelación, descongelación, mermas y salidas internas."
      />
      <section className="mx-auto max-w-7xl overflow-x-hidden px-4 py-8 sm:px-6 md:py-12">
        <div className="grid min-w-0 gap-6">
          {params?.saved === "1" ? <p className="rounded-2xl border border-emerald-300 bg-emerald-100 px-4 py-3 text-sm font-black text-emerald-950">Producción interna registrada.</p> : null}
          {params?.batch_code ? <p className="rounded-2xl border border-white/10 bg-[#151515] px-4 py-3 text-sm font-semibold text-stone-200">Lote creado: <span className="font-black text-white">{params.batch_code}</span></p> : null}
          {params?.print_job ? <p className="rounded-2xl border border-emerald-300 bg-emerald-100 px-4 py-3 text-sm font-black text-emerald-950">Etiqueta profesional enviada a GoDEX. Job: <span className="font-mono">{params.print_job}</span></p> : null}
          {params?.print_error ? <p className="rounded-2xl border border-amber-300 bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-950">Lote registrado, pero no se imprimió la etiqueta: {params.print_error}</p> : null}
          {params?.warning ? <p className="rounded-2xl border border-amber-300 bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-950">{params.warning}</p> : null}
          {params?.error ? <p className="rounded-2xl border border-[#d94b2b]/40 bg-[#d94b2b]/12 px-4 py-3 text-sm font-semibold text-[#f2c6bb]">{params.error}</p> : null}

          <nav className="flex flex-wrap gap-2 rounded-[1.4rem] border border-white/10 bg-[#151515] p-3" aria-label="Subsecciones producción">
            {[
              ["Nueva producción", "#nueva-produccion"],
              ["Calculadora", "#calculadora-produccion"],
              ["Recetas", "#recetas"],
              ["Lotes internos", "#lotes"],
              ["Congelación", "#lotes"],
              ["Descongelación", "#lotes"],
              ["Mermas", "#lotes"],
              ["Imprimir etiqueta manual", "/admin-kiosko/etiquetas-prep"],
              ["Etiquetas", "/admin-kiosko/etiquetas"],
              ["Inventario", "/admin-kiosko/inventario"],
              ["Trazabilidad", "/admin-kiosko/trazabilidad"],
            ].map(([label, href]) => (
              <a key={label} href={href} className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white transition hover:border-[#d94b2b]">{label}</a>
            ))}
          </nav>

          <section className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
            {[
              ["Hoy", metrics?.productionToday ?? 0],
              ["Semana", metrics?.productionWeek ?? 0],
              ["Mes", metrics?.productionMonth ?? 0],
              ["Kg transformados", `${metrics?.transformedKgMonth ?? 0} kg`],
              ["Unidades", metrics?.producedUnitsMonth ?? 0],
              ["Merma", metrics?.wasteQuantityMonth ?? 0],
              ["Coste materia prima", `${(metrics?.rawMaterialCostMonth ?? 0).toFixed(2)} €`],
              ["Stock producido", metrics?.producedStock ?? 0],
            ].map(([label, value]) => (
              <article key={label} className="min-w-0 rounded-[1.2rem] border border-white/10 bg-[#151515] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f2c6bb]">{label}</p>
                <p className="mt-2 break-words text-xl font-black text-white">{value}</p>
              </article>
            ))}
          </section>

          <section id="calculadora-produccion" className="min-w-0 rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
            <div className="flex flex-col gap-3 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f2c6bb]">Preview sin consumir stock</p>
                <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Calculadora de producción</h2>
                <p className="mt-2 max-w-3xl text-sm font-semibold text-stone-300">
                  Escala una ficha técnica antes de registrar el lote interno. Esta vista no descuenta inventario, no imprime etiquetas y no crea producción.
                </p>
              </div>
              <span className="w-fit rounded-full border border-emerald-300 bg-emerald-100 px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-emerald-950">Solo cálculo</span>
            </div>

            <form action="/admin-kiosko/produccion#calculadora-produccion" className="mt-5 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(12rem,0.8fr)] 2xl:grid-cols-[minmax(0,1.2fr)_minmax(10rem,0.7fr)_minmax(0,1fr)_auto]">
              <input type="hidden" name="preview" value="1" />
              <label className="grid min-w-0 gap-2 text-sm font-semibold text-stone-200">
                Receta técnica
                <select name="recipe" defaultValue={selectedRecipe?.id || ""} className="w-full min-w-0 rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b]">
                  {recipes.map((recipe) => (
                    <option key={recipe.id} value={recipe.id}>{recipe.recipe_name} · {recipe.output_product}</option>
                  ))}
                </select>
              </label>
              <label className="grid min-w-0 gap-2 text-sm font-semibold text-stone-200">
                Modo
                <select name="preview_mode" defaultValue={previewMode} className="w-full min-w-0 rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b]">
                  <option value="quantity">Cantidad final</option>
                  <option value="servings">Número de raciones</option>
                </select>
              </label>
              <div className="grid min-w-0 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                <Field name="target_quantity" label="Cantidad final" type="number" step="0.001" value={params?.target_quantity || selectedRecipe?.expected_yield || 3} />
                <Field name="target_unit" label="Unidad" value={params?.target_unit || selectedRecipe?.output_unit || "kg"} />
                <Field name="target_servings" label="Raciones" type="number" value={params?.target_servings || 20} />
                <Field name="serving_quantity" label="Cantidad/ración" type="number" step="0.001" value={params?.serving_quantity || selectedRecipe?.unit_weight || 100} />
                <Field name="serving_unit" label="Unidad/ración" value={params?.serving_unit || "g"} />
              </div>
              <div className="flex items-end">
                <button className="w-full rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Calcular preview</button>
              </div>
            </form>

            <div className="mt-5">
              {previewResult && !previewResult.ok ? (
                <p className="rounded-2xl border border-amber-300 bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-950">{previewResult.error}</p>
              ) : (
                <ProductionCalculatorResult preview={productionPreview} />
              )}
            </div>
          </section>

          <section className="grid min-w-0 gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]">
            <form id="nueva-produccion" action={saveProductionBatchAction} className="min-w-0 rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
              <div className="flex flex-col gap-3 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f2c6bb]">Nuevo lote interno</p>
                  <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Registrar elaboración</h2>
                </div>
                <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Registrar producción</button>
              </div>

              <div className="mt-5 grid min-w-0 gap-6 xl:grid-cols-2">
                <input type="hidden" name="recipe_id" value={selectedRecipe?.id || ""} />
                <section className="min-w-0 rounded-[1.4rem] border border-white/10 bg-white/6 p-4">
                  <h3 className="text-lg font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Materia prima</h3>
                  <div className="mt-4 grid gap-4">
                    <MaterialSelector materials={materials} />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field name="input_quantity" label="Cantidad usada" type="number" value={recipeInput?.quantity || 1} />
                      <Field name="input_unit" label="Unidad" value={recipeInput?.unit || "kg"} />
                    </div>
                  </div>
                </section>

                <section className="min-w-0 rounded-[1.4rem] border border-white/10 bg-white/6 p-4">
                  <h3 className="text-lg font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Elaboración resultante</h3>
                  <div className="mt-4 grid gap-4">
                    <RecipeSummary recipe={selectedRecipe} />
                    <input type="hidden" name="output_product" value={selectedRecipe?.output_product || ""} />
                    <input type="hidden" name="shelf_life_refrigerated_hours" value={selectedRecipe?.shelf_life_refrigerated_hours || 0} />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field name="output_quantity" label="Cantidad producida" type="number" value={selectedRecipe?.expected_yield || ""} />
                      <Field name="output_unit" label="Unidad" value={selectedRecipe?.output_unit || "ud"} />
                    </div>
                    <Field name="unit_weight" label="Peso unitario" type="number" value={selectedRecipe?.unit_weight || ""} />
                    <SelectField name="storage_state" label="Estado de conservación" value={selectedRecipe?.conservation_type || "refrigerado"} options={["refrigerado", "congelado", "descongelado"]} />
                  </div>
                </section>
              </div>

              <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Field name="production_date" label="Fecha producción" type="date" value={todayValue} required />
                <Field name="production_time" label="Hora producción" type="time" />
                <Field name="responsible" label="Responsable" value="F. Javier Bocanegra Sanjuan" />
                <Field name="expiry_date" label="Caducidad / consumir antes de" type="date" />
                <div className="min-w-0 md:col-span-2"><TextArea name="observations" label="Observaciones" /></div>
              </div>

              <label className="mt-5 flex items-start gap-3 rounded-[1.2rem] border border-emerald-300/30 bg-emerald-100/10 p-4 text-sm font-semibold text-emerald-100">
                <input
                  type="checkbox"
                  name="print_label_after_register"
                  defaultChecked
                  className="mt-1 h-4 w-4 rounded border-white/20"
                />
                <span>
                  <span className="block font-black text-white">Imprimir etiqueta profesional al registrar</span>
                  <span className="mt-1 block text-xs text-emerald-100/85">Usa nombre, lote, elaboración, caducidad, responsable y conservación.</span>
                  <span className="mt-1 block text-xs text-emerald-100/75">Al registrar, se enviará una etiqueta a GoDEX si hay caducidad.</span>
                </span>
              </label>
            </form>

            <section id="recetas" className="min-w-0 rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
              <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Recetas base</h2>
              <form action={saveInternalRecipeAction} className="mt-5 grid gap-4">
                <Field name="recipe_name" label="Nombre receta" value="Bolas smash" required />
                <InventoryProductSelect inventory={inventory} defaultName="Carne fresca burgers" />
                <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                  <Field name="input_quantity" label="Cantidad input" type="number" value={1} />
                  <Field name="input_unit" label="Unidad input" value="kg" />
                </div>
                <Field name="output_product" label="Elaboración resultante" value="Bolas smash" required />
                <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                  <Field name="expected_yield" label="Rendimiento" type="number" value={18} />
                  <Field name="output_unit" label="Unidad salida" value="ud" />
                </div>
                <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                  <Field name="unit_weight" label="Peso unitario g" type="number" value={100} />
                  <Field name="expected_waste" label="Merma esperada g" type="number" value={40} />
                  <Field name="final_weight" label="Peso final g" type="number" />
                  <Field name="prep_time_minutes" label="Tiempo elaboración min" type="number" />
                  <Field name="shelf_life_refrigerated_hours" label="Vida útil refrigerado h" type="number" value={48} />
                  <Field name="shelf_life_frozen_days" label="Vida útil congelado días" type="number" value={90} />
                </div>
                <SelectField name="conservation_type" label="Tipo conservación" value="refrigerado" options={["refrigerado", "congelado"]} />
                <SelectField name="status" label="Estado" value="activa" options={["activa", "revision", "inactiva"]} />
                <TextArea name="instructions" label="Instrucciones" />
                <button className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white">Guardar receta</button>
              </form>

              <div className="mt-5 grid gap-3">
                {recipes.slice(0, 6).map((recipe) => (
                  <article key={recipe.id} className="min-w-0 rounded-[1.2rem] border border-white/10 bg-white/6 p-4 text-sm text-stone-200">
                    <p className="break-words font-black text-white">{recipe.recipe_name}</p>
                    <p className="mt-1 break-words">{recipe.inputs?.map((input) => `${input.input_product} ${input.quantity || ""} ${input.unit || ""}`.trim()).join(", ") || "Materia prima por definir"} → {recipe.output_product}</p>
                    <p className="mt-1 break-words text-xs text-stone-400">Rendimiento: {recipe.expected_yield || "por definir"} {recipe.output_unit || "ud"} · peso {recipe.unit_weight || "por definir"} g · vida útil {recipe.shelf_life_refrigerated_hours || 0} h / {recipe.shelf_life_frozen_days || 0} días.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link href={`/admin-kiosko/produccion?recipe=${recipe.id}`} className="rounded-full border border-white/20 px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white">Repetir elaboración</Link>
                    </div>
                    <details className="mt-3 rounded-xl border border-white/10 bg-[#0d0d0d] p-3">
                      <summary className="cursor-pointer text-[11px] font-black uppercase tracking-[0.12em] text-[#f2c6bb]">Editar receta</summary>
                      <form action={saveInternalRecipeAction} className="mt-3 grid gap-3">
                        <input type="hidden" name="id" value={recipe.id} />
                        <Field name="recipe_name" label="Nombre receta" value={recipe.recipe_name} required />
                        <InventoryProductSelect inventory={inventory} defaultName={recipe.inputs?.[0]?.input_product} />
                        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                          <Field name="input_quantity" label="Cantidad input" type="number" value={recipe.inputs?.[0]?.quantity || ""} />
                          <Field name="input_unit" label="Unidad input" value={recipe.inputs?.[0]?.unit || "kg"} />
                          <Field name="output_product" label="Elaboración resultante" value={recipe.output_product} required />
                          <Field name="expected_yield" label="Rendimiento" type="number" value={recipe.expected_yield || ""} />
                          <Field name="output_unit" label="Unidad salida" value={recipe.output_unit || "ud"} />
                          <Field name="unit_weight" label="Peso unitario g" type="number" value={recipe.unit_weight || ""} />
                          <Field name="expected_waste" label="Merma esperada g" type="number" value={recipe.expected_waste || ""} />
                          <Field name="final_weight" label="Peso final g" type="number" value={recipe.final_weight || ""} />
                          <Field name="prep_time_minutes" label="Tiempo elaboración min" type="number" value={recipe.prep_time_minutes || ""} />
                          <Field name="shelf_life_refrigerated_hours" label="Vida útil refrigerado h" type="number" value={recipe.shelf_life_refrigerated_hours || ""} />
                          <Field name="shelf_life_frozen_days" label="Vida útil congelado días" type="number" value={recipe.shelf_life_frozen_days || ""} />
                        </div>
                        <SelectField name="conservation_type" label="Tipo conservación" value={recipe.conservation_type || "refrigerado"} options={["refrigerado", "congelado"]} />
                        <SelectField name="status" label="Estado" value={recipe.status || "activa"} options={["activa", "revision", "inactiva"]} />
                        <TextArea name="instructions" label="Instrucciones" value={recipe.instructions || ""} />
                        <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white">Guardar cambios</button>
                      </form>
                    </details>
                  </article>
                ))}
                {!recipes.length ? <p className="text-sm text-stone-400">Recetario preparado para elaboraciones internas.</p> : null}
              </div>
            </section>
          </section>

          <section id="lotes" className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
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
                          <Link href={`/admin-kiosko/produccion/lotes/${batch.id}`} className="rounded-full border border-stone-950 bg-stone-950 px-5 py-3 text-center text-xs font-black uppercase tracking-[0.14em] text-white">Ver ficha</Link>
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
