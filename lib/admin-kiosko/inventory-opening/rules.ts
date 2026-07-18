import type {
  InventoryOpeningCatalogCandidate,
  InventoryOpeningDraftLine,
  InventoryOpeningFieldProposal,
  InventoryOpeningImageGroup,
  InventoryOpeningImageMetadata,
  InventoryOpeningImageRelation,
  InventoryOpeningMatchProposal,
  InventoryOpeningPurchaseCandidate,
} from "./types.ts";

export const inventoryOpeningAllowedExtensions = new Set(["jpg", "jpeg", "png", "webp"]);
export const inventoryOpeningMaxFiles = 500;
export const inventoryOpeningMaxZipBytes = 750 * 1024 * 1024;
export const inventoryOpeningMaxEntries = 1_000;
export const inventoryOpeningMaxUncompressedFileBytes = 75 * 1024 * 1024;
export const inventoryOpeningMaxTotalUncompressedBytes = 1_000 * 1024 * 1024;
export const inventoryOpeningMaxCompressionRatio = 120;

export function normalizeInventoryText(value: unknown) {
  return typeof value === "string"
    ? value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim()
        .toLowerCase()
    : "";
}

export function isZipSlipPath(path: string) {
  const normalized = path.replace(/\\/g, "/");
  return normalized.startsWith("/")
    || normalized.includes("\0")
    || normalized.split("/").some((segment) => segment === "..");
}

export function isHiddenMacZipEntry(path: string) {
  const normalized = path.replace(/\\/g, "/");
  return normalized.startsWith("__MACOSX/")
    || normalized.split("/").some((segment) => segment === ".DS_Store" || segment.startsWith("._"));
}

export function safeInventoryImageName(path: string, fallbackIndex: number) {
  const base = path.replace(/\\/g, "/").split("/").pop() || `image-${fallbackIndex}`;
  return base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) || `image-${fallbackIndex}`;
}

export function extensionFromPath(path: string) {
  const match = path.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "";
}

export function isGenericCameraFilename(path: string) {
  const base = normalizeInventoryText(safeInventoryImageName(path, 0).replace(/\.[a-z0-9]+$/i, ""));
  return !base
    || /^\d+$/.test(base)
    || /^(img|image|foto|dsc|pxl)( \d+)+$/.test(base)
    || /^(img|image|foto|dsc|pxl)$/.test(base)
    || /^whatsapp image( \d+)*$/.test(base);
}

export function mimeFromExtension(extension: string) {
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  return "application/octet-stream";
}

export function proposeImageGroups(images: InventoryOpeningImageMetadata[]): InventoryOpeningImageGroup[] {
  const groups: InventoryOpeningImageGroup[] = [];
  const byHash = new Map<string, number[]>();
  images.forEach((image, index) => {
    const rows = byHash.get(image.sha256) || [];
    rows.push(index);
    byHash.set(image.sha256, rows);
  });

  for (const [sha256, indexes] of byHash.entries()) {
    if (indexes.length > 1) {
      groups.push({
        groupKey: `sha256:${sha256}`,
        relation: "exact_duplicate",
        imageIndexes: indexes,
        reason: "Mismo hash SHA-256. Puede ser foto repetida o unidad fotografiada de nuevo; requiere revisión humana.",
        reviewRequired: true,
        suggestedUnits: null,
      });
    }
  }

  const ungrouped = images
    .map((image, index) => ({ image, index }))
    .filter(({ index }) => !groups.some((group) => group.imageIndexes.includes(index)));
  const byNormalizedBase = new Map<string, number[]>();
  for (const { image, index } of ungrouped) {
    const base = normalizeInventoryText(image.safeName.replace(/\.[a-z0-9]+$/i, "").replace(/\d+$/g, ""));
    if (isGenericCameraFilename(image.safeName)) continue;
    const rows = byNormalizedBase.get(base) || [];
    rows.push(index);
    byNormalizedBase.set(base, rows);
  }

  for (const [base, indexes] of byNormalizedBase.entries()) {
    if (indexes.length <= 1) continue;
    groups.push({
      groupKey: `filename:${base}`,
      relation: "probable_same_product",
      imageIndexes: indexes,
      reason: "Nombre de archivo similar. Puede representar varias vistas o varias unidades; no se convierte en cantidad automáticamente.",
      reviewRequired: true,
      suggestedUnits: null,
    });
  }

  const groupedIndexes = new Set(groups.flatMap((group) => group.imageIndexes));
  images.forEach((image, index) => {
    if (groupedIndexes.has(index)) return;
    groups.push({
      groupKey: `single:${image.sha256}`,
      relation: image.relation,
      imageIndexes: [index],
      reason: "Imagen individual pendiente de identificación.",
      reviewRequired: true,
      suggestedUnits: null,
    });
  });

  return groups.sort((a, b) => Math.min(...a.imageIndexes) - Math.min(...b.imageIndexes));
}

