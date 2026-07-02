/**
 * Production repository.
 *
 * Gestiona produccion interna, lotes internos, movimientos, recetas base y
 * fichas tecnicas escalables. Las funciones legacy se mantienen exportadas
 * para compatibilidad; las nuevas funciones preparan la capa productiva sin
 * consumir inventario real todavia.
 */
import { scaleTechnicalRecipe } from "../production/recipe-scaling";
import type { ProductionPreview, RecipeAllergen, RecipeStep, TechnicalRecipe } from "../production/contracts";
import {
  createInternalRecipe,
  createProductionBatch,
  createProductionMovement,
  getInternalRecipes,
  getProductionBatches,
  getProductionMaterialOptions,
  getProductionMetrics,
  getProductionTraceabilityRows,
  type InternalRecipe,
  type ProductionMaterialOption,
} from "./legacy-core";

type DbResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export {
  createInternalRecipe,
  createProductionBatch,
  createProductionMovement,
  getInternalRecipes,
  getProductionBatches,
  getProductionMetrics,
  getProductionTraceabilityRows,
};

export type ProductionPlanRequest = RecipeScalingPreviewRequest & {
  productionTime?: string;
  responsible?: string;
  storageState?: string;
  observations?: string;
};

export type PlannedProductionIngredientLot = {
  lotId: string;
  productId: string;
  productName: string;
  supplier?: string | null;
  batch?: string | null;
  expiryDate?: string | null;
  location?: string | null;
  quantity: number;
  unit: string;
};

export type PlannedProductionIngredient = {
  ingredientId?: string;
  productId: string;
  productName: string;
  requiredQuantity: number;
  unit: string;
  lots: PlannedProductionIngredientLot[];
};

export type ProductionExecutionPlan = {
  recipe: TechnicalRecipe;
  preview: ProductionPreview;
  productionDate: string;
  productionTime?: string;
  responsible?: string;
  outputProduct: string;
  outputQuantity: number;
  outputUnit: string;
  unitWeight?: number | null;
  storageState?: string | null;
  expiryDate?: string | null;
  observations?: string;
  allergens: RecipeAllergen[];
  ingredients: PlannedProductionIngredient[];
  labelPreview: {
    product: string;
    model: "Elaboración";
    batch?: string;
    productionDate: string;
    bestBeforeDate?: string | null;
    conservation?: string | null;
    ingredients: string[];
    allergens: RecipeAllergen[];
    qrPayload: Record<string, unknown>;
  };
};

export type ProductionExecutionResult = {
  productionBatchId: string;
  batchCode: string;
  outputInventoryLotId: string;
  outputProductId?: string;
  outputProduct: string;
  outputQuantity: number;
  outputUnit: string;
  expiryDate?: string | null;
  consumedLots: PlannedProductionIngredientLot[];
  labelPreview: ProductionExecutionPlan["labelPreview"] & {
    batch: string;
    inventoryLotId: string;
  };
};

export type ProductionDashboardOperationalMetrics = {
  productionsToday: number;
  elaboratedKgToday: number;
  activeInternalLots: number;
  fefoConsumptionsToday: number;
  exhaustedIngredients: number;
};

function getSupabaseConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  };
}

function assertSupabaseConfig() {
  const config = getSupabaseConfig();

  if (!config.url || !config.serviceRoleKey) {
    return { ok: false as const, error: "Supabase no está configurado." };
  }

  return { ok: true as const, config };
}

