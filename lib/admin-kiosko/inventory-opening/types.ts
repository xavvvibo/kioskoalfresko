export type InventoryOpeningSessionStatus =
  | "draft"
  | "importing"
  | "reviewing"
  | "ready_for_approval"
  | "approved"
  | "applied"
  | "cancelled";

export type InventoryOpeningOrigin = "photo_zip" | "manual" | "mixed";

export type InventoryOpeningLineStatus =
  | "pending_images"
  | "pending_identification"
  | "proposed"
  | "needs_review"
  | "confirmed"
  | "excluded"
  | "conflict";

export type InventoryOpeningIdentificationMethod =
  | "barcode"
  | "exact_catalog_match"
  | "purchase_match"
  | "visual_match"
  | "filename"
  | "fallback"
  | "manual";

export type InventoryOpeningTraceabilityStatus = "complete" | "partial" | "unavailable";

export type InventoryOpeningImageRelation =
  | "exact_duplicate"
  | "probable_same_view"
  | "probable_same_product"
  | "probable_distinct_unit"
  | "needs_review";

export type InventoryOpeningFieldProposal = {
  value: string;
  confidence: number;
  evidenceImageId?: string;
  method: "manual" | "ocr" | "barcode" | "filename" | "catalog" | "purchase" | "fallback";
  warnings: string[];
};

export type InventoryOpeningImageMetadata = {
  originalName: string;
  safeName: string;
  orderIndex: number;
  sizeBytes: number;
  sha256: string;
  mimeType: string;
  extension: string;
  width: number | null;
  height: number | null;
  duplicateOfSha256?: string | null;
  relation: InventoryOpeningImageRelation;
  warnings: string[];
};

export type InventoryOpeningImageGroup = {
  groupKey: string;
  relation: InventoryOpeningImageRelation;
  imageIndexes: number[];
  reason: string;
  reviewRequired: boolean;
  suggestedUnits: number | null;
};

export type InventoryOpeningRecognition = {
  productName?: InventoryOpeningFieldProposal;
  brand?: InventoryOpeningFieldProposal;
  ean?: InventoryOpeningFieldProposal;
  netWeight?: InventoryOpeningFieldProposal;
  unit?: InventoryOpeningFieldProposal;
  manufacturerLot?: InventoryOpeningFieldProposal;
  expiryDate?: InventoryOpeningFieldProposal;
  bestBeforeDate?: InventoryOpeningFieldProposal;
  storageTemperature?: InventoryOpeningFieldProposal;
  visibleText?: InventoryOpeningFieldProposal;
};

export type InventoryOpeningCatalogCandidate = {
  id: string;
  name: string;
  ean?: string | null;
  gtin?: string | null;
  brand?: string | null;
  format?: string | null;
};

export type InventoryOpeningPurchaseCandidate = {
  id: string;
  purchaseDocumentId?: string | null;
  productName: string;
  ean?: string | null;
  gtin?: string | null;
  supplierName?: string | null;
  documentNumber?: string | null;
  documentDate?: string | null;
  quantity?: number | null;
  unit?: string | null;
  manufacturerLot?: string | null;
  expiryDate?: string | null;
};

export type InventoryOpeningMatchProposal = {
  targetType: "product" | "supplier" | "purchase_line" | "purchase_document";
  targetId: string;
  label: string;
  confidence: number;
  method: "ean" | "exact_name_format" | "normalized_name" | "purchase_proximity" | "manual";
  reasons: string[];
  requiresReview: boolean;
};

export type InventoryOpeningDraftLine = {
  detected: Record<string, InventoryOpeningFieldProposal | undefined>;
  proposed: Record<string, InventoryOpeningFieldProposal | undefined>;
  confirmed: Record<string, string | number | null | undefined>;
  status: InventoryOpeningLineStatus;
  identificationMethod: InventoryOpeningIdentificationMethod;
  traceabilityStatus: InventoryOpeningTraceabilityStatus;
  confidence: number;
  issues: string[];
  imageIndexes: number[];
};

export type InventoryOpeningDryRunReport = {
  sourceZip: string;
  generatedAt: string;
  totalEntries: number;
  validImages: number;
  skippedEntries: Array<{ path: string; reason: string }>;
  images: InventoryOpeningImageMetadata[];
  exactDuplicates: Array<{ sha256: string; imageIndexes: number[] }>;
  proposedGroups: InventoryOpeningImageGroup[];
  draftLines: InventoryOpeningDraftLine[];
  summary: {
    productsRecognized: number;
    eansFound: number;
    lotsFound: number;
    expiriesFound: number;
    pendingProducts: number;
    criticalIssues: number;
  };
};