export function fieldProposal(value: string, confidence: number, method: InventoryOpeningFieldProposal["method"], warnings: string[] = []): InventoryOpeningFieldProposal {
  return {
    value: value.trim(),
    confidence: Math.max(0, Math.min(1, confidence)),
    method,
    warnings,
  };
}

export function analyzeInventoryImageGroupFallback(images: InventoryOpeningImageMetadata[]): InventoryOpeningDraftLine {
  const filenameText = images.map((image) => image.safeName.replace(/\.[a-z0-9]+$/i, "")).join(" ");
  const detectedName = normalizeInventoryText(filenameText).replace(/\b(img|image|foto|jpeg|jpg|png|webp)\b/g, " ").replace(/\s+/g, " ").trim();
  const allGenericCameraNames = images.every((image) => isGenericCameraFilename(image.safeName));
  const proposedName = !allGenericCameraNames && detectedName.length >= 4
    ? fieldProposal(detectedName.toUpperCase(), 0.25, "filename", ["Propuesta basada solo en nombre de archivo."])
    : undefined;
  const issues = [
    "Identificación visual/OCR no configurada en este entorno.",
    "Cantidad pendiente de revisión humana.",
    "No se inventan lote, proveedor, EAN ni caducidad.",
  ];

  return {
    detected: {
      productName: proposedName,
    },
    proposed: {
      productName: proposedName,
    },
    confirmed: {
      units: null,
      totalQuantity: null,
      unit: null,
    },
    status: proposedName ? "needs_review" : "pending_identification",
    identificationMethod: proposedName ? "filename" : "fallback",
    traceabilityStatus: "unavailable",
    confidence: proposedName?.confidence || 0,
    issues,
    imageIndexes: images.map((_, index) => index),
  };
}

function normalizedCandidateText(value: string | null | undefined) {
  return normalizeInventoryText(value || "");
}

function eanMatches(input: string | undefined, candidate: { ean?: string | null; gtin?: string | null }) {
  if (!input) return false;
  const normalized = input.replace(/\D/g, "");
  return Boolean(normalized && [candidate.ean, candidate.gtin].some((value) => String(value || "").replace(/\D/g, "") === normalized));
}

export function proposeCatalogMatches(input: {
  ean?: string;
  productName?: string;
  format?: string;
  catalog: InventoryOpeningCatalogCandidate[];
}): InventoryOpeningMatchProposal[] {
  const normalizedName = normalizeInventoryText(`${input.productName || ""} ${input.format || ""}`);
  const proposals: Array<InventoryOpeningMatchProposal | null> = input.catalog
    .map((candidate): InventoryOpeningMatchProposal | null => {
      if (eanMatches(input.ean, candidate)) {
        return {
          targetType: "product" as const,
          targetId: candidate.id,
          label: candidate.name,
          confidence: 0.98,
          method: "ean" as const,
          reasons: ["EAN/GTIN coincide exactamente."],
          requiresReview: false,
        };
      }

      const candidateText = normalizeInventoryText(`${candidate.name} ${candidate.brand || ""} ${candidate.format || ""}`);
      if (normalizedName && candidateText === normalizedName) {
        return {
          targetType: "product" as const,
          targetId: candidate.id,
          label: candidate.name,
          confidence: 0.9,
          method: "exact_name_format" as const,
          reasons: ["Nombre y formato normalizados coinciden."],
          requiresReview: false,
        };
      }

      if (normalizedName && candidateText.includes(normalizedName)) {
        return {
          targetType: "product" as const,
          targetId: candidate.id,
          label: candidate.name,
          confidence: 0.58,
          method: "normalized_name" as const,
          reasons: ["Coincidencia parcial por nombre normalizado."],
          requiresReview: true,
        };
      }

      return null;
    })
  return proposals
    .filter((value): value is InventoryOpeningMatchProposal => value !== null)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
}