async function supabaseRest<T>(resource: string, init: RequestInit & { query?: string }): Promise<DbResult<T>> {
  const configResult = assertSupabaseConfig();
  if (!configResult.ok) return configResult;

  try {
    const response = await fetch(`${configResult.config.url}/rest/v1/${resource}${init.query || ""}`, {
      ...init,
      headers: {
        apikey: configResult.config.serviceRoleKey,
        Authorization: `Bearer ${configResult.config.serviceRoleKey}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
      cache: "no-store",
    });
    const responseText = await response.text();

    if (!response.ok) {
      let error = responseText || `HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(responseText) as { message?: string; details?: string; hint?: string; code?: string };
        error = [parsed.message, parsed.details, parsed.hint, parsed.code].filter(Boolean).join(" · ");
      } catch {
        // keep raw response
      }
      return { ok: false, error };
    }

    if (response.status === 204 || !responseText) return { ok: true, data: undefined as T };
    return { ok: true, data: JSON.parse(responseText) as T };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se ha podido conectar con Supabase." };
  }
}

function todayMadrid() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function allocateFefoLots(ingredient: ProductionPreview["scaling"]["scaledIngredients"][number]): PlannedProductionIngredient | null {
  const productId = ingredient.inventoryProductId || ingredient.candidates?.find((candidate) => candidate.productId)?.productId;
  if (!productId) return null;

  let remaining = Number(ingredient.totalRequiredQuantity || 0);
  const lots: PlannedProductionIngredientLot[] = [];

  for (const candidate of ingredient.candidates || []) {
    if (remaining <= 0) break;
    if (!candidate.lotId || !candidate.productId) continue;
    const available = Number(candidate.availableQuantity || 0);
    if (available <= 0) continue;
    const quantity = Math.min(remaining, available);
    lots.push({
      lotId: candidate.lotId,
      productId: candidate.productId,
      productName: candidate.productName,
      supplier: candidate.supplier,
      batch: candidate.batch,
      expiryDate: candidate.expiryDate,
      location: candidate.location,
      quantity,
      unit: ingredient.unit,
    });
    remaining = Number((remaining - quantity).toFixed(6));
  }

  return {
    ingredientId: ingredient.id,
    productId,
    productName: ingredient.name,
    requiredQuantity: Number(ingredient.totalRequiredQuantity || 0),
    unit: ingredient.unit,
    lots,
  };
}

type AdvancedRecipeFields = {
  base_output_quantity?: number | null;
  base_output_unit?: string | null;
  expected_waste_percent?: number | null;
  allergens?: RecipeAllergen[] | string[] | null;
  steps?: RecipeStep[] | string | null;
  preservation_notes?: string | null;
  label_template?: string | null;
};

type AdvancedRecipeInputFields = {
  waste_percent?: number | null;
  allergen_tags?: RecipeAllergen[] | string[] | null;
  unit_cost?: number | null;
  preparation_note?: string | null;
  sort_order?: number | null;
};

export type RecipeScalingPreviewRequest = {
  recipeId: string;
  targetQuantity?: number;
  targetUnit?: string;
  targetServings?: number;
  servingQuantity?: number;
  servingUnit?: string;
  productionDate?: string;
};

function parseJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value !== "string" || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return value.split(/\n+/).map((line, index) => ({
      order: index + 1,
      title: `Paso ${index + 1}`,
      description: line.trim(),
    })).filter((item) => "description" in item && item.description) as T[];
  }
}

function normalizeRecipeSteps(recipe: InternalRecipe & AdvancedRecipeFields): RecipeStep[] {
  const advancedSteps = parseJsonArray<RecipeStep>(recipe.steps);
  if (advancedSteps.length) {
    return advancedSteps.map((step, index) => ({
      order: Number(step.order || index + 1),
      title: step.title || `Paso ${index + 1}`,
      description: step.description,
      durationMinutes: step.durationMinutes,
      criticalControlPoint: step.criticalControlPoint,
    })).filter((step) => step.description);
  }

  return parseJsonArray<RecipeStep>(recipe.instructions);
}

function normalizeAllergens(value: unknown): RecipeAllergen[] {
  if (Array.isArray(value)) return value.filter(Boolean) as RecipeAllergen[];
  if (typeof value !== "string" || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter(Boolean) as RecipeAllergen[] : [];
  } catch {
    return value.split(/[,;\n]+/).map((item) => item.trim()).filter(Boolean) as RecipeAllergen[];
  }
}

function matchingCandidates(input: NonNullable<InternalRecipe["inputs"]>[number], materials: ProductionMaterialOption[]) {
  return materials
    .filter((material) => {
      const sameId = input.input_product_id && material.product_id === input.input_product_id;
      const sameName = material.product.toLowerCase() === input.input_product.toLowerCase();
      return sameId || sameName;
    })
    .map((material) => ({
      lotId: material.lot_id,
      productId: material.product_id,
      productName: material.product,
      supplier: material.supplier,
      batch: material.batch,
      availableQuantity: Number(material.stock || 0),
      unit: material.unit,
      expiryDate: material.expiry_date,
      location: material.location,
      fefo: material.fefo,
      unitCost: null,
    }))
    .sort((a, b) => {
      if (a.fefo !== b.fefo) return a.fefo ? -1 : 1;
      return (a.expiryDate || "9999-12-31").localeCompare(b.expiryDate || "9999-12-31");
    });
}

