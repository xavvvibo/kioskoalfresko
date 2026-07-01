export type CaseType =
  | "purchase"
  | "production"
  | "sanitary_incident"
  | "inspection"
  | "maintenance"
  | "training"
  | "other";

export type CaseStatus = "open" | "in_review" | "closed" | "archived";

export type CaseEntityType =
  | "document"
  | "inventory_lot"
  | "product"
  | "production_batch"
  | "appcc_record"
  | "label"
  | "accounting_document"
  | "incident"
  | "audit_event";

export type CaseEntityRef = {
  type: CaseEntityType;
  id: string;
  label?: string;
};

export type AppccCaseFile = {
  id: string;
  type: CaseType;
  title: string;
  status: CaseStatus;
  openedAt: string;
  closedAt?: string;
  responsible?: string;
  entities: CaseEntityRef[];
};
