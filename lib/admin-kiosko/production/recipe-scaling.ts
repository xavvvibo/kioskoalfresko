import type {
  RecipeAllergen,
  RecipeIngredient,
  RecipeScalingRequest,
  RecipeScalingResult,
  RecipeStep,
  TechnicalRecipe,
} from "./contracts";

function roundQuantity(value: number) {
  return Number((Number.isFinite(value) ? value : 0).toFixed(3));
}

function normalizeUnit(unit?: string | null) {
  return (unit || "ud").trim().toLowerCase();
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function calculateExpiryDate(recipe: TechnicalRecipe, productionDate?: string) {
  const date = productionDate || new Date().toISOString().slice(0, 10);

  if (recipe.conservationType === "congelado" && recipe.shelfLifeFrozenDays) {
    return addDays(date, recipe.shelfLifeFrozenDays);
  }

  if (recipe.shelfLifeRefrigeratedHours) {
    return addDays(date, Math.ceil(recipe.shelfLifeRefrigeratedHours / 24));
  }

  return null;
}

function uniqueAllergens(recipeAllergens: RecipeAllergen[] = [], ingredients: RecipeIngredient[]) {
  return Array.from(new Set([
    ...recipeAllergens,
    ...ingredients.flatMap((ingredient) => ingredient.allergens || []),
  ]));
}

function orderedSteps(steps: RecipeStep[], fallbackInstructions?: string | null) {
  if (steps.length) return [...steps].sort((a, b) => a.order - b.order);
  if (!fallbackInstructions) return [];

  return fallbackInstructions
    .split(/\n+/)
    .map((description, index) => description.trim() ? {
      order: index + 1,
      title: `Paso ${index + 1}`,
      description: description.trim(),
    } : null)
    .filter((step): step is RecipeStep => Boolean(step));
}

function sumCandidateStock(ingredient: RecipeIngredient) {
  return (ingredient.candidates || []).reduce((sum, candidate) => {
    const sameUnit = normalizeUnit(candidate.unit) === normalizeUnit(ingredient.unit);
    return sameUnit ? sum + Number(candidate.availableQuantity || 0) : sum;
  }, 0);
}

function ingredientUnitCost(ingredient: RecipeIngredient) {
  if (Number.isFinite(ingredient.unitCost || undefined)) return Number(ingredient.unitCost);
  const candidateCost = ingredient.candidates?.find((candidate) => Number.isFinite(candidate.unitCost || undefined))?.unitCost;
  return Number.isFinite(candidateCost || undefined) ? Number(candidateCost) : undefined;
}

export function calculateRecipeScaleFactor(request: RecipeScalingRequest) {
  const recipe = request.recipe;
  const baseOutput = Number(recipe.baseOutputQuantity || 0);

  if (request.targetServings && request.servingQuantity && baseOutput > 0) {
    const servingTotal = request.targetServings * request.servingQuantity;
    return servingTotal / baseOutput;
  }

  if (request.targetQuantity && baseOutput > 0) {
    return request.targetQuantity / baseOutput;
  }

  return 1;
}

export function scaleTechnicalRecipe(request: RecipeScalingRequest): RecipeScalingResult {
  const recipe = request.recipe;
  const factor = calculateRecipeScaleFactor(request);
  const targetQuantity = request.targetServings && request.servingQuantity
    ? request.targetServings * request.servingQuantity
    : request.targetQuantity || recipe.baseOutputQuantity;
  const targetUnit = request.targetServings && request.servingUnit
    ? request.servingUnit
    : request.targetUnit || recipe.baseOutputUnit;
  const expectedWasteQuantity = roundQuantity(Number(recipe.expectedWaste || 0) * factor);
  const expectedYieldQuantity = roundQuantity(targetQuantity);
  const expiryDate = calculateExpiryDate(recipe, request.productionDate);
  const missingCostData: string[] = [];

  const scaledIngredients = recipe.ingredients.map((ingredient) => {
    const scaledQuantity = roundQuantity(ingredient.quantity * factor);
    const scaledWasteQuantity = roundQuantity(scaledQuantity * (Number(ingredient.wastePercent || 0) / 100));
    const totalRequiredQuantity = roundQuantity(scaledQuantity + scaledWasteQuantity);
    const unitCost = ingredientUnitCost(ingredient);
    if (!Number.isFinite(unitCost || undefined)) missingCostData.push(ingredient.name);
    const availableQuantity = sumCandidateStock(ingredient);
    const missingQuantity = Math.max(0, roundQuantity(totalRequiredQuantity - availableQuantity));

    return {
      ...ingredient,
      scaledQuantity,
      scaledWasteQuantity,
      totalRequiredQuantity,
      estimatedCost: Number.isFinite(unitCost || undefined) ? roundQuantity(totalRequiredQuantity * Number(unitCost)) : null,
      availableQuantity,
      missingQuantity,
      limiting: missingQuantity > 0,
    };
  });

  const ingredientsCost = roundQuantity(scaledIngredients.reduce((sum, ingredient) => sum + Number(ingredient.estimatedCost || 0), 0));
  const missingIngredients = scaledIngredients
    .filter((ingredient) => ingredient.limiting)
    .map((ingredient) => ({
      ingredient: ingredient.name,
      requiredQuantity: ingredient.totalRequiredQuantity,
      availableQuantity: ingredient.availableQuantity || 0,
      missingQuantity: ingredient.missingQuantity || 0,
      unit: ingredient.unit,
    }));
  const limitingIngredient = missingIngredients[0]?.ingredient;

  return {
    recipeId: recipe.id,
    recipeName: recipe.name,
    outputProduct: recipe.outputProduct,
    factor: roundQuantity(factor),
    targetQuantity: roundQuantity(targetQuantity),
    targetUnit,
    targetServings: request.targetServings,
    scaledIngredients,
    steps: orderedSteps(recipe.steps),
    allergens: uniqueAllergens(recipe.allergens, recipe.ingredients),
    cost: {
      ingredientsCost,
      estimatedUnitCost: expectedYieldQuantity ? roundQuantity(ingredientsCost / expectedYieldQuantity) : null,
      missingCostData,
    },
    expectedWasteQuantity,
    expectedWasteUnit: recipe.baseOutputUnit,
    expectedYieldQuantity,
    expectedYieldUnit: targetUnit,
    expiryDate,
    conservationType: recipe.conservationType,
    preservationNotes: recipe.preservationNotes,
    futureLabel: {
      product: recipe.outputProduct,
      model: "Elaboración",
      conservation: recipe.conservationType,
      bestBeforeDate: expiryDate,
    },
    fefo: {
      ready: missingIngredients.length === 0,
      limitingIngredient,
      missingIngredients,
    },
  };
}