function toTechnicalRecipe(recipe: InternalRecipe, materials: ProductionMaterialOption[] = []): TechnicalRecipe {
  const advanced = recipe as InternalRecipe & AdvancedRecipeFields;

  return {
    id: recipe.id,
    name: recipe.recipe_name,
    outputProduct: recipe.output_product,
    baseOutputQuantity: Number(advanced.base_output_quantity || recipe.expected_yield || recipe.final_weight || 1),
    baseOutputUnit: advanced.base_output_unit || recipe.output_unit || "ud",
    baseFinalWeight: recipe.final_weight,
    unitWeight: recipe.unit_weight,
    expectedWaste: recipe.expected_waste,
    expectedWastePercent: advanced.expected_waste_percent,
    prepTimeMinutes: recipe.prep_time_minutes,
    shelfLifeRefrigeratedHours: recipe.shelf_life_refrigerated_hours,
    shelfLifeFrozenDays: recipe.shelf_life_frozen_days,
    conservationType: recipe.conservation_type,
    preservationNotes: advanced.preservation_notes,
    labelTemplate: advanced.label_template,
    allergens: normalizeAllergens(advanced.allergens),
    ingredients: (recipe.inputs || []).map((input) => {
      const inputAdvanced = input as typeof input & AdvancedRecipeInputFields;
      return {
        id: input.id,
        inventoryProductId: input.input_product_id,
        name: input.input_product,
        quantity: Number(input.quantity || 0),
        unit: input.unit || "ud",
        unitCost: inputAdvanced.unit_cost,
        wastePercent: inputAdvanced.waste_percent,
        allergens: normalizeAllergens(inputAdvanced.allergen_tags),
        preparationNote: inputAdvanced.preparation_note,
        candidates: matchingCandidates(input, materials),
      };
    }),
    steps: normalizeRecipeSteps(advanced),
    active: recipe.active,
  };
}

export async function getTechnicalRecipes(): Promise<DbResult<TechnicalRecipe[]>> {
  const [recipes, materials] = await Promise.all([
    getInternalRecipes(),
    getProductionMaterialOptions(),
  ]);

  if (!recipes.ok) return recipes;
  const materialRows = materials.ok ? materials.data : [];
  return { ok: true, data: recipes.data.map((recipe) => toTechnicalRecipe(recipe, materialRows)) };
}

export async function getTechnicalRecipeById(id: string): Promise<DbResult<TechnicalRecipe | null>> {
  const recipes = await getTechnicalRecipes();
  if (!recipes.ok) return recipes;
  return { ok: true, data: recipes.data.find((recipe) => recipe.id === id) || null };
}

export async function calculateRecipeScaling(request: RecipeScalingPreviewRequest) {
  const recipe = await getTechnicalRecipeById(request.recipeId);
  if (!recipe.ok) return recipe;
  if (!recipe.data) return { ok: false as const, error: "Ficha técnica no encontrada." };

  return {
    ok: true as const,
    data: scaleTechnicalRecipe({
      recipe: recipe.data,
      targetQuantity: request.targetQuantity,
      targetUnit: request.targetUnit,
      targetServings: request.targetServings,
      servingQuantity: request.servingQuantity,
      servingUnit: request.servingUnit,
      productionDate: request.productionDate,
    }),
  };
}

export async function previewProductionBatch(request: RecipeScalingPreviewRequest): Promise<DbResult<ProductionPreview>> {
  const recipe = await getTechnicalRecipeById(request.recipeId);
  if (!recipe.ok) return recipe;
  if (!recipe.data) return { ok: false, error: "Ficha técnica no encontrada." };

  const scaling = scaleTechnicalRecipe({
    recipe: recipe.data,
    targetQuantity: request.targetQuantity,
    targetUnit: request.targetUnit,
    targetServings: request.targetServings,
    servingQuantity: request.servingQuantity,
    servingUnit: request.servingUnit,
    productionDate: request.productionDate,
  });
  const warnings = [
    ...scaling.fefo.missingIngredients.map((ingredient) => `Stock insuficiente previsto para ${ingredient.ingredient}: faltan ${ingredient.missingQuantity} ${ingredient.unit}.`),
    ...scaling.cost.missingCostData.map((ingredient) => `Coste unitario no informado para ${ingredient}.`),
    scaling.allergens.length ? `Alérgenos a declarar: ${scaling.allergens.join(", ")}.` : "",
  ].filter(Boolean);

  return {
    ok: true,
    data: {
      recipe: recipe.data,
      scaling,
      canProduceWithKnownStock: scaling.fefo.ready,
      warnings,
    },
  };
}