export function proposePurchaseMatches(input: {
  ean?: string;
  productName?: string;
  format?: string;
  beforeDate?: string;
  purchases: InventoryOpeningPurchaseCandidate[];
}): InventoryOpeningMatchProposal[] {
  const productName = normalizeInventoryText(`${input.productName || ""} ${input.format || ""}`);
  const cutoffTime = input.beforeDate ? new Date(`${input.beforeDate}T23:59:59.999Z`).getTime() : Number.POSITIVE_INFINITY;

  const proposals: Array<InventoryOpeningMatchProposal | null> = input.purchases
    .filter((purchase) => {
      if (!purchase.documentDate) return true;
      const time = new Date(`${purchase.documentDate}T00:00:00.000Z`).getTime();
      return Number.isNaN(time) || time <= cutoffTime;
    })
    .map((purchase): InventoryOpeningMatchProposal | null => {
      if (eanMatches(input.ean, purchase)) {
        return {
          targetType: "purchase_line" as const,
          targetId: purchase.id,
          label: [purchase.productName, purchase.documentNumber, purchase.supplierName].filter(Boolean).join(" · "),
          confidence: 0.96,
          method: "ean" as const,
          reasons: ["EAN/GTIN coincide con una línea de compra."],
          requiresReview: false,
        };
      }

      const purchaseText = normalizedCandidateText(purchase.productName);
      if (productName && purchaseText === productName) {
        return {
          targetType: "purchase_line" as const,
          targetId: purchase.id,
          label: [purchase.productName, purchase.documentNumber, purchase.supplierName].filter(Boolean).join(" · "),
          confidence: 0.82,
          method: "exact_name_format" as const,
          reasons: ["Nombre normalizado coincide con compra previa."],
          requiresReview: true,
        };
      }

      if (productName && purchaseText.includes(productName)) {
        return {
          targetType: "purchase_line" as const,
          targetId: purchase.id,
          label: [purchase.productName, purchase.documentNumber, purchase.supplierName].filter(Boolean).join(" · "),
          confidence: 0.52,
          method: "normalized_name" as const,
          reasons: ["Compra previa con coincidencia parcial de nombre."],
          requiresReview: true,
        };
      }

      return null;
    })
  return proposals
    .filter((value): value is InventoryOpeningMatchProposal => value !== null)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
}

export function canApproveOpeningSession(lines: Array<{ status: string; issues?: string[] }>) {
  const critical = lines.filter((line) => line.status === "conflict" || line.status === "pending_images" || line.status === "pending_identification");
  return {
    ok: critical.length === 0,
    blockingIssues: critical.map((line, index) => ({
      index,
      status: line.status,
      issues: line.issues || ["Línea pendiente de revisión crítica."],
    })),
  };
}

export function canApplyOpeningSession(session: { status: string; appliedAt?: string | null }) {
  if (session.appliedAt || session.status === "applied") return { ok: false as const, reason: "La sesión ya fue aplicada." };
  if (session.status !== "approved") return { ok: false as const, reason: "La sesión debe estar aprobada antes de aplicar ajustes." };
  return { ok: true as const };
}

export function markImageRelations(images: InventoryOpeningImageMetadata[]) {
  const byHash = new Map<string, number[]>();
  images.forEach((image, index) => {
    const rows = byHash.get(image.sha256) || [];
    rows.push(index);
    byHash.set(image.sha256, rows);
  });

  return images.map((image, index) => {
    const duplicates = byHash.get(image.sha256) || [];
    const relation: InventoryOpeningImageRelation = duplicates.length > 1 ? "exact_duplicate" : "needs_review";
    return {
      ...image,
      duplicateOfSha256: duplicates.length > 1 && duplicates[0] !== index ? image.sha256 : null,
      relation,
    };
  });
}
