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