export async function planProductionBatch(request: ProductionPlanRequest): Promise<DbResult<ProductionExecutionPlan>> {
  const preview = await previewProductionBatch(request);
  if (!preview.ok) return preview;

  const productionDate = request.productionDate || todayMadrid();
  const ingredients = preview.data.scaling.scaledIngredients
    .map(allocateFefoLots)
    .filter((ingredient): ingredient is PlannedProductionIngredient => Boolean(ingredient));
  const storageState = request.storageState || preview.data.scaling.conservationType || "refrigerado";
  const outputQuantity = Number(preview.data.scaling.expectedYieldQuantity || request.targetQuantity || 0);
  const outputUnit = preview.data.scaling.expectedYieldUnit || request.targetUnit || preview.data.recipe.baseOutputUnit || "ud";

  return {
    ok: true,
    data: {
      recipe: preview.data.recipe,
      preview: preview.data,
      productionDate,
      productionTime: request.productionTime,
      responsible: request.responsible,
      outputProduct: preview.data.scaling.outputProduct,
      outputQuantity,
      outputUnit,
      unitWeight: preview.data.recipe.unitWeight,
      storageState,
      expiryDate: preview.data.scaling.expiryDate,
      observations: request.observations,
      allergens: preview.data.scaling.allergens,
      ingredients,
      labelPreview: {
        product: preview.data.scaling.outputProduct,
        model: "Elaboración",
        productionDate,
        bestBeforeDate: preview.data.scaling.expiryDate,
        conservation: storageState,
        ingredients: preview.data.scaling.scaledIngredients.map((ingredient) => ingredient.name),
        allergens: preview.data.scaling.allergens,
        qrPayload: {
          type: "production_batch",
          recipe_id: preview.data.recipe.id,
          product: preview.data.scaling.outputProduct,
          production_date: productionDate,
          expiry_date: preview.data.scaling.expiryDate,
        },
      },
    },
  };
}

export function validateProductionStock(plan: ProductionExecutionPlan): DbResult<ProductionExecutionPlan> {
  const missing = plan.ingredients.flatMap((ingredient) => {
    const planned = ingredient.lots.reduce((sum, lot) => sum + Number(lot.quantity || 0), 0);
    return planned + 0.000001 >= ingredient.requiredQuantity
      ? []
      : [`${ingredient.productName}: requerido ${ingredient.requiredQuantity} ${ingredient.unit}, planificado ${planned} ${ingredient.unit}.`];
  });

  if (missing.length) {
    return { ok: false, error: `Stock FEFO insuficiente. ${missing.join(" ")}` };
  }

  return { ok: true, data: plan };
}

export function reserveProductionLots(plan: ProductionExecutionPlan): DbResult<ProductionExecutionPlan> {
  const validation = validateProductionStock(plan);
  if (!validation.ok) return validation;
  return { ok: true, data: plan };
}

export async function consumeProductionLots(plan: ProductionExecutionPlan): Promise<DbResult<ProductionExecutionResult>> {
  return registerProductionMovements(plan);
}

export async function createFinishedProductLot(plan: ProductionExecutionPlan): Promise<DbResult<ProductionExecutionResult>> {
  return registerProductionMovements(plan);
}

function rpcPayloadFromPlan(plan: ProductionExecutionPlan) {
  return {
    recipe_id: plan.recipe.id,
    production_date: plan.productionDate,
    production_time: plan.productionTime,
    responsible: plan.responsible,
    output_product: plan.outputProduct,
    output_quantity: plan.outputQuantity,
    output_unit: plan.outputUnit,
    unit_weight: plan.unitWeight,
    storage_state: plan.storageState,
    expiry_date: plan.expiryDate,
    observations: plan.observations,
    allergens: plan.allergens,
    ingredients: plan.ingredients.map((ingredient) => ({
      ingredient_id: ingredient.ingredientId,
      product_id: ingredient.productId,
      product_name: ingredient.productName,
      required_quantity: ingredient.requiredQuantity,
      unit: ingredient.unit,
      planned_lots: ingredient.lots,
    })),
    label_preview: plan.labelPreview,
  };
}

