export type RecipeAllergen =
  | "gluten"
  | "crustaceans"
  | "eggs"
  | "fish"
  | "peanuts"
  | "soy"
  | "milk"
  | "nuts"
  | "celery"
  | "mustard"
  | "sesame"
  | "sulphites"
  | "lupin"
  | "molluscs";

export type RecipeInventoryCandidate = {
  lotId?: string | null;
  productId?: string | null;
  productName: string;
  supplier?: string | null;
  batch?: string | null;
  availableQuantity: number;
  unit?: string | null;
  expiryDate?: string | null;
  location?: string | null;
  fefo: boolean;
  unitCost?: number | null;
};

export type RecipeIngredient = {
  id?: string;
  inventoryProductId?: string | null;
  name: string;
  quantity: number;
  unit: string;
  unitCost?: number | null;
  wastePercent?: number | null;
  allergens?: RecipeAllergen[];
  preparationNote?: string | null;
  candidates?: RecipeInventoryCandidate[];
};

export type RecipeStep = {
  order: number;
  title: string;
  description: string;
  durationMinutes?: number | null;
  criticalControlPoint?: string | null;
};

export type TechnicalRecipe = {
  id: string;
  name: string;
  outputProduct: string;
  baseOutputQuantity: number;
  baseOutputUnit: string;
  baseFinalWeight?: number | null;
  unitWeight?: number | null;
  expectedWaste?: number | null;
  expectedWastePercent?: number | null;
  prepTimeMinutes?: number | null;
  shelfLifeRefrigeratedHours?: number | null;
  shelfLifeFrozenDays?: number | null;
  conservationType?: string | null;
  preservationNotes?: string | null;
  labelTemplate?: string | null;
  allergens?: RecipeAllergen[];
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  active: boolean;
};

export type RecipeScalingRequest = {
  recipe: TechnicalRecipe;
  targetQuantity?: number;
  targetUnit?: string;
  targetServings?: number;
  servingQuantity?: number;
  servingUnit?: string;
  productionDate?: string;
};

export type ScaledRecipeIngredient = RecipeIngredient & {
  scaledQuantity: number;
  scaledWasteQuantity: number;
  totalRequiredQuantity: number;
  estimatedCost?: number | null;
  availableQuantity?: number;
  missingQuantity?: number;
  limiting: boolean;
};

export type RecipeCostSummary = {
  ingredientsCost: number;
  estimatedUnitCost?: number | null;
  missingCostData: string[];
};

export type RecipeScalingResult = {
  recipeId: string;
  recipeName: string;
  outputProduct: string;
  factor: number;
  targetQuantity: number;
  targetUnit: string;
  targetServings?: number;
  scaledIngredients: ScaledRecipeIngredient[];
  steps: RecipeStep[];
  allergens: RecipeAllergen[];
  cost: RecipeCostSummary;
  expectedWasteQuantity: number;
  expectedWasteUnit: string;
  expectedYieldQuantity: number;
  expectedYieldUnit: string;
  expiryDate?: string | null;
  conservationType?: string | null;
  preservationNotes?: string | null;
  futureLabel: {
    product: string;
    model: "Elaboración";
    conservation?: string | null;
    bestBeforeDate?: string | null;
  };
  fefo: {
    ready: boolean;
    limitingIngredient?: string;
    missingIngredients: Array<{
      ingredient: string;
      requiredQuantity: number;
      availableQuantity: number;
      missingQuantity: number;
      unit: string;
    }>;
  };
};

export type ProductionPreview = {
  recipe: TechnicalRecipe;
  scaling: RecipeScalingResult;
  canProduceWithKnownStock: boolean;
  warnings: string[];
};
