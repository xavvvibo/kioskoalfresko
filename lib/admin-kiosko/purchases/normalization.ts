import type { ProductClassification, ProductMasterCandidate, PurchaseDecision, PurchaseLine, SupplierMaster } from "./contracts";

const PRODUCT_WORDS: Record<ProductClassification, RegExp[]> = {
  food: [/carne|pollo|ternera|cerdo|pescado|queso|pan|tomate|cebolla|lechuga|patata|salsa|huevo|l[aá]cteo|verdura|fruta|burger|hamburgues/i],
  beverage: [/agua|refresco|coca|fanta|zumo|t[oó]nica|bebida|mosto|batido/i],
  alcohol: [/cerveza|vino|ron|ginebra|whisky|vodka|alcohol|licor|alhambra|cruzcampo/i],
  cleaning: [/lej[ií]a|detergente|limpieza|desinfectante|jab[oó]n|bayeta|estropajo|lavavajillas/i],
  packaging: [/envase|tapa|vaso|servilleta|bolsa|papel|film|aluminio|caja|desechable|take away/i],
  equipment: [/freidora|botellero|arc[oó]n|equipo|maquinaria|term[oó]metro|tpv|repuesto/i],
  service: [/servicio|mantenimiento|alquiler|transporte|reparaci[oó]n|cuota|suministro/i],
  other: [],
};

function stripDiacritics(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeSupplierName(value: string) {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/\b(s\.?l\.?|s\.?a\.?|sociedad limitada|sociedad anonima|cif|nif)\b/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeTaxId(value?: string | null) {
  return (value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function normalizeProductName(value: string) {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/\b(kg|kgs|g|gr|litro|litros|l|ml|ud|uds|unidad|unidades|caja|pack)\b/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeBarcode(value?: string | null) {
  const barcode = (value || "").replace(/\D/g, "");
  return barcode.length >= 8 ? barcode : "";
}

export function classifyProduct(productName: string): ProductClassification {
  const normalized = normalizeProductName(productName);
  for (const [classification, patterns] of Object.entries(PRODUCT_WORDS) as Array<[ProductClassification, RegExp[]]>) {
    if (patterns.some((pattern) => pattern.test(normalized))) return classification;
  }
  return "other";
}

export function productFamilyForClassification(classification: ProductClassification, productName: string) {
  if (classification === "food" && /carne|pollo|ternera|cerdo|burger|hamburgues/i.test(productName)) return "carne";
  if (classification === "food" && /pescado|marisco/i.test(productName)) return "pescado";
  if (classification === "food" && /queso|l[aá]cteo|leche/i.test(productName)) return "lácteos";
  if (classification === "food" && /pan|boll|harina/i.test(productName)) return "panadería";
  if (classification === "beverage") return "bebida";
  if (classification === "alcohol") return "bebida alcohólica";
  if (classification === "cleaning") return "limpieza";
  if (classification === "packaging") return "desechables";
  if (classification === "equipment") return "equipamiento";
  if (classification === "service") return "servicio";
  return "otros";
}

export function decidePurchaseLineRequirements(productName: string, classification = classifyProduct(productName)): PurchaseDecision {
  const foodLike = classification === "food" || classification === "beverage" || classification === "alcohol";
  const traceability = classification === "food" || classification === "alcohol";
  const appccReception = foodLike;
  const inventoryLot = classification === "food" || classification === "beverage" || classification === "alcohol" || classification === "cleaning" || classification === "packaging";

  return {
    classification,
    requiresTraceability: traceability,
    requiresAppccReception: appccReception,
    generatesInventoryLot: inventoryLot,
    requiresLabel: traceability,
    accountingCategory: classification === "service" ? "servicios exteriores" : classification === "equipment" ? "inmovilizado/equipamiento" : "compras explotación",
    productFamily: productFamilyForClassification(classification, productName),
    defaultLocation: classification === "food" ? "Almacén cocina" : classification === "beverage" || classification === "alcohol" ? "Almacén bebida" : classification === "cleaning" ? "Almacén limpieza" : undefined,
    storageTemperature: classification === "food" ? "según ficha técnica/proveedor" : undefined,
  };
}

export function detectProductDuplicate(input: { productName: string; gtin?: string | null; ean?: string | null }, candidates: ProductMasterCandidate[]) {
  const gtin = normalizeBarcode(input.gtin);
  const ean = normalizeBarcode(input.ean);
  const normalizedName = normalizeProductName(input.productName);

  const matches: Array<ProductMasterCandidate | null> = candidates
    .map((candidate): ProductMasterCandidate | null => {
      if (gtin && normalizeBarcode(candidate.gtin) === gtin) return { ...candidate, confidence: 1, matchReason: "gtin" as const };
      if (ean && normalizeBarcode(candidate.ean) === ean) return { ...candidate, confidence: 0.98, matchReason: "ean" as const };
      if (candidate.normalizedName === normalizedName) return { ...candidate, confidence: 0.9, matchReason: "name" as const };
      if (candidate.normalizedName.includes(normalizedName) || normalizedName.includes(candidate.normalizedName)) return { ...candidate, confidence: 0.65, matchReason: "similar_name" as const };
      return null;
    });

  return matches
    .filter((candidate): candidate is ProductMasterCandidate => Boolean(candidate))
    .sort((a, b) => b.confidence - a.confidence);
}

export function buildProductCandidate(line: Pick<PurchaseLine, "productName" | "gtin" | "ean">): ProductMasterCandidate {
  const classification = classifyProduct(line.productName);
  const decision = decidePurchaseLineRequirements(line.productName, classification);

  return {
    name: line.productName.trim(),
    normalizedName: normalizeProductName(line.productName),
    gtin: normalizeBarcode(line.gtin) || undefined,
    ean: normalizeBarcode(line.ean) || undefined,
    classification,
    productFamily: decision.productFamily,
    accountingCategory: decision.accountingCategory,
    confidence: 0.5,
    matchReason: "new_product",
  };
}

export function normalizeSupplier(input: SupplierMaster): SupplierMaster & { normalizedName: string; normalizedTaxId: string } {
  return {
    ...input,
    name: input.name.trim(),
    taxId: input.taxId ? normalizeTaxId(input.taxId) : input.taxId,
    normalizedName: normalizeSupplierName(input.name),
    normalizedTaxId: normalizeTaxId(input.taxId),
  };
}