type ProductionRpcResult = {
  production_batch_id: string;
  batch_code: string;
  output_inventory_lot_id: string;
  output_product_id?: string;
  output_product: string;
  output_quantity: number;
  output_unit: string;
  expiry_date?: string | null;
  consumed_lots?: Array<{
    lot_id: string;
    product_id: string;
    product_name: string;
    batch_number?: string | null;
    quantity: number;
    unit: string;
    supplier?: string | null;
    expiry_date?: string | null;
  }>;
  label_preview?: Record<string, unknown>;
};

export async function registerProductionMovements(plan: ProductionExecutionPlan): Promise<DbResult<ProductionExecutionResult>> {
  const reserved = reserveProductionLots(plan);
  if (!reserved.ok) return reserved;

  const result = await supabaseRest<ProductionRpcResult>("rpc/admin_execute_production_batch", {
    method: "POST",
    body: JSON.stringify({ p_payload: rpcPayloadFromPlan(plan) }),
  });
  if (!result.ok) return result;

  return {
    ok: true,
    data: {
      productionBatchId: result.data.production_batch_id,
      batchCode: result.data.batch_code,
      outputInventoryLotId: result.data.output_inventory_lot_id,
      outputProductId: result.data.output_product_id,
      outputProduct: result.data.output_product,
      outputQuantity: Number(result.data.output_quantity || 0),
      outputUnit: result.data.output_unit || plan.outputUnit,
      expiryDate: result.data.expiry_date,
      consumedLots: (result.data.consumed_lots || []).map((lot) => ({
        lotId: lot.lot_id,
        productId: lot.product_id,
        productName: lot.product_name,
        supplier: lot.supplier,
        batch: lot.batch_number,
        expiryDate: lot.expiry_date,
        quantity: Number(lot.quantity || 0),
        unit: lot.unit,
      })),
      labelPreview: {
        ...plan.labelPreview,
        batch: result.data.batch_code,
        inventoryLotId: result.data.output_inventory_lot_id,
        qrPayload: {
          ...plan.labelPreview.qrPayload,
          production_batch_id: result.data.production_batch_id,
          inventory_lot_id: result.data.output_inventory_lot_id,
          batch: result.data.batch_code,
        },
      },
    },
  };
}

export function generateFinishedProductLabel(result: ProductionExecutionResult) {
  return {
    model: "Elaboración" as const,
    product: result.outputProduct,
    batch: result.batchCode,
    elaborationDate: result.labelPreview.productionDate,
    bestBeforeDate: result.expiryDate || result.labelPreview.bestBeforeDate,
    ingredients: result.labelPreview.ingredients,
    allergens: result.labelPreview.allergens,
    conservation: result.labelPreview.conservation,
    inventoryLotId: result.outputInventoryLotId,
    qrPayload: result.labelPreview.qrPayload,
  };
}

export async function getProductionOperationalDashboardMetrics(): Promise<DbResult<ProductionDashboardOperationalMetrics>> {
  const today = todayMadrid();
  const [productions, consumptions, internalLots, exhausted] = await Promise.all([
    supabaseRest<Array<{ output_quantity: number | null; output_unit: string | null }>>("admin_production_batches", {
      method: "GET",
      query: `?select=output_quantity,output_unit&production_date=eq.${today}&limit=1000`,
    }),
    supabaseRest<Array<{ id: string }>>("admin_inventory_lot_movements", {
      method: "GET",
      query: `?select=id&movement_type=eq.consumo&movement_date=eq.${today}&reason=ilike.*FEFO*&limit=1000`,
    }),
    supabaseRest<Array<{ id: string }>>("admin_inventory_lots", {
      method: "GET",
      query: "?select=id&is_internal_production=eq.true&status=eq.activo&current_quantity=gt.0&limit=1000",
    }),
    supabaseRest<Array<{ id: string }>>("admin_inventory_lots", {
      method: "GET",
      query: "?select=id&status=eq.agotado&source=eq.admin-kiosko-production-transaction&limit=1000",
    }),
  ]);

  if (!productions.ok) return productions;
  if (!consumptions.ok) return consumptions;
  if (!internalLots.ok) return internalLots;
  if (!exhausted.ok) return exhausted;

  return {
    ok: true,
    data: {
      productionsToday: productions.data.length,
      elaboratedKgToday: productions.data.reduce((sum, batch) => sum + (batch.output_unit === "kg" ? Number(batch.output_quantity || 0) : 0), 0),
      activeInternalLots: internalLots.data.length,
      fefoConsumptionsToday: consumptions.data.length,
      exhaustedIngredients: exhausted.data.length,
    },
  };
}
