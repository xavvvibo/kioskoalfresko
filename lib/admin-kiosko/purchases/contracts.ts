export type ProductClassification =
  | "food"
  | "beverage"
  | "alcohol"
  | "cleaning"
  | "packaging"
  | "equipment"
  | "service"
  | "other";

export type SupplierMaster = {
  id?: string;
  name: string;
  taxId?: string | null;
  phone?: string | null;
  email?: string | null;
  status?: string | null;
  healthRegister?: string | null;
  appcc?: string | null;
};

export type PurchaseDocument = {
  id?: string;
  uploadedDocumentId?: string | null;
  supplierId?: string | null;
  supplierName: string;
  supplierTaxId?: string | null;
  documentType: string;
  documentNumber?: string | null;
  documentDate?: string | null;
  taxableBase?: number | null;
  vatAmount?: number | null;
  totalAmount?: number | null;
  purchaseStatus?: "pending_review" | "reviewed" | "linked" | "rejected" | "archived";
  accountingCategory?: string | null;
};

export type PurchaseLine = {
  id?: string;
  purchaseDocumentId?: string | null;
  purchaseLineId?: string | null;
  productName: string;
  normalizedProductId?: string | null;
  quantity?: number | null;
  unit?: string | null;
  unitPrice?: number | null;
  taxableBase?: number | null;
  vatRate?: number | null;
  vatAmount?: number | null;
  totalAmount?: number | null;
  gtin?: string | null;
  ean?: string | null;
  batchNumber?: string | null;
  manufacturerLot?: string | null;
  expiryDate?: string | null;
  originCountry?: string | null;
  classification?: ProductClassification;
  productFamily?: string | null;
  accountingCategory?: string | null;
  storageTemperature?: string | null;
  defaultLocation?: string | null;
  requiresTraceability: boolean;
  requiresAppccReception: boolean;
  generatesInventoryLot: boolean;
};

export type ProductMasterCandidate = {
  id?: string;
  name: string;
  normalizedName: string;
  gtin?: string | null;
  ean?: string | null;
  classification: ProductClassification;
  productFamily?: string | null;
  accountingCategory?: string | null;
  confidence: number;
  matchReason?: "gtin" | "ean" | "name" | "similar_name" | "new_product";
};

export type PurchaseImportResult = {
  purchaseDocument?: PurchaseDocument;
  lines: PurchaseLine[];
  createdSupplier?: SupplierMaster;
  createdProducts: ProductMasterCandidate[];
  pendingReview: PurchaseLine[];
  warnings: string[];
};

export type PurchaseTraceabilityLink = {
  purchaseDocumentId?: string | null;
  purchaseLineId?: string | null;
  supplierId?: string | null;
  uploadedDocumentId?: string | null;
  accountingDocumentId?: string | null;
  accountingItemId?: string | null;
  productId?: string | null;
  inventoryLotId?: string | null;
  goodsReceptionId?: string | null;
  labelRecordId?: string | null;
  batchNumber?: string | null;
  expiryDate?: string | null;
};

export type PurchaseDecision = {
  classification: ProductClassification;
  requiresTraceability: boolean;
  requiresAppccReception: boolean;
  generatesInventoryLot: boolean;
  requiresLabel: boolean;
  accountingCategory: string;
  productFamily: string;
  defaultLocation?: string;
  storageTemperature?: string;
};
