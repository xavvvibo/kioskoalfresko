import { evaluateTemperature, isActiveTemperatureEquipment, getTemperatureEquipment, temperatureEquipment } from "./temperature-rules";
import { getDocumentStats } from "./documents";

type DbResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

type CommonRecordInput = {
  record_date: string;
  record_time?: string;
  responsible?: string;
  status?: string;
  observations?: string;
  created_by?: string;
};

export type RecentAdminRecord = {
  id: string;
  record_date: string;
  record_time: string | null;
  responsible: string | null;
  status: string | null;
  main: string;
};

export type EquipmentAlert = {
  id: string;
  equipment: string;
  alert_date: string;
  alert_time: string | null;
  temperature: number | null;
  alert_level: string;
  status: "pendiente" | "en_proceso" | "solventado";
  description: string | null;
  corrective_action: string | null;
};

export type MonthlySignature = {
  id: string;
  year: number;
  month: number;
  signed_by: string;
  signed_at: string;
  signature_note: string | null;
  created_at: string;
};

export type DashboardTemperatureRecord = {
  id: string;
  equipment: string;
  record_date: string;
  record_time: string | null;
  temperature: number | null;
  status: string | null;
  responsible: string | null;
};

export type AdminDashboardSummary = {
  totalTemperatureRecords: number;
  todayTemperatureRecords: number;
  reviewingTemperatureRecords: number;
  incidentTemperatureRecords: number;
  activeEquipmentCount: number;
  todayCleaningRecords: number;
  todayGoodsReceptionRecords: number;
  latestFryerOilRecord: RecentAdminRecord | null;
  pendingAlerts: number;
  inProgressAlerts: number;
  resolvedAlertsThisMonth: number;
  openIncidents: number;
  latestChecklistOpening: RecentAdminRecord | null;
  latestChecklistClosing: RecentAdminRecord | null;
  latestMonthlySignature: MonthlySignature | null;
  lastTemperatureRecord: DashboardTemperatureRecord | null;
  latestByEquipment: DashboardTemperatureRecord[];
  openAlerts: EquipmentAlert[];
};

export type AppccRecordType = "temperaturas" | "limpieza" | "aceite-freidora" | "recepcion-mercancia" | "incidencias" | "checklists";

export type AppccRecordFilters = {
  type?: AppccRecordType | "todos";
  dateFrom?: string;
  dateTo?: string;
  equipment?: string;
  status?: string;
  responsible?: string;
  includeArchivedEquipment?: boolean;
};

export type AppccRecord = {
  id: string;
  type: AppccRecordType;
  typeLabel: string;
  record_date: string;
  record_time: string | null;
  subject: string;
  main: string;
  status: string | null;
  responsible: string | null;
  observations: string | null;
  signed_by?: string | null;
  signed_at?: string | null;
  signature_note?: string | null;
};

type SignatureFields = {
  signed_by?: string | null;
  signed_at?: string | null;
  signature_note?: string | null;
};

const HISTORICAL_SEED_OBSERVATION = "Registro histórico generado a partir de días de apertura.";
const DAILY_CONTROL_OBSERVATION = "Registro de control diario.";

function normalizeAppccObservation(observations: string | null) {
  if (!observations) {
    return observations;
  }

  return observations.includes(HISTORICAL_SEED_OBSERVATION)
    ? observations.replaceAll(HISTORICAL_SEED_OBSERVATION, DAILY_CONTROL_OBSERVATION)
    : observations;
}

export type MonthlyAppccReport = {
  year: number;
  month: number;
  periodLabel: string;
  generatedAt: string;
  records: AppccRecord[];
  temperatures: AppccRecord[];
  alerts: EquipmentAlert[];
  signature: MonthlySignature | null;
  summary: {
    totalRecords: number;
    correctRecords: number;
    reviewRecords: number;
    incidentRecords: number;
    pendingAlerts: number;
    inProgressAlerts: number;
    resolvedAlerts: number;
  };
};

type TemperatureRecordInput = CommonRecordInput & {
  equipment: string;
  temperature: number;
  status: string;
};

type CleaningRecordInput = CommonRecordInput & {
  area: string;
  shift?: string;
  cleaning_done?: boolean;
  products_used?: string;
};

type FryerOilRecordInput = CommonRecordInput & {
  fryer: string;
  oil_status: string;
  oil_changed?: boolean;
  polar_compounds?: string;
  color_smell_check?: string;
};

type GoodsReceptionRecordInput = CommonRecordInput & {
  supplier: string;
  product: string;
  delivery_temperature?: number;
  accepted?: boolean;
  batch_number?: string;
  expiry_date?: string;
};

type IncidentRecordInput = CommonRecordInput & {
  incident_type: string;
  severity?: string;
  corrective_action?: string;
  resolved?: boolean;
};

type ChecklistRecordInput = CommonRecordInput & {
  checklist_type: string;
  items?: string[];
  completed?: boolean;
};

type MonthlySignatureInput = {
  year: number;
  month: number;
  signed_by: string;
  signature_note?: string;
};

type InspectionRecordInput = {
  inspection_date: string;
  inspector?: string;
  organization?: string;
  result?: string;
  observations?: string;
  requirements?: string;
  deadline?: string;
  status?: string;
  actions_done?: string;
  responsible?: string;
  documentation?: string;
};

type SupplierRecordInput = {
  supplier: string;
  cif?: string;
  contact?: string;
  phone?: string;
  email?: string;
  responsible_person?: string;
  schedule?: string;
  usual_products?: string;
  category?: string;
  certificates?: string;
  health_register?: string;
  appcc?: string;
  invoices?: string;
  delivery_notes?: string;
  ocr_documents?: string;
  receptions?: string;
  incidents?: string;
  reception_temperatures?: string;
  ai_history?: string;
  observations?: string;
};

type EquipmentAssetInput = {
  name: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  purchase_date?: string;
  installation_date?: string;
  location?: string;
  last_maintenance?: string;
  next_maintenance?: string;
  fault_history?: string;
  status?: string;
};

type MaintenanceRecordInput = {
  record_date: string;
  equipment?: string;
  intervention?: string;
  company?: string;
  invoice?: string;
  observations?: string;
  responsible?: string;
};

type WaterRecordInput = {
  record_date: string;
  color?: string;
  smell?: string;
  taste?: string;
  chlorine?: string;
  observations?: string;
  responsible?: string;
};

type AnnualVerificationInput = {
  record_date: string;
  appcc_reviewed?: boolean;
  health_memory_reviewed?: boolean;
  allergens_reviewed?: boolean;
  suppliers_reviewed?: boolean;
  cleaning_products_reviewed?: boolean;
  equipment_reviewed?: boolean;
  handler_training?: boolean;
  documentation_complete?: boolean;
  observations?: string;
  responsible?: string;
};

export type AiSupplierDocumentInput = {
  document_type?: string;
  document_number?: string;
  document_date?: string;
  supplier_name?: string;
  supplier_tax_id?: string;
  total_amount?: number;
  original_filename?: string;
  ocr_status?: string;
  ocr_json?: unknown;
  reviewed_by?: string;
};

export type AiTraceabilityItemInput = {
  supplier_document_id: string;
  product_name?: string;
  quantity?: string;
  batch_number?: string;
  expiry_date?: string;
  storage_type?: string;
  accepted?: boolean;
  observations?: string;
};

export type AiProcessingLogInput = {
  document_name?: string;
  detected_type?: string;
  status?: string;
  summary?: string;
  raw_json?: unknown;
  error_message?: string;
};

export type AiProcessingLog = {
  id: string;
  created_at: string;
  document_name: string | null;
  detected_type: string | null;
  status: string | null;
  summary: string | null;
  error_message: string | null;
};

export type AiSupplierDocument = {
  id: string;
  created_at: string;
  document_type: string | null;
  document_number: string | null;
  document_date: string | null;
  supplier_name: string | null;
  ocr_status: string | null;
};

export type InventoryProduct = {
  id: string;
  created_at: string;
  updated_at: string | null;
  name: string;
  category: string | null;
  usual_supplier: string | null;
  unit: string | null;
  current_stock: number | null;
  minimum_stock: number | null;
  recommended_stock: number | null;
  average_purchase_price: number | null;
  last_purchase_price: number | null;
  location: string | null;
  current_batch: string | null;
  expiry_date: string | null;
  last_entry_date: string | null;
  last_exit_date: string | null;
  observations: string | null;
  active: boolean;
};

export type InventoryProductInput = {
  id?: string;
  name: string;
  category?: string;
  usual_supplier?: string;
  unit?: string;
  current_stock?: number;
  minimum_stock?: number;
  recommended_stock?: number;
  average_purchase_price?: number;
  last_purchase_price?: number;
  location?: string;
  current_batch?: string;
  expiry_date?: string;
  observations?: string;
  active?: boolean;
};

export type InventoryMovementInput = {
  product_id: string;
  movement_type: "entrada" | "consumo" | "merma" | "regularizacion" | "baja" | "edicion";
  quantity?: number;
  unit?: string;
  purchase_price?: number;
  supplier?: string;
  batch_number?: string;
  expiry_date?: string;
  observations?: string;
};

export type InventoryMovement = {
  id: string;
  created_at: string;
  product_id: string | null;
  movement_type: string;
  quantity: number | null;
  unit: string | null;
  purchase_price: number | null;
  supplier: string | null;
  batch_number: string | null;
  expiry_date: string | null;
  source_document_id: string | null;
  observations: string | null;
  source: string | null;
  admin_inventory_products?: {
    id: string;
    name: string;
    current_stock: number | null;
    unit: string | null;
  } | null;
};

export type InventoryReceptionInput = {
  name: string;
  quantity?: string;
  supplier?: string;
  batch?: string;
  expiry?: string;
  purchasePrice?: number;
  location?: string;
  entryDate: string;
  documentId?: string;
};

export type TraceabilityRow = {
  id: string;
  created_at: string;
  product_name: string | null;
  quantity: string | null;
  batch_number: string | null;
  expiry_date: string | null;
  accepted: boolean | null;
  observations: string | null;
  supplier_document_id: string | null;
  admin_supplier_documents: {
    id: string;
    supplier_name: string | null;
    supplier_tax_id: string | null;
    document_type: string | null;
    document_number: string | null;
    document_date: string | null;
    original_filename: string | null;
    ocr_status: string | null;
  } | null;
  inventory_product?: InventoryProduct | null;
  inventory_movements?: InventoryMovement[];
  labels?: LabelRecord[];
  temperatures?: DashboardTemperatureRecord[];
  goods_receptions?: RecentAdminRecord[];
  incidents?: RecentAdminRecord[];
};

export type LabelRecordInput = {
  model: string;
  product?: string;
  batch?: string;
  supplier?: string;
  elaboration_date?: string;
  opening_date?: string;
  freezing_date?: string;
  defrosting_date?: string;
  best_before_date?: string;
  responsible?: string;
  print_format?: string;
  copies?: number;
  printed_at?: string;
  printer?: string;
  template?: string;
  zpl_version?: string;
};

export type LabelRecord = {
  id: string;
  created_at: string;
  model: string;
  product: string | null;
  batch: string | null;
  supplier: string | null;
  elaboration_date: string | null;
  opening_date: string | null;
  freezing_date: string | null;
  defrosting_date: string | null;
  best_before_date: string | null;
  responsible: string | null;
  print_format: string | null;
  copies: number | null;
  printed_at: string | null;
  printer: string | null;
  template: string | null;
  zpl_version: string | null;
  qr_payload: string | null;
};

export type ProductionBatchInput = {
  production_date: string;
  production_time?: string;
  responsible?: string;
  source_supplier?: string;
  source_product?: string;
  source_batch_number?: string;
  input_quantity?: number;
  input_unit?: string;
  output_product: string;
  output_quantity?: number;
  output_unit?: string;
  unit_weight?: number;
  storage_state?: string;
  expiry_date?: string;
  observations?: string;
  source_document_id?: string;
};

export type ProductionMovementInput = {
  batch_id: string;
  movement_date: string;
  movement_time?: string;
  movement_type: "produccion" | "congelacion" | "descongelacion" | "consumo" | "merma" | "personal" | "invitacion" | "degustacion" | "regularizacion";
  quantity?: number;
  unit?: string;
  from_state?: string;
  to_state?: string;
  reason?: string;
  responsible?: string;
  observations?: string;
  expiry_date?: string;
};

export type ProductionBatch = {
  id: string;
  created_at: string;
  production_date: string;
  production_time: string | null;
  responsible: string | null;
  batch_code: string | null;
  source_supplier: string | null;
  source_product: string | null;
  source_batch_number: string | null;
  input_quantity: number | null;
  input_unit: string | null;
  output_product: string | null;
  output_quantity: number | null;
  output_unit: string | null;
  unit_weight: number | null;
  storage_state: string | null;
  expiry_date: string | null;
  observations: string | null;
  source_document_id: string | null;
  source: string | null;
  movements?: ProductionMovement[];
  labels?: LabelRecord[];
};

export type ProductionMovement = {
  id: string;
  created_at: string;
  batch_id: string | null;
  movement_date: string;
  movement_time: string | null;
  movement_type: string | null;
  quantity: number | null;
  unit: string | null;
  from_state: string | null;
  to_state: string | null;
  reason: string | null;
  responsible: string | null;
  observations: string | null;
};

export type InternalRecipeInput = {
  id?: string;
  recipe_name: string;
  output_product: string;
  expected_yield?: number;
  output_unit?: string;
  unit_weight?: number;
  instructions?: string;
  input_product?: string;
  input_quantity?: number;
  input_unit?: string;
  active?: boolean;
};

export type InternalRecipe = {
  id: string;
  created_at: string;
  recipe_name: string;
  output_product: string;
  expected_yield: number | null;
  output_unit: string | null;
  unit_weight: number | null;
  instructions: string | null;
  active: boolean;
  inputs?: Array<{
    id: string;
    input_product: string;
    quantity: number | null;
    unit: string | null;
  }>;
};

export type SupplierProfile = {
  id: string;
  supplier: string;
  cif: string | null;
  phone: string | null;
  email: string | null;
  category: string | null;
  status: string | null;
  documents: AiSupplierDocument[];
  receptions: RecentAdminRecord[];
  incidents: RecentAdminRecord[];
  products: InventoryProduct[];
};

export type GlobalSearchResult = {
  type: string;
  title: string;
  detail: string;
  href: string;
  date?: string;
};

export type OperationalAlert = {
  id: string;
  type: "correcto" | "registro-diario" | "documentacion" | "administrativo" | "stock" | "caducidad" | "incidencia" | "temperatura" | "equipo" | "recepcion";
  severity: "correcto" | "revisar" | "incidencia";
  title: string;
  detail: string;
  href: string;
};

export type ExecutiveDashboardMetrics = {
  receptionsThisMonth: number;
  ocrProcessed: number;
  activeProducts: number;
  activeLots: number;
  expiringProducts: number;
  openIncidents: number;
  outOfRangeEquipment: number;
  temperaturesToday: number;
  recordsToday: number;
  recordsWeek: number;
  recordsMonth: number;
  pendingDocuments: number;
  lowStockProducts: number;
  criticalStockProducts: number;
  pendingMaintenance: number;
  waterToday: number;
  ocrToReview: number;
  rejectedReceptions: number;
  activeInternalBatches: number;
  openDefrostedBatches: number;
  productsToConsumeSoon: number;
  expiredDefrostedBatches: number;
  monthlyWasteMovements: number;
  recentProductions: ProductionBatch[];
  temperatureCompliancePercent: number;
  receptionCompliancePercent: number;
  cleaningCompliancePercent: number;
  latestInspection: string;
  healthStatus: "Correcto" | "Revisar" | "Incidencias";
  alerts: OperationalAlert[];
  dailyPending: OperationalAlert[];
};

function getSupabaseConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  };
}

function hasRequiredText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function cleanText(value: string | undefined) {
  return value?.trim() || undefined;
}

function getMadridDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function firstDayOfMonth(date: string) {
  return `${date.slice(0, 7)}-01`;
}

function startOfWeek(date: string) {
  const value = new Date(`${date}T00:00:00.000Z`);
  const day = value.getUTCDay() || 7;
  value.setUTCDate(value.getUTCDate() - day + 1);
  return value.toISOString().slice(0, 10);
}

function parseQuantity(value?: string) {
  if (!value) return undefined;
  const match = value.replace(",", ".").match(/-?\d+(\.\d+)?/);
  const number = match ? Number(match[0]) : undefined;
  return Number.isFinite(number) ? number : undefined;
}

function normalizeNumber(value: number | undefined, fallback = 0) {
  return Number.isFinite(value) ? Number(value) : fallback;
}

function stockAfterMovement(type: InventoryMovementInput["movement_type"], quantity: number, currentStock: number) {
  if (type === "consumo" || type === "merma") return Math.max(0, currentStock - Math.abs(quantity));
  if (type === "regularizacion") return Math.max(0, quantity);
  if (type === "baja") return 0;
  return Math.max(0, currentStock + Math.abs(quantity));
}

function getMadridDateTime() {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
}

function getMadridMonthParts() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  return {
    year: Number(parts.find((part) => part.type === "year")?.value || new Date().getFullYear()),
    month: Number(parts.find((part) => part.type === "month")?.value || new Date().getMonth() + 1),
  };
}

function getMonthRange(year: number, month: number) {
  const safeMonth = Math.min(Math.max(month, 1), 12);
  const start = `${year}-${String(safeMonth).padStart(2, "0")}-01`;
  const endDate = new Date(Date.UTC(year, safeMonth, 1));
  const end = `${endDate.getUTCFullYear()}-${String(endDate.getUTCMonth() + 1).padStart(2, "0")}-01`;

  return { start, end };
}

function getPeriodLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function assertSupabaseConfig() {
  const config = getSupabaseConfig();

  if (!config.url || !config.serviceRoleKey) {
    return { ok: false as const, error: "Supabase no está configurado." };
  }

  return { ok: true as const, config };
}

async function supabaseRequest<T>(table: string, init: RequestInit & { query?: string }): Promise<DbResult<T>> {
  const configResult = assertSupabaseConfig();

  if (!configResult.ok) {
    return configResult;
  }

  try {
    const response = await fetch(`${configResult.config.url}/rest/v1/${table}${init.query || ""}`, {
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
        // Supabase sometimes returns plain text or an empty body for infrastructure errors.
      }

      console.error("[admin-kiosko] Supabase request failed", {
        table,
        status: response.status,
        error,
      });

      return { ok: false, error };
    }

    if (response.status === 204 || !responseText) {
      return { ok: true, data: undefined as T };
    }

    return { ok: true, data: JSON.parse(responseText) as T };
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se ha podido conectar con Supabase.";
    console.error("[admin-kiosko] Supabase request exception", {
      table,
      error: message,
    });
    return { ok: false, error: message };
  }
}

async function insertRecord(table: string, payload: Record<string, unknown>) {
  return supabaseRequest<undefined>(table, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      Prefer: "return=minimal",
    },
  });
}

async function insertRecordReturning<T>(table: string, payload: Record<string, unknown>, select = "*") {
  return supabaseRequest<T[]>(table, {
    method: "POST",
    query: `?select=${select}`,
    body: JSON.stringify(payload),
    headers: {
      Prefer: "return=representation",
    },
  });
}

async function patchRecord(table: string, id: string, payload: Record<string, unknown>) {
  return supabaseRequest<undefined>(table, {
    method: "PATCH",
    query: `?id=eq.${encodeURIComponent(id)}`,
    body: JSON.stringify(payload),
    headers: {
      Prefer: "return=minimal",
    },
  });
}

async function getRecentRows<T>(table: string, select: string) {
  return supabaseRequest<T[]>(
    table,
    {
      method: "GET",
      query: `?select=${select}&order=created_at.desc&limit=10`,
    },
  );
}

async function getRows<T>(table: string, query: string) {
  return supabaseRequest<T[]>(table, {
    method: "GET",
    query,
  });
}

function commonRecordQuery(filters: AppccRecordFilters, select: string) {
  const params = [`select=${select}`];

  if (filters.dateFrom) {
    params.push(`record_date=gte.${encodeURIComponent(filters.dateFrom)}`);
  }

  if (filters.dateTo) {
    params.push(`record_date=lte.${encodeURIComponent(filters.dateTo)}`);
  }

  if (filters.status) {
    params.push(`status=eq.${encodeURIComponent(filters.status)}`);
  }

  if (filters.responsible) {
    params.push(`responsible=ilike.*${encodeURIComponent(filters.responsible)}*`);
  }

  params.push("order=record_date.desc,record_time.desc,created_at.desc");
  params.push("limit=500");

  return `?${params.join("&")}`;
}

function matchesEquipmentFilter(record: AppccRecord, equipment?: string) {
  if (!equipment) {
    return true;
  }

  const needle = equipment.toLowerCase();
  return `${record.subject} ${record.main}`.toLowerCase().includes(needle);
}

function shouldIncludeTemperatureRecord(record: AppccRecord, includeArchivedEquipment?: boolean) {
  if (record.type !== "temperaturas") {
    return true;
  }

  if (includeArchivedEquipment) {
    return true;
  }

  return isActiveTemperatureEquipment(record.subject);
}

function isActiveAlert(alert: EquipmentAlert) {
  return isActiveTemperatureEquipment(alert.equipment);
}

function basePayload(data: CommonRecordInput) {
  return {
    record_date: data.record_date,
    record_time: cleanText(data.record_time),
    responsible: cleanText(data.responsible),
    status: cleanText(data.status),
    observations: cleanText(data.observations),
    created_by: cleanText(data.created_by || data.responsible),
    source: "admin-kiosko",
  };
}

async function findDuplicateTemperatureRecord(data: TemperatureRecordInput) {
  const responsibleFilter = data.responsible
    ? `&responsible=eq.${encodeURIComponent(data.responsible.trim())}`
    : "";
  return supabaseRequest<Array<{ id: string }>>("admin_temperature_records", {
    method: "GET",
    query: `?select=id&record_date=eq.${encodeURIComponent(data.record_date)}&record_time=eq.${encodeURIComponent(data.record_time || "")}&equipment=eq.${encodeURIComponent(data.equipment.trim())}&temperature=eq.${encodeURIComponent(String(data.temperature))}${responsibleFilter}&limit=1`,
  });
}

async function getOpenAlertForEquipment(equipment: string) {
  return supabaseRequest<Array<{ id: string; description: string | null }>>("admin_equipment_alerts", {
    method: "GET",
    query: `?select=id,description&equipment=eq.${encodeURIComponent(equipment)}&status=in.(pendiente,en_proceso)&order=created_at.asc&limit=1`,
  });
}

async function upsertEquipmentAlert(data: TemperatureRecordInput, alertLevel: "aviso" | "incidencia", description: string) {
  const existing = await getOpenAlertForEquipment(data.equipment.trim());

  if (!existing.ok) {
    return existing;
  }

  if (existing.data[0]) {
    return patchRecord("admin_equipment_alerts", existing.data[0].id, {
      temperature: data.temperature,
      alert_level: alertLevel,
      description: `${existing.data[0].description || "Seguimiento técnico pendiente."}\n${data.record_date} ${data.record_time || ""}: ${description}`,
    });
  }

  return insertRecord("admin_equipment_alerts", {
    equipment: data.equipment.trim(),
    alert_date: data.record_date,
    alert_time: cleanText(data.record_time),
    temperature: data.temperature,
    alert_level: alertLevel,
    status: "pendiente",
    description,
    source: "admin-kiosko",
  });
}

export async function createTemperatureRecord(data: TemperatureRecordInput) {
  if (!hasRequiredText(data.record_date) || !hasRequiredText(data.equipment) || !Number.isFinite(data.temperature) || !hasRequiredText(data.status)) {
    return { ok: false, error: "Faltan campos obligatorios." };
  }

  const equipment = getTemperatureEquipment(data.equipment);
  if (!equipment?.active) {
    return { ok: false, error: "Equipo no registrable. Selecciona un equipo activo del listado oficial." };
  }

  const evaluation = evaluateTemperature(data.equipment, data.temperature);
  const duplicate = await findDuplicateTemperatureRecord(data);

  if (!duplicate.ok) {
    return duplicate;
  }

  if (duplicate.data.length > 0) {
    return { ok: false, error: "Registro duplicado: ya existe una temperatura con el mismo equipo, fecha, hora, responsable y valor." };
  }

  const insert = await insertRecord("admin_temperature_records", {
    ...basePayload(data),
    status: evaluation.status,
    observations: cleanText([data.observations, evaluation.alertLevel ? `Seguimiento técnico pendiente: ${evaluation.message}` : ""].filter(Boolean).join("\n")),
    equipment: data.equipment.trim(),
    temperature: data.temperature,
  });

  if (!insert.ok) {
    return insert;
  }

  if (evaluation.alertLevel) {
    const alert = await upsertEquipmentAlert(data, evaluation.alertLevel, evaluation.message);

    if (!alert.ok) {
      return alert;
    }
  }

  return insert;
}

export async function createCleaningRecord(data: CleaningRecordInput) {
  if (!hasRequiredText(data.record_date) || !hasRequiredText(data.area)) {
    return { ok: false, error: "Faltan campos obligatorios." };
  }

  return insertRecord("admin_cleaning_records", {
    ...basePayload(data),
    area: data.area.trim(),
    shift: cleanText(data.shift),
    cleaning_done: Boolean(data.cleaning_done),
    products_used: cleanText(data.products_used),
  });
}

export async function createFryerOilRecord(data: FryerOilRecordInput) {
  if (!hasRequiredText(data.record_date) || !hasRequiredText(data.fryer) || !hasRequiredText(data.oil_status)) {
    return { ok: false, error: "Faltan campos obligatorios." };
  }

  return insertRecord("admin_fryer_oil_records", {
    ...basePayload(data),
    fryer: data.fryer.trim(),
    oil_status: data.oil_status.trim(),
    oil_changed: Boolean(data.oil_changed),
    polar_compounds: cleanText(data.polar_compounds),
    color_smell_check: cleanText(data.color_smell_check),
  });
}

export async function createGoodsReceptionRecord(data: GoodsReceptionRecordInput) {
  if (!hasRequiredText(data.record_date) || !hasRequiredText(data.supplier) || !hasRequiredText(data.product)) {
    return { ok: false, error: "Faltan campos obligatorios." };
  }

  return insertRecord("admin_goods_reception_records", {
    ...basePayload(data),
    supplier: data.supplier.trim(),
    product: data.product.trim(),
    delivery_temperature: data.delivery_temperature,
    accepted: data.accepted !== false,
    batch_number: cleanText(data.batch_number),
    expiry_date: cleanText(data.expiry_date),
  });
}

export async function createIncidentRecord(data: IncidentRecordInput) {
  if (!hasRequiredText(data.record_date) || !hasRequiredText(data.incident_type)) {
    return { ok: false, error: "Faltan campos obligatorios." };
  }

  return insertRecord("admin_incident_records", {
    ...basePayload(data),
    incident_type: data.incident_type.trim(),
    severity: cleanText(data.severity),
    corrective_action: cleanText(data.corrective_action),
    resolved: Boolean(data.resolved),
  });
}

export async function createChecklistRecord(data: ChecklistRecordInput) {
  if (!hasRequiredText(data.record_date) || !hasRequiredText(data.checklist_type)) {
    return { ok: false, error: "Faltan campos obligatorios." };
  }

  return insertRecord("admin_checklist_records", {
    ...basePayload(data),
    checklist_type: data.checklist_type.trim(),
    items: data.items || [],
    completed: Boolean(data.completed),
  });
}

export async function createMonthlySignature(data: MonthlySignatureInput) {
  if (!Number.isFinite(data.year) || !Number.isFinite(data.month) || !hasRequiredText(data.signed_by)) {
    return { ok: false, error: "Faltan campos obligatorios." };
  }

  const existing = await getMonthlySignature(data.year, data.month);
  if (!existing.ok) return existing;
  if (existing.data) {
    return { ok: false, error: "Este informe mensual ya está firmado." };
  }

  return insertRecord("admin_appcc_monthly_signatures", {
    year: data.year,
    month: data.month,
    signed_by: data.signed_by.trim(),
    signed_at: new Date().toISOString(),
    signature_note: cleanText(data.signature_note),
  });
}

export async function getMonthlySignature(year: number, month: number): Promise<DbResult<MonthlySignature | null>> {
  const result = await getRows<MonthlySignature>(
    "admin_appcc_monthly_signatures",
    `?select=id,year,month,signed_by,signed_at,signature_note,created_at&year=eq.${year}&month=eq.${month}&limit=1`,
  );

  if (!result.ok) return result;

  return { ok: true, data: result.data[0] || null };
}

export async function getLatestMonthlySignature(): Promise<DbResult<MonthlySignature | null>> {
  const result = await getRows<MonthlySignature>(
    "admin_appcc_monthly_signatures",
    "?select=id,year,month,signed_by,signed_at,signature_note,created_at&order=year.desc,month.desc,created_at.desc&limit=1",
  );

  if (!result.ok) return result;

  return { ok: true, data: result.data[0] || null };
}

export async function createInspectionRecord(data: InspectionRecordInput) {
  if (!hasRequiredText(data.inspection_date)) {
    return { ok: false, error: "La fecha de inspección es obligatoria." };
  }

  return insertRecord("admin_inspection_records", {
    inspection_date: data.inspection_date,
    inspector: cleanText(data.inspector),
    organization: cleanText(data.organization),
    result: cleanText(data.result),
    observations: cleanText(data.observations),
    requirements: cleanText(data.requirements),
    deadline: cleanText(data.deadline),
    status: cleanText(data.status) || "pendiente",
    actions_done: cleanText(data.actions_done),
    responsible: cleanText(data.responsible),
    documentation: cleanText(data.documentation),
  });
}

export async function createSupplierRecord(data: SupplierRecordInput) {
  if (!hasRequiredText(data.supplier)) {
    return { ok: false, error: "El proveedor es obligatorio." };
  }

  return insertRecord("admin_supplier_records", {
    supplier: data.supplier.trim(),
    cif: cleanText(data.cif),
    contact: cleanText(data.contact),
    phone: cleanText(data.phone),
    email: cleanText(data.email),
    responsible_person: cleanText(data.responsible_person),
    schedule: cleanText(data.schedule),
    usual_products: cleanText(data.usual_products),
    category: cleanText(data.category),
    certificates: cleanText(data.certificates),
    health_register: cleanText(data.health_register),
    appcc: cleanText(data.appcc),
    invoices: cleanText(data.invoices),
    delivery_notes: cleanText(data.delivery_notes),
    ocr_documents: cleanText(data.ocr_documents),
    receptions: cleanText(data.receptions),
    incidents: cleanText(data.incidents),
    reception_temperatures: cleanText(data.reception_temperatures),
    ai_history: cleanText(data.ai_history),
    observations: cleanText(data.observations),
  });
}

async function findSupplierByName(supplier: string) {
  return getRows<{ id: string; supplier: string }>(
    "admin_supplier_records",
    `?select=id,supplier&supplier=ilike.${encodeURIComponent(supplier.trim())}&limit=1`,
  );
}

export async function ensureSupplierRecord(data: SupplierRecordInput) {
  if (!hasRequiredText(data.supplier)) {
    return { ok: true, data: null };
  }

  const existing = await findSupplierByName(data.supplier);

  if (!existing.ok) {
    return { ok: true, data: null };
  }

  if (existing.data[0]) {
    return { ok: true, data: existing.data[0] };
  }

  const created = await insertRecordReturning<{ id: string; supplier: string }>("admin_supplier_records", {
    supplier: data.supplier.trim(),
    cif: cleanText(data.cif),
    category: cleanText(data.category) || "Proveedor IA",
    observations: cleanText(data.observations),
  }, "id,supplier");

  if (!created.ok) {
    return { ok: true, data: null };
  }

  return { ok: true, data: created.data[0] || null };
}

export async function createAiSupplierDocument(data: AiSupplierDocumentInput) {
  const inserted = await insertRecordReturning<{ id: string }>("admin_supplier_documents", {
    document_type: cleanText(data.document_type),
    document_number: cleanText(data.document_number),
    document_date: cleanText(data.document_date),
    supplier_name: cleanText(data.supplier_name),
    supplier_tax_id: cleanText(data.supplier_tax_id),
    total_amount: data.total_amount,
    original_filename: cleanText(data.original_filename),
    ocr_status: cleanText(data.ocr_status) || "reviewed",
    ocr_json: data.ocr_json || {},
    reviewed_by: cleanText(data.reviewed_by),
    reviewed_at: new Date().toISOString(),
    source: "admin-kiosko-ai",
  }, "id");

  if (!inserted.ok) return inserted;

  return { ok: true as const, data: inserted.data[0] };
}

export async function createAiTraceabilityItem(data: AiTraceabilityItemInput) {
  if (!hasRequiredText(data.supplier_document_id)) {
    return { ok: false, error: "Falta documento asociado." };
  }

  return insertRecord("admin_traceability_items", {
    supplier_document_id: data.supplier_document_id,
    product_name: cleanText(data.product_name),
    quantity: cleanText(data.quantity),
    batch_number: cleanText(data.batch_number),
    expiry_date: cleanText(data.expiry_date),
    storage_type: cleanText(data.storage_type),
    accepted: data.accepted !== false,
    observations: cleanText(data.observations),
  });
}

export async function createAiProcessingLog(data: AiProcessingLogInput) {
  return insertRecord("admin_ai_processing_logs", {
    document_name: cleanText(data.document_name),
    detected_type: cleanText(data.detected_type),
    status: cleanText(data.status),
    summary: cleanText(data.summary),
    raw_json: data.raw_json || {},
    error_message: cleanText(data.error_message),
  });
}

const inventorySelect = "id,created_at,updated_at,name,category,usual_supplier,unit,current_stock,minimum_stock,recommended_stock,average_purchase_price,last_purchase_price,location,current_batch,expiry_date,last_entry_date,last_exit_date,observations,active";

export async function getInventoryProducts(filters?: { q?: string; status?: string; stock?: string; expiry?: string }): Promise<DbResult<InventoryProduct[]>> {
  const result = await getRows<InventoryProduct>(
    "admin_inventory_products",
    `?select=${inventorySelect}&order=active.desc,name.asc&limit=500`,
  );

  if (!result.ok) return result;

  const today = getMadridDate();
  const soon = addDays(today, 7);
  const q = filters?.q?.trim().toLowerCase();
  const rows = result.data
    .filter((product) => {
      if (!q) return true;
      return [product.name, product.category, product.usual_supplier, product.current_batch, product.location]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    })
    .filter((product) => {
      if (!filters?.status || filters.status === "todos") return true;
      if (filters.status === "activos") return product.active;
      if (filters.status === "inactivos") return !product.active;
      return true;
    })
    .filter((product) => {
      if (!filters?.stock || filters.stock === "todos") return true;
      const stock = Number(product.current_stock || 0);
      const minimum = Number(product.minimum_stock || 0);
      if (filters.stock === "bajo") return product.active && stock <= minimum;
      if (filters.stock === "sin_stock") return product.active && stock <= 0;
      return true;
    })
    .filter((product) => {
      if (!filters?.expiry || filters.expiry === "todos") return true;
      if (filters.expiry === "caducados") return product.active && Boolean(product.expiry_date && product.expiry_date < today);
      if (filters.expiry === "proximos") return product.active && Boolean(product.expiry_date && product.expiry_date >= today && product.expiry_date <= soon);
      if (filters.expiry === "sin_caducidad") return product.active && !product.expiry_date;
      return true;
    });

  return { ok: true, data: rows };
}

async function findInventoryProductByName(name: string) {
  return getRows<InventoryProduct>(
    "admin_inventory_products",
    `?select=${inventorySelect}&name=ilike.${encodeURIComponent(name.trim())}&limit=1`,
  );
}

export async function getInventoryProductById(id: string): Promise<DbResult<InventoryProduct | null>> {
  if (!hasRequiredText(id)) return { ok: true, data: null };

  const result = await getRows<InventoryProduct>(
    "admin_inventory_products",
    `?select=${inventorySelect}&id=eq.${encodeURIComponent(id)}&limit=1`,
  );

  if (!result.ok) return result;
  return { ok: true, data: result.data[0] || null };
}

export async function createInventoryProduct(data: InventoryProductInput) {
  if (!hasRequiredText(data.name)) {
    return { ok: false, error: "El producto es obligatorio." };
  }

  const inserted = await insertRecordReturning<{ id: string }>("admin_inventory_products", {
    name: data.name.trim(),
    category: cleanText(data.category),
    usual_supplier: cleanText(data.usual_supplier),
    unit: cleanText(data.unit) || "ud",
    current_stock: normalizeNumber(data.current_stock),
    minimum_stock: normalizeNumber(data.minimum_stock),
    recommended_stock: normalizeNumber(data.recommended_stock),
    average_purchase_price: normalizeNumber(data.average_purchase_price),
    last_purchase_price: normalizeNumber(data.last_purchase_price),
    location: cleanText(data.location),
    current_batch: cleanText(data.current_batch),
    expiry_date: cleanText(data.expiry_date),
    last_entry_date: normalizeNumber(data.current_stock) > 0 ? getMadridDate() : undefined,
    observations: cleanText(data.observations),
    active: data.active !== false,
  }, "id");

  if (!inserted.ok) return inserted;
  const productId = inserted.data[0]?.id;

  if (productId && normalizeNumber(data.current_stock) > 0) {
    await insertInventoryMovement({
      product_id: productId,
      movement_type: "entrada",
      quantity: normalizeNumber(data.current_stock),
      unit: cleanText(data.unit) || "ud",
      purchase_price: normalizeNumber(data.last_purchase_price),
      supplier: data.usual_supplier,
      batch_number: data.current_batch,
      expiry_date: data.expiry_date,
      observations: "Alta manual de producto.",
    });
  }

  return { ok: true as const, data: productId ? { id: productId } : null };
}

export async function updateInventoryProduct(data: InventoryProductInput) {
  if (!hasRequiredText(data.id) || !hasRequiredText(data.name)) {
    return { ok: false, error: "Faltan campos obligatorios." };
  }

  const result = await patchRecord("admin_inventory_products", data.id as string, {
    updated_at: new Date().toISOString(),
    name: data.name.trim(),
    category: cleanText(data.category),
    usual_supplier: cleanText(data.usual_supplier),
    unit: cleanText(data.unit) || "ud",
    current_stock: normalizeNumber(data.current_stock),
    minimum_stock: normalizeNumber(data.minimum_stock),
    recommended_stock: normalizeNumber(data.recommended_stock),
    average_purchase_price: normalizeNumber(data.average_purchase_price),
    last_purchase_price: normalizeNumber(data.last_purchase_price),
    location: cleanText(data.location),
    current_batch: cleanText(data.current_batch),
    expiry_date: cleanText(data.expiry_date),
    observations: cleanText(data.observations),
    active: data.active !== false,
  });

  if (!result.ok) return result;

  await insertInventoryMovement({
    product_id: data.id as string,
    movement_type: "edicion",
    quantity: 0,
    unit: cleanText(data.unit) || "ud",
    purchase_price: normalizeNumber(data.last_purchase_price),
    supplier: data.usual_supplier,
    batch_number: data.current_batch,
    expiry_date: data.expiry_date,
    observations: "Ficha de inventario actualizada.",
  });

  return result;
}

export async function insertInventoryMovement(data: InventoryMovementInput) {
  if (!hasRequiredText(data.product_id) || !hasRequiredText(data.movement_type)) {
    return { ok: false, error: "Falta producto o tipo de movimiento." };
  }

  return insertRecord("admin_inventory_movements", {
    product_id: data.product_id,
    movement_type: data.movement_type,
    quantity: normalizeNumber(data.quantity),
    unit: cleanText(data.unit) || "ud",
    purchase_price: normalizeNumber(data.purchase_price),
    supplier: cleanText(data.supplier),
    batch_number: cleanText(data.batch_number),
    expiry_date: cleanText(data.expiry_date),
    observations: cleanText(data.observations),
    source: "admin-kiosko",
  });
}

export async function applyInventoryMovement(data: InventoryMovementInput) {
  const product = await getInventoryProductById(data.product_id);
  if (!product.ok) return product;
  if (!product.data) return { ok: false, error: "Producto no localizado." };

  const quantity = normalizeNumber(data.quantity);
  const currentStock = Number(product.data.current_stock || 0);
  const nextStock = stockAfterMovement(data.movement_type, quantity, currentStock);
  const today = getMadridDate();
  const movement = await insertInventoryMovement({
    ...data,
    quantity,
    unit: data.unit || product.data.unit || "ud",
    purchase_price: data.purchase_price || product.data.last_purchase_price || undefined,
    supplier: data.supplier || product.data.usual_supplier || undefined,
    batch_number: data.batch_number || product.data.current_batch || undefined,
    expiry_date: data.expiry_date || product.data.expiry_date || undefined,
  });

  if (!movement.ok) return movement;

  return patchRecord("admin_inventory_products", data.product_id, {
    updated_at: new Date().toISOString(),
    current_stock: nextStock,
    usual_supplier: cleanText(data.supplier) || product.data.usual_supplier,
    last_purchase_price: data.purchase_price || product.data.last_purchase_price,
    average_purchase_price: data.purchase_price ? Number(((Number(product.data.average_purchase_price || data.purchase_price) + data.purchase_price) / 2).toFixed(2)) : product.data.average_purchase_price,
    current_batch: cleanText(data.batch_number) || product.data.current_batch,
    expiry_date: cleanText(data.expiry_date) || product.data.expiry_date,
    last_entry_date: data.movement_type === "entrada" ? today : product.data.last_entry_date,
    last_exit_date: ["consumo", "merma", "baja"].includes(data.movement_type) ? today : product.data.last_exit_date,
    active: data.movement_type === "baja" ? false : product.data.active,
  });
}

export async function getInventoryMovements(productId?: string): Promise<DbResult<InventoryMovement[]>> {
  const filters = [
    "select=id,created_at,product_id,movement_type,quantity,unit,purchase_price,supplier,batch_number,expiry_date,source_document_id,observations,source,admin_inventory_products(id,name,current_stock,unit)",
    "order=created_at.desc",
    "limit=300",
  ];

  if (productId) filters.push(`product_id=eq.${encodeURIComponent(productId)}`);

  return getRows<InventoryMovement>("admin_inventory_movements", `?${filters.join("&")}`);
}

export async function upsertInventoryFromAiReception(data: InventoryReceptionInput) {
  if (!hasRequiredText(data.name)) {
    return { ok: true as const, data: null };
  }

  const quantity = parseQuantity(data.quantity) || 0;
  const existing = await findInventoryProductByName(data.name);

  if (!existing.ok) return existing;

  let productId: string | undefined = existing.data[0]?.id;

  if (productId) {
    const product = existing.data[0];
    const updated = await patchRecord("admin_inventory_products", productId, {
      updated_at: new Date().toISOString(),
      usual_supplier: cleanText(data.supplier) || product.usual_supplier,
      current_stock: Number(product.current_stock || 0) + quantity,
      recommended_stock: Math.max(Number(product.recommended_stock || 0), quantity * 2),
      last_purchase_price: data.purchasePrice,
      average_purchase_price: data.purchasePrice ? Number(((Number(product.average_purchase_price || data.purchasePrice) + data.purchasePrice) / 2).toFixed(2)) : product.average_purchase_price,
      current_batch: cleanText(data.batch) || product.current_batch,
      expiry_date: cleanText(data.expiry) || product.expiry_date,
      location: cleanText(data.location) || product.location,
      last_entry_date: data.entryDate,
      active: true,
    });

    if (!updated.ok) return updated;
  } else {
    const inserted = await insertRecordReturning<{ id: string }>("admin_inventory_products", {
      name: data.name.trim(),
      usual_supplier: cleanText(data.supplier),
      unit: "ud",
      current_stock: quantity,
      minimum_stock: 0,
      recommended_stock: Math.max(quantity * 2, quantity),
      last_purchase_price: data.purchasePrice,
      average_purchase_price: data.purchasePrice,
      current_batch: cleanText(data.batch),
      expiry_date: cleanText(data.expiry),
      location: cleanText(data.location) || "Almacén",
      last_entry_date: data.entryDate,
      active: true,
      observations: "Creado desde recepción IA.",
    }, "id");

    if (!inserted.ok) return inserted;
    productId = inserted.data[0]?.id;
  }

  await insertRecord("admin_inventory_movements", {
    product_id: productId,
    movement_type: "entrada",
    quantity,
    unit: "ud",
    purchase_price: data.purchasePrice,
    supplier: cleanText(data.supplier),
    batch_number: cleanText(data.batch),
    expiry_date: cleanText(data.expiry),
    source_document_id: cleanText(data.documentId),
    observations: "Entrada registrada desde recepción IA.",
    source: "admin-kiosko-ai",
  });

  return { ok: true as const, data: productId ? { id: productId } : null };
}

export async function getTraceabilityRows(filters?: { q?: string; date?: string }): Promise<DbResult<TraceabilityRow[]>> {
  const params = [
    "select=id,created_at,product_name,quantity,batch_number,expiry_date,accepted,observations,supplier_document_id,admin_supplier_documents(id,supplier_name,supplier_tax_id,document_type,document_number,document_date,original_filename,ocr_status)",
    "order=created_at.desc",
    "limit=250",
  ];

  if (filters?.date) {
    params.push(`created_at=gte.${encodeURIComponent(filters.date)}`);
    params.push(`created_at=lt.${encodeURIComponent(addDays(filters.date, 1))}`);
  }

  const result = await getRows<TraceabilityRow>("admin_traceability_items", `?${params.join("&")}`);
  if (!result.ok) return result;

  const q = filters?.q?.trim().toLowerCase();
  const filteredRows = q
    ? result.data.filter((row) => [
        row.product_name,
        row.batch_number,
        row.expiry_date,
        row.admin_supplier_documents?.supplier_name,
        row.admin_supplier_documents?.document_number,
        row.admin_supplier_documents?.original_filename,
      ].filter(Boolean).join(" ").toLowerCase().includes(q))
    : result.data;

  const enrichedRows = await Promise.all(filteredRows.map(async (row) => {
    const [products, movements, labels, temperatures, receptions, incidents] = await Promise.all([
      row.product_name
        ? getRows<InventoryProduct>("admin_inventory_products", `?select=${inventorySelect}&name=ilike.${encodeURIComponent(row.product_name)}&limit=1`)
        : Promise.resolve({ ok: true as const, data: [] as InventoryProduct[] }),
      row.batch_number
        ? getRows<InventoryMovement>("admin_inventory_movements", `?select=id,created_at,product_id,movement_type,quantity,unit,purchase_price,supplier,batch_number,expiry_date,source_document_id,observations,source&batch_number=eq.${encodeURIComponent(row.batch_number)}&order=created_at.desc&limit=25`)
        : Promise.resolve({ ok: true as const, data: [] as InventoryMovement[] }),
      getLabelRecordsByBatch(row.batch_number || undefined),
      getRows<DashboardTemperatureRecord>("admin_temperature_records", "?select=id,equipment,record_date,record_time,temperature,status,responsible&order=record_date.desc,created_at.desc&limit=30"),
      row.batch_number || row.admin_supplier_documents?.supplier_name
        ? getRows<RecentAdminRecord & { supplier: string; product: string }>(
            "admin_goods_reception_records",
            `?select=id,record_date,record_time,responsible,status,supplier,product&or=(${[
              row.batch_number ? `batch_number.ilike.*${encodeURIComponent(row.batch_number)}*` : "",
              row.admin_supplier_documents?.supplier_name ? `supplier.ilike.*${encodeURIComponent(row.admin_supplier_documents.supplier_name)}*` : "",
            ].filter(Boolean).join(",")})&order=record_date.desc,created_at.desc&limit=10`,
          )
        : Promise.resolve({ ok: true as const, data: [] as Array<RecentAdminRecord & { supplier: string; product: string }> }),
      row.batch_number || row.product_name
        ? getRows<RecentAdminRecord & { incident_type: string; severity: string | null }>(
            "admin_incident_records",
            `?select=id,record_date,record_time,responsible,status,incident_type,severity&observations=ilike.*${encodeURIComponent(row.batch_number || row.product_name || "")}*&order=record_date.desc,created_at.desc&limit=10`,
          )
        : Promise.resolve({ ok: true as const, data: [] as Array<RecentAdminRecord & { incident_type: string; severity: string | null }> }),
    ]);

    return {
      ...row,
      inventory_product: products.ok ? products.data[0] || null : null,
      inventory_movements: movements.ok ? movements.data : [],
      labels: labels.ok ? labels.data : [],
      temperatures: temperatures.ok ? temperatures.data : [],
      goods_receptions: receptions.ok
        ? receptions.data.map((record) => ({
            ...record,
            main: `${record.supplier} · ${record.product}`,
          }))
        : [],
      incidents: incidents.ok
        ? incidents.data.map((record) => ({
            ...record,
            main: `${record.incident_type}${record.severity ? ` · ${record.severity}` : ""}`,
          }))
        : [],
    };
  }));

  return {
    ok: true,
    data: enrichedRows,
  };
}

function buildLabelQrPayload(data: LabelRecordInput) {
  return JSON.stringify({
    type: "appcc-label",
    model: data.model,
    product: cleanText(data.product),
    batch: cleanText(data.batch),
    supplier: cleanText(data.supplier),
    best_before_date: cleanText(data.best_before_date),
    responsible: cleanText(data.responsible),
  });
}

export async function createLabelRecord(data: LabelRecordInput) {
  if (!hasRequiredText(data.model)) {
    return { ok: false, error: "El modelo de etiqueta es obligatorio." };
  }

  return insertRecord("admin_label_records", {
    model: data.model.trim(),
    product: cleanText(data.product),
    batch: cleanText(data.batch),
    supplier: cleanText(data.supplier),
    elaboration_date: cleanText(data.elaboration_date),
    opening_date: cleanText(data.opening_date),
    freezing_date: cleanText(data.freezing_date),
    defrosting_date: cleanText(data.defrosting_date),
    best_before_date: cleanText(data.best_before_date),
    responsible: cleanText(data.responsible),
    print_format: cleanText(data.print_format) || "a4",
    copies: Math.max(1, Math.min(48, Math.round(normalizeNumber(data.copies, 8)))),
    printed_at: cleanText(data.printed_at),
    printer: cleanText(data.printer),
    template: cleanText(data.template),
    zpl_version: cleanText(data.zpl_version),
    qr_payload: buildLabelQrPayload(data),
  });
}

export async function getLabelRecords(limit = 25): Promise<DbResult<LabelRecord[]>> {
  return getRows<LabelRecord>(
    "admin_label_records",
    `?select=id,created_at,model,product,batch,supplier,elaboration_date,opening_date,freezing_date,defrosting_date,best_before_date,responsible,print_format,copies,printed_at,printer,template,zpl_version,qr_payload&order=created_at.desc&limit=${limit}`,
  );
}

export async function getLabelRecordsByBatch(batch?: string): Promise<DbResult<LabelRecord[]>> {
  if (!batch?.trim()) return { ok: true, data: [] };
  const safeBatch = batch.trim();
  return getRows<LabelRecord>(
    "admin_label_records",
    `?select=id,created_at,model,product,batch,supplier,elaboration_date,opening_date,freezing_date,defrosting_date,best_before_date,responsible,print_format,copies,printed_at,printer,template,zpl_version,qr_payload&batch=ilike.*${encodeURIComponent(safeBatch)}*&order=created_at.desc&limit=25`,
  );
}

function productionCodePrefix(product: string) {
  const normalized = product
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const firstWord = normalized[0] || "LOTE";
  return firstWord.slice(0, 8).toUpperCase();
}

async function generateProductionBatchCode(product: string, date: string) {
  const prefix = productionCodePrefix(product);
  const compactDate = date.replaceAll("-", "");
  const rows = await getRows<{ id: string }>(
    "admin_production_batches",
    `?select=id&batch_code=ilike.${encodeURIComponent(`${prefix}-${compactDate}-%`)}&limit=1000`,
  );
  const sequence = rows.ok ? rows.data.length + 1 : 1;
  return `${prefix}-${compactDate}-${String(sequence).padStart(3, "0")}`;
}

const productionBatchSelect = "id,created_at,production_date,production_time,responsible,batch_code,source_supplier,source_product,source_batch_number,input_quantity,input_unit,output_product,output_quantity,output_unit,unit_weight,storage_state,expiry_date,observations,source_document_id,source";
const productionMovementSelect = "id,created_at,batch_id,movement_date,movement_time,movement_type,quantity,unit,from_state,to_state,reason,responsible,observations";
const recipeSelect = "id,created_at,recipe_name,output_product,expected_yield,output_unit,unit_weight,instructions,active";

async function getProductionBatchById(id: string): Promise<DbResult<ProductionBatch | null>> {
  if (!hasRequiredText(id)) return { ok: true, data: null };
  const result = await getRows<ProductionBatch>(
    "admin_production_batches",
    `?select=${productionBatchSelect}&id=eq.${encodeURIComponent(id)}&limit=1`,
  );
  if (!result.ok) return result;
  return { ok: true, data: result.data[0] || null };
}

async function findInventoryProductByProductionName(name?: string | null) {
  if (!name?.trim()) return { ok: true as const, data: [] as InventoryProduct[] };
  return findInventoryProductByName(name);
}

async function upsertProductionOutputInventory(data: ProductionBatchInput, batchCode: string) {
  const existing = await findInventoryProductByProductionName(data.output_product);
  if (!existing.ok) return { ok: false as const, warning: existing.error };

  let productId: string | undefined = existing.data[0]?.id;
  if (!productId) {
    const created = await createInventoryProduct({
      name: data.output_product,
      category: "Elaboración interna",
      usual_supplier: "Producción interna",
      unit: cleanText(data.output_unit) || "ud",
      current_stock: 0,
      minimum_stock: 0,
      recommended_stock: normalizeNumber(data.output_quantity),
      location: data.storage_state === "congelado" ? "Congelación" : "Cocina",
      current_batch: batchCode,
      expiry_date: data.expiry_date,
      observations: "Producto creado desde producción interna.",
    });
    if (!created.ok) return { ok: false as const, warning: created.error };
    productId = created.data?.id;
  }

  if (!productId) {
    return { ok: false as const, warning: "Elaboración creada sin producto de inventario asociado." };
  }

  const movement = await applyInventoryMovement({
    product_id: productId,
    movement_type: "entrada",
    quantity: normalizeNumber(data.output_quantity),
    unit: cleanText(data.output_unit) || "ud",
    supplier: "Producción interna",
    batch_number: batchCode,
    expiry_date: data.expiry_date,
    observations: `Entrada por producción interna ${batchCode}.`,
  });

  return movement.ok ? { ok: true as const } : { ok: false as const, warning: movement.error };
}

async function consumeProductionInputInventory(data: ProductionBatchInput, batchCode: string) {
  const source = await findInventoryProductByProductionName(data.source_product);
  if (!source.ok) return `Materia prima no actualizada en inventario: ${source.error}`;

  const product = source.data[0];
  if (!product) {
    return "Materia prima registrada en producción. Producto origen no localizado en inventario; stock no descontado automáticamente.";
  }

  const movement = await applyInventoryMovement({
    product_id: product.id,
    movement_type: "consumo",
    quantity: normalizeNumber(data.input_quantity),
    unit: cleanText(data.input_unit) || product.unit || "ud",
    supplier: data.source_supplier,
    batch_number: data.source_batch_number,
    observations: `Salida de materia prima por producción interna ${batchCode}.`,
  });

  return movement.ok ? "" : `Materia prima no actualizada en inventario: ${movement.error}`;
}

export async function createProductionBatch(data: ProductionBatchInput): Promise<DbResult<{ id: string; batch_code: string; warnings: string[] }>> {
  if (!hasRequiredText(data.production_date) || !hasRequiredText(data.output_product)) {
    return { ok: false, error: "Fecha y elaboración resultante son obligatorias." };
  }

  const batchCode = await generateProductionBatchCode(data.output_product, data.production_date);
  const inserted = await insertRecordReturning<{ id: string; batch_code: string }>("admin_production_batches", {
    production_date: data.production_date,
    production_time: cleanText(data.production_time),
    responsible: cleanText(data.responsible),
    batch_code: batchCode,
    source_supplier: cleanText(data.source_supplier),
    source_product: cleanText(data.source_product),
    source_batch_number: cleanText(data.source_batch_number),
    input_quantity: normalizeNumber(data.input_quantity),
    input_unit: cleanText(data.input_unit),
    output_product: data.output_product.trim(),
    output_quantity: normalizeNumber(data.output_quantity),
    output_unit: cleanText(data.output_unit) || "ud",
    unit_weight: normalizeNumber(data.unit_weight),
    storage_state: cleanText(data.storage_state) || "refrigerado",
    expiry_date: cleanText(data.expiry_date),
    observations: cleanText(data.observations),
    source_document_id: cleanText(data.source_document_id),
    source: "admin-kiosko-production",
  }, "id,batch_code");

  if (!inserted.ok) return inserted;

  const batch = inserted.data[0];
  const warnings: string[] = [];

  await insertRecord("admin_production_movements", {
    batch_id: batch.id,
    movement_date: data.production_date,
    movement_time: cleanText(data.production_time),
    movement_type: "produccion",
    quantity: normalizeNumber(data.output_quantity),
    unit: cleanText(data.output_unit) || "ud",
    from_state: "materia prima",
    to_state: cleanText(data.storage_state) || "refrigerado",
    reason: "Producción interna",
    responsible: cleanText(data.responsible),
    observations: cleanText(data.observations),
  });

  const inputWarning = await consumeProductionInputInventory(data, batch.batch_code);
  if (inputWarning) warnings.push(inputWarning);

  const outputResult = await upsertProductionOutputInventory(data, batch.batch_code);
  if (!outputResult.ok) warnings.push(outputResult.warning);

  if (warnings.length) {
    await patchRecord("admin_production_batches", batch.id, {
      observations: [cleanText(data.observations), ...warnings].filter(Boolean).join("\n"),
    });
  }

  return { ok: true, data: { id: batch.id, batch_code: batch.batch_code, warnings } };
}

export async function createProductionMovement(data: ProductionMovementInput) {
  if (!hasRequiredText(data.batch_id) || !hasRequiredText(data.movement_date) || !hasRequiredText(data.movement_type)) {
    return { ok: false, error: "Lote, fecha y tipo de movimiento son obligatorios." };
  }

  const batchResult = await getProductionBatchById(data.batch_id);
  if (!batchResult.ok) return batchResult;
  const batch = batchResult.data;
  if (!batch) return { ok: false, error: "Lote interno no localizado." };

  const quantity = normalizeNumber(data.quantity);
  const current = Number(batch.output_quantity || 0);
  const subtracting = ["consumo", "merma", "personal", "invitacion", "degustacion"].includes(data.movement_type);
  const nextQuantity = data.movement_type === "regularizacion"
    ? Math.max(0, quantity)
    : subtracting
      ? Math.max(0, current - Math.abs(quantity))
      : current;
  const nextState = cleanText(data.to_state)
    || (data.movement_type === "congelacion" ? "congelado" : data.movement_type === "descongelacion" ? "descongelado" : data.movement_type === "merma" && nextQuantity === 0 ? "mermado" : data.movement_type === "personal" && nextQuantity === 0 ? "personal" : batch.storage_state || "refrigerado");

  const inserted = await insertRecord("admin_production_movements", {
    batch_id: data.batch_id,
    movement_date: data.movement_date,
    movement_time: cleanText(data.movement_time),
    movement_type: data.movement_type,
    quantity,
    unit: cleanText(data.unit) || batch.output_unit || "ud",
    from_state: cleanText(data.from_state) || batch.storage_state,
    to_state: nextState,
    reason: cleanText(data.reason),
    responsible: cleanText(data.responsible),
    observations: cleanText(data.observations),
  });
  if (!inserted.ok) return inserted;

  const patched = await patchRecord("admin_production_batches", data.batch_id, {
    output_quantity: nextQuantity,
    storage_state: nextState,
    expiry_date: cleanText(data.expiry_date) || batch.expiry_date,
    observations: cleanText(data.observations) ? [batch.observations, data.observations].filter(Boolean).join("\n") : batch.observations,
  });
  if (!patched.ok) return patched;

  const outputProduct = await findInventoryProductByProductionName(batch.output_product);
  const inventoryProduct = outputProduct.ok ? outputProduct.data[0] : null;
  if (inventoryProduct) {
    if (subtracting || data.movement_type === "regularizacion") {
      await applyInventoryMovement({
        product_id: inventoryProduct.id,
        movement_type: data.movement_type === "merma" ? "merma" : data.movement_type === "regularizacion" ? "regularizacion" : "consumo",
        quantity: data.movement_type === "regularizacion" ? nextQuantity : quantity,
        unit: cleanText(data.unit) || batch.output_unit || inventoryProduct.unit || "ud",
        batch_number: batch.batch_code || undefined,
        expiry_date: cleanText(data.expiry_date) || batch.expiry_date || undefined,
        observations: `${data.movement_type} de lote interno ${batch.batch_code || ""}. ${cleanText(data.reason) || ""}`.trim(),
      });
    } else {
      await insertInventoryMovement({
        product_id: inventoryProduct.id,
        movement_type: "edicion",
        quantity: 0,
        unit: cleanText(data.unit) || batch.output_unit || inventoryProduct.unit || "ud",
        batch_number: batch.batch_code || undefined,
        expiry_date: cleanText(data.expiry_date) || batch.expiry_date || undefined,
        observations: `${data.movement_type} de lote interno ${batch.batch_code || ""}.`,
      });
    }
  }

  return patched;
}

export async function getProductionBatches(limit = 80): Promise<DbResult<ProductionBatch[]>> {
  const result = await getRows<ProductionBatch>(
    "admin_production_batches",
    `?select=${productionBatchSelect}&order=production_date.desc,created_at.desc&limit=${limit}`,
  );
  if (!result.ok) return result;

  const rows = await Promise.all(result.data.map(async (batch) => {
    const [movements, labels] = await Promise.all([
      getRows<ProductionMovement>("admin_production_movements", `?select=${productionMovementSelect}&batch_id=eq.${encodeURIComponent(batch.id)}&order=movement_date.desc,created_at.desc&limit=40`),
      getLabelRecordsByBatch(batch.batch_code || undefined),
    ]);

    return {
      ...batch,
      movements: movements.ok ? movements.data : [],
      labels: labels.ok ? labels.data : [],
    };
  }));

  return { ok: true, data: rows };
}

export async function getProductionTraceabilityRows(filters?: { q?: string }): Promise<DbResult<ProductionBatch[]>> {
  const batches = await getProductionBatches(200);
  if (!batches.ok) return batches;
  const q = filters?.q?.trim().toLowerCase();
  const rows = q
    ? batches.data.filter((batch) => [
        batch.batch_code,
        batch.output_product,
        batch.source_supplier,
        batch.source_product,
        batch.source_batch_number,
      ].filter(Boolean).join(" ").toLowerCase().includes(q))
    : batches.data;
  return { ok: true, data: rows };
}

export async function getProductionMetrics(): Promise<DbResult<{
  activeInternalBatches: number;
  openDefrostedBatches: number;
  productsToConsumeSoon: number;
  expiredDefrostedBatches: number;
  monthlyWasteMovements: number;
  recentProductions: ProductionBatch[];
}>> {
  const today = getMadridDate();
  const soon = addDays(today, 3);
  const monthStart = firstDayOfMonth(today);
  const [batches, waste] = await Promise.all([
    getProductionBatches(200),
    getRows<{ id: string }>("admin_production_movements", `?select=id&movement_type=eq.merma&movement_date=gte.${monthStart}&limit=1000`),
  ]);
  if (!batches.ok) return batches;

  const active = batches.data.filter((batch) => Number(batch.output_quantity || 0) > 0 && !["consumido", "mermado", "personal"].includes(batch.storage_state || ""));
  return {
    ok: true,
    data: {
      activeInternalBatches: active.length,
      openDefrostedBatches: active.filter((batch) => batch.storage_state === "descongelado").length,
      productsToConsumeSoon: active.filter((batch) => Boolean(batch.expiry_date && batch.expiry_date >= today && batch.expiry_date <= soon)).length,
      expiredDefrostedBatches: active.filter((batch) => batch.storage_state === "descongelado" && Boolean(batch.expiry_date && batch.expiry_date < today)).length,
      monthlyWasteMovements: waste.ok ? waste.data.length : 0,
      recentProductions: batches.data.slice(0, 5),
    },
  };
}

export async function createInternalRecipe(data: InternalRecipeInput) {
  if (!hasRequiredText(data.recipe_name) || !hasRequiredText(data.output_product)) {
    return { ok: false, error: "Nombre de receta y elaboración resultante son obligatorios." };
  }

  const inserted = await insertRecordReturning<{ id: string }>("admin_internal_recipes", {
    recipe_name: data.recipe_name.trim(),
    output_product: data.output_product.trim(),
    expected_yield: normalizeNumber(data.expected_yield),
    output_unit: cleanText(data.output_unit) || "ud",
    unit_weight: normalizeNumber(data.unit_weight),
    instructions: cleanText(data.instructions),
    active: data.active !== false,
  }, "id");
  if (!inserted.ok) return inserted;

  const recipeId = inserted.data[0]?.id;
  if (recipeId && hasRequiredText(data.input_product)) {
    await insertRecord("admin_internal_recipe_inputs", {
      recipe_id: recipeId,
      input_product: data.input_product?.trim(),
      quantity: normalizeNumber(data.input_quantity),
      unit: cleanText(data.input_unit),
    });
  }

  return { ok: true as const, data: recipeId ? { id: recipeId } : null };
}

export async function getInternalRecipes(): Promise<DbResult<InternalRecipe[]>> {
  const result = await getRows<InternalRecipe>(
    "admin_internal_recipes",
    `?select=${recipeSelect}&order=active.desc,recipe_name.asc&limit=100`,
  );
  if (!result.ok) return result;

  const recipes = await Promise.all(result.data.map(async (recipe) => {
    const inputs = await getRows<{ id: string; input_product: string; quantity: number | null; unit: string | null }>(
      "admin_internal_recipe_inputs",
      `?select=id,input_product,quantity,unit&recipe_id=eq.${encodeURIComponent(recipe.id)}&order=input_product.asc`,
    );
    return { ...recipe, inputs: inputs.ok ? inputs.data : [] };
  }));

  return { ok: true, data: recipes };
}

export async function getSupplierProfiles(q?: string): Promise<DbResult<SupplierProfile[]>> {
  const suppliers = await getRows<{ id: string; supplier: string; cif: string | null; phone: string | null; email: string | null; category: string | null; status: string | null }>(
    "admin_supplier_records",
    "?select=id,supplier,cif,phone,email,category,status&order=supplier.asc&limit=100",
  );
  if (!suppliers.ok) return suppliers;

  const needle = q?.trim().toLowerCase();
  const filtered = suppliers.data.filter((supplier) => !needle || [supplier.supplier, supplier.cif, supplier.category].filter(Boolean).join(" ").toLowerCase().includes(needle));
  const profiles = await Promise.all(filtered.map(async (supplier) => {
    const [documents, receptions, incidents, products] = await Promise.all([
      getRows<AiSupplierDocument>("admin_supplier_documents", `?select=id,created_at,document_type,document_number,document_date,supplier_name,ocr_status&supplier_name=ilike.*${encodeURIComponent(supplier.supplier)}*&order=created_at.desc&limit=20`),
      getRows<RecentAdminRecord & { supplier: string; product: string }>("admin_goods_reception_records", `?select=id,record_date,record_time,responsible,status,supplier,product&supplier=ilike.*${encodeURIComponent(supplier.supplier)}*&order=record_date.desc,created_at.desc&limit=20`),
      getRows<RecentAdminRecord & { incident_type: string; severity: string | null }>("admin_incident_records", `?select=id,record_date,record_time,responsible,status,incident_type,severity&observations=ilike.*${encodeURIComponent(supplier.supplier)}*&order=record_date.desc,created_at.desc&limit=20`),
      getRows<InventoryProduct>("admin_inventory_products", `?select=${inventorySelect}&usual_supplier=ilike.*${encodeURIComponent(supplier.supplier)}*&order=name.asc&limit=50`),
    ]);

    return {
      ...supplier,
      documents: documents.ok ? documents.data : [],
      receptions: receptions.ok ? receptions.data.map((record) => ({ ...record, main: `${record.supplier} · ${record.product}` })) : [],
      incidents: incidents.ok ? incidents.data.map((record) => ({ ...record, main: `${record.incident_type}${record.severity ? ` · ${record.severity}` : ""}` })) : [],
      products: products.ok ? products.data : [],
    };
  }));

  return { ok: true, data: profiles };
}

export async function getExpiryBuckets(): Promise<DbResult<{ expired: InventoryProduct[]; seven: InventoryProduct[]; fifteen: InventoryProduct[]; thirty: InventoryProduct[] }>> {
  const inventory = await getInventoryProducts({ status: "activos" });
  if (!inventory.ok) return inventory;
  const today = getMadridDate();
  const seven = addDays(today, 7);
  const fifteen = addDays(today, 15);
  const thirty = addDays(today, 30);
  const rows = inventory.data.filter((product) => product.active && product.expiry_date).sort((a, b) => String(a.expiry_date).localeCompare(String(b.expiry_date)));

  return {
    ok: true,
    data: {
      expired: rows.filter((product) => String(product.expiry_date) < today),
      seven: rows.filter((product) => String(product.expiry_date) >= today && String(product.expiry_date) <= seven),
      fifteen: rows.filter((product) => String(product.expiry_date) > seven && String(product.expiry_date) <= fifteen),
      thirty: rows.filter((product) => String(product.expiry_date) > fifteen && String(product.expiry_date) <= thirty),
    },
  };
}

export async function getGlobalSearchResults(q: string): Promise<DbResult<GlobalSearchResult[]>> {
  const needle = q.trim();
  if (!needle) return { ok: true, data: [] };

  const [inventory, traceability, suppliers, documents, incidents, temperatures, equipment, records] = await Promise.all([
    getInventoryProducts({ q: needle, status: "todos" }),
    getTraceabilityRows({ q: needle }),
    getSupplierProfiles(needle),
    getRows<AiSupplierDocument>("admin_supplier_documents", `?select=id,created_at,document_type,document_number,document_date,supplier_name,ocr_status&or=(supplier_name.ilike.*${encodeURIComponent(needle)}*,document_number.ilike.*${encodeURIComponent(needle)}*,original_filename.ilike.*${encodeURIComponent(needle)}*)&order=created_at.desc&limit=20`),
    getRows<RecentAdminRecord & { incident_type: string; severity: string | null }>("admin_incident_records", `?select=id,record_date,record_time,responsible,status,incident_type,severity&or=(incident_type.ilike.*${encodeURIComponent(needle)}*,observations.ilike.*${encodeURIComponent(needle)}*)&order=record_date.desc,created_at.desc&limit=20`),
    getRows<DashboardTemperatureRecord>("admin_temperature_records", `?select=id,equipment,record_date,record_time,temperature,status,responsible&or=(equipment.ilike.*${encodeURIComponent(needle)}*,record_date.eq.${encodeURIComponent(needle)})&order=record_date.desc,created_at.desc&limit=20`),
    getRows<{ id: string; name: string; location: string | null; status: string | null; created_at: string }>("admin_equipment_assets", `?select=id,name,location,status,created_at&or=(name.ilike.*${encodeURIComponent(needle)}*,location.ilike.*${encodeURIComponent(needle)}*)&order=created_at.desc&limit=20`),
    getAppccRecords({ type: "todos", equipment: needle, includeArchivedEquipment: true }),
  ]);

  const results: GlobalSearchResult[] = [];
  if (inventory.ok) inventory.data.forEach((item) => results.push({ type: "Inventario", title: item.name, detail: `Stock ${item.current_stock ?? 0} ${item.unit || "ud"} · lote ${item.current_batch || "-"}`, href: `/admin-kiosko/inventario?product=${item.id}`, date: item.last_entry_date || item.created_at?.slice(0, 10) }));
  if (traceability.ok) traceability.data.forEach((item) => results.push({ type: "Lote", title: item.batch_number || item.product_name || "Trazabilidad", detail: `${item.admin_supplier_documents?.supplier_name || "-"} · ${item.product_name || "-"}`, href: `/admin-kiosko/trazabilidad?q=${encodeURIComponent(item.batch_number || item.product_name || needle)}`, date: item.created_at.slice(0, 10) }));
  if (suppliers.ok) suppliers.data.forEach((item) => results.push({ type: "Proveedor", title: item.supplier, detail: `${item.documents.length} documentos · ${item.receptions.length} recepciones · ${item.products.length} productos`, href: `/admin-kiosko/proveedores?q=${encodeURIComponent(item.supplier)}` }));
  if (documents.ok) documents.data.forEach((item) => results.push({ type: item.document_type || "Documento OCR", title: item.document_number || item.supplier_name || "Documento", detail: `${item.supplier_name || "-"} · ${item.ocr_status || "-"}`, href: `/admin-kiosko/trazabilidad?q=${encodeURIComponent(item.document_number || item.supplier_name || needle)}`, date: item.document_date || item.created_at.slice(0, 10) }));
  if (incidents.ok) incidents.data.forEach((item) => results.push({ type: "Incidencia", title: item.incident_type, detail: `${item.severity || "-"} · ${item.status || "-"}`, href: "/admin-kiosko/incidencias", date: item.record_date }));
  if (temperatures.ok) temperatures.data.forEach((item) => results.push({ type: "Temperatura", title: item.equipment, detail: `${item.temperature ?? "-"} ºC · ${item.status || "-"}`, href: "/admin-kiosko/temperaturas", date: item.record_date }));
  if (equipment.ok) equipment.data.forEach((item) => results.push({ type: "Equipo", title: item.name, detail: `${item.location || "-"} · ${item.status || "-"}`, href: `/admin-kiosko/equipos/${encodeURIComponent(item.name.toLowerCase().replaceAll(" ", "-"))}`, date: item.created_at?.slice(0, 10) }));
  if (records.ok) records.data.slice(0, 20).forEach((item) => results.push({ type: item.typeLabel, title: item.subject, detail: `${item.main} · ${item.status || "-"}`, href: "/admin-kiosko/registros", date: item.record_date }));

  return { ok: true, data: results.slice(0, 80) };
}

export async function createEquipmentAsset(data: EquipmentAssetInput) {
  if (!hasRequiredText(data.name)) {
    return { ok: false, error: "El nombre del equipo es obligatorio." };
  }

  return insertRecord("admin_equipment_assets", {
    name: data.name.trim(),
    brand: cleanText(data.brand),
    model: cleanText(data.model),
    serial_number: cleanText(data.serial_number),
    purchase_date: cleanText(data.purchase_date),
    installation_date: cleanText(data.installation_date),
    location: cleanText(data.location),
    last_maintenance: cleanText(data.last_maintenance),
    next_maintenance: cleanText(data.next_maintenance),
    fault_history: cleanText(data.fault_history),
    status: cleanText(data.status) || "operativo",
  });
}

export async function createMaintenanceRecord(data: MaintenanceRecordInput) {
  if (!hasRequiredText(data.record_date)) {
    return { ok: false, error: "La fecha es obligatoria." };
  }

  return insertRecord("admin_maintenance_records", {
    record_date: data.record_date,
    equipment: cleanText(data.equipment),
    intervention: cleanText(data.intervention),
    company: cleanText(data.company),
    invoice: cleanText(data.invoice),
    observations: cleanText(data.observations),
    responsible: cleanText(data.responsible),
  });
}

export async function createWaterRecord(data: WaterRecordInput) {
  if (!hasRequiredText(data.record_date)) {
    return { ok: false, error: "La fecha es obligatoria." };
  }

  return insertRecord("admin_water_records", {
    record_date: data.record_date,
    color: cleanText(data.color),
    smell: cleanText(data.smell),
    taste: cleanText(data.taste),
    chlorine: cleanText(data.chlorine),
    observations: cleanText(data.observations),
    responsible: cleanText(data.responsible),
  });
}

export async function createAnnualVerification(data: AnnualVerificationInput) {
  if (!hasRequiredText(data.record_date)) {
    return { ok: false, error: "La fecha es obligatoria." };
  }

  return insertRecord("admin_annual_verification_records", {
    record_date: data.record_date,
    appcc_reviewed: Boolean(data.appcc_reviewed),
    health_memory_reviewed: Boolean(data.health_memory_reviewed),
    allergens_reviewed: Boolean(data.allergens_reviewed),
    suppliers_reviewed: Boolean(data.suppliers_reviewed),
    cleaning_products_reviewed: Boolean(data.cleaning_products_reviewed),
    equipment_reviewed: Boolean(data.equipment_reviewed),
    handler_training: Boolean(data.handler_training),
    documentation_complete: Boolean(data.documentation_complete),
    observations: cleanText(data.observations),
    responsible: cleanText(data.responsible),
  });
}

export async function getRecentTemperatureRecords(): Promise<DbResult<RecentAdminRecord[]>> {
  const result = await getRecentRows<RecentAdminRecord & { equipment: string; temperature: number }>(
    "admin_temperature_records",
    "id,record_date,record_time,responsible,status,equipment,temperature",
  );

  if (!result.ok) return result;

  return {
    ok: true,
    data: result.data
      .filter((record) => isActiveTemperatureEquipment(record.equipment))
      .map((record) => ({
        ...record,
        main: `${record.equipment} · ${record.temperature} °C`,
      })),
  };
}

export async function getOpenEquipmentAlerts(): Promise<DbResult<EquipmentAlert[]>> {
  const result = await supabaseRequest<EquipmentAlert[]>("admin_equipment_alerts", {
    method: "GET",
    query: "?select=id,equipment,alert_date,alert_time,temperature,alert_level,status,description,corrective_action&status=in.(pendiente,en_proceso)&order=created_at.desc&limit=10",
  });

  if (!result.ok) return result;

  return { ok: true, data: result.data.filter(isActiveAlert) };
}

export async function getTemperatureRecordsByMonth(year: number, month: number): Promise<DbResult<DashboardTemperatureRecord[]>> {
  const { start, end } = getMonthRange(year, month);
  return getRows<DashboardTemperatureRecord>(
    "admin_temperature_records",
    `?select=id,equipment,record_date,record_time,temperature,status,responsible&record_date=gte.${start}&record_date=lt.${end}&order=record_date.asc,record_time.asc`,
  );
}

export async function getEquipmentAlertsByMonth(year: number, month: number): Promise<DbResult<EquipmentAlert[]>> {
  const { start, end } = getMonthRange(year, month);
  return getRows<EquipmentAlert>(
    "admin_equipment_alerts",
    `?select=id,equipment,alert_date,alert_time,temperature,alert_level,status,description,corrective_action&alert_date=gte.${start}&alert_date=lt.${end}&order=alert_date.asc,alert_time.asc`,
  );
}

export async function getAdminDashboardSummary(): Promise<DbResult<AdminDashboardSummary>> {
  const today = getMadridDate();
  const { year, month } = getMadridMonthParts();
  const { start, end } = getMonthRange(year, month);
  const activeEquipment = temperatureEquipment.filter((equipment) => equipment.active).map((equipment) => equipment.name);
  const [
    allTemperatures,
    todayTemperatures,
    reviewingTemperatures,
    incidentTemperatures,
    pendingAlerts,
    inProgressAlerts,
    resolvedAlertsThisMonth,
    lastTemperature,
    recentTemperatures,
    openAlerts,
    openIncidents,
    latestOpeningChecklist,
    latestClosingChecklist,
    latestSignature,
    todayCleaning,
    todayGoodsReception,
    latestFryerOil,
  ] = await Promise.all([
    getRows<DashboardTemperatureRecord>("admin_temperature_records", "?select=id,equipment,record_date,record_time,temperature,status,responsible&limit=1000"),
    getRows<DashboardTemperatureRecord>("admin_temperature_records", `?select=id,equipment,record_date,record_time,temperature,status,responsible&record_date=eq.${today}&limit=1000`),
    getRows<DashboardTemperatureRecord>("admin_temperature_records", "?select=id,equipment,record_date,record_time,temperature,status,responsible&status=eq.revisar&limit=1000"),
    getRows<DashboardTemperatureRecord>("admin_temperature_records", "?select=id,equipment,record_date,record_time,temperature,status,responsible&status=eq.incidencia&limit=1000"),
    getRows<EquipmentAlert>("admin_equipment_alerts", "?select=id,equipment,alert_date,alert_time,temperature,alert_level,status,description,corrective_action&status=eq.pendiente&limit=1000"),
    getRows<EquipmentAlert>("admin_equipment_alerts", "?select=id,equipment,alert_date,alert_time,temperature,alert_level,status,description,corrective_action&status=eq.en_proceso&limit=1000"),
    getRows<EquipmentAlert>("admin_equipment_alerts", `?select=id,equipment,alert_date,alert_time,temperature,alert_level,status,description,corrective_action&status=eq.solventado&resolved_at=gte.${start}&resolved_at=lt.${end}&limit=1000`),
    getRows<DashboardTemperatureRecord>("admin_temperature_records", "?select=id,equipment,record_date,record_time,temperature,status,responsible&order=record_date.desc,record_time.desc,created_at.desc&limit=100"),
    getRows<DashboardTemperatureRecord>("admin_temperature_records", "?select=id,equipment,record_date,record_time,temperature,status,responsible&order=record_date.desc,record_time.desc,created_at.desc&limit=100"),
    getOpenEquipmentAlerts(),
    getRows<{ id: string }>("admin_incident_records", "?select=id&resolved=eq.false&limit=1000"),
    getLatestChecklistByType("Apertura APPCC"),
    getLatestChecklistByType("Cierre APPCC"),
    getLatestMonthlySignature(),
    getRows<{ id: string }>("admin_cleaning_records", `?select=id&record_date=eq.${today}&limit=1000`),
    getRows<{ id: string }>("admin_goods_reception_records", `?select=id&record_date=eq.${today}&limit=1000`),
    getRecentFryerOilRecords(),
  ]);

  const results = [allTemperatures, todayTemperatures, reviewingTemperatures, incidentTemperatures, pendingAlerts, inProgressAlerts, resolvedAlertsThisMonth, lastTemperature, recentTemperatures, openAlerts, openIncidents, latestOpeningChecklist, latestClosingChecklist, latestSignature, todayCleaning, todayGoodsReception, latestFryerOil];
  const failed = results.find((result) => !result.ok);
  if (failed && !failed.ok) {
    return failed;
  }

  const activeTemperatures = allTemperatures.ok ? allTemperatures.data.filter((record) => isActiveTemperatureEquipment(record.equipment)) : [];
  const todayActiveTemperatures = todayTemperatures.ok ? todayTemperatures.data.filter((record) => isActiveTemperatureEquipment(record.equipment)) : [];
  const reviewingActiveTemperatures = reviewingTemperatures.ok ? reviewingTemperatures.data.filter((record) => isActiveTemperatureEquipment(record.equipment)) : [];
  const incidentActiveTemperatures = incidentTemperatures.ok ? incidentTemperatures.data.filter((record) => isActiveTemperatureEquipment(record.equipment)) : [];
  const activePendingAlerts = pendingAlerts.ok ? pendingAlerts.data.filter(isActiveAlert) : [];
  const activeInProgressAlerts = inProgressAlerts.ok ? inProgressAlerts.data.filter(isActiveAlert) : [];
  const activeResolvedAlertsThisMonth = resolvedAlertsThisMonth.ok ? resolvedAlertsThisMonth.data.filter(isActiveAlert) : [];
  const activeRecentTemperatures = recentTemperatures.ok ? recentTemperatures.data.filter((record) => isActiveTemperatureEquipment(record.equipment)) : [];
  const lastActiveTemperature = lastTemperature.ok ? lastTemperature.data.find((record) => isActiveTemperatureEquipment(record.equipment)) || null : null;

  const latestByEquipment = activeEquipment
    .map((equipment) => recentTemperatures.ok
      ? activeRecentTemperatures.find((record) => record.equipment === equipment) || {
          id: `missing-${equipment}`,
          equipment,
          record_date: "",
          record_time: null,
          temperature: null,
          status: null,
          responsible: null,
        }
      : undefined)
    .filter((record): record is DashboardTemperatureRecord => Boolean(record));

  return {
    ok: true,
    data: {
      totalTemperatureRecords: activeTemperatures.length,
      todayTemperatureRecords: todayActiveTemperatures.length,
      reviewingTemperatureRecords: reviewingActiveTemperatures.length,
      incidentTemperatureRecords: incidentActiveTemperatures.length,
      activeEquipmentCount: activeEquipment.length,
      todayCleaningRecords: todayCleaning.ok ? todayCleaning.data.length : 0,
      todayGoodsReceptionRecords: todayGoodsReception.ok ? todayGoodsReception.data.length : 0,
      latestFryerOilRecord: latestFryerOil.ok ? latestFryerOil.data[0] || null : null,
      pendingAlerts: activePendingAlerts.length,
      inProgressAlerts: activeInProgressAlerts.length,
      resolvedAlertsThisMonth: activeResolvedAlertsThisMonth.length,
      openIncidents: openIncidents.ok ? openIncidents.data.length : 0,
      latestChecklistOpening: latestOpeningChecklist.ok ? latestOpeningChecklist.data : null,
      latestChecklistClosing: latestClosingChecklist.ok ? latestClosingChecklist.data : null,
      latestMonthlySignature: latestSignature.ok ? latestSignature.data : null,
      lastTemperatureRecord: lastActiveTemperature,
      latestByEquipment,
      openAlerts: openAlerts.ok ? openAlerts.data : [],
    },
  };
}

export async function updateEquipmentAlertStatus(data: {
  id: string;
  status: "pendiente" | "en_proceso" | "solventado";
  corrective_action?: string;
  resolved_by?: string;
}) {
  if (!hasRequiredText(data.id) || !hasRequiredText(data.status)) {
    return { ok: false, error: "Faltan campos obligatorios." };
  }

  return patchRecord("admin_equipment_alerts", data.id, {
    status: data.status,
    corrective_action: cleanText(data.corrective_action),
    resolved_by: data.status === "solventado" ? cleanText(data.resolved_by) : undefined,
    resolved_at: data.status === "solventado" ? new Date().toISOString() : undefined,
  });
}

export async function getRecentCleaningRecords(): Promise<DbResult<RecentAdminRecord[]>> {
  const result = await getRecentRows<RecentAdminRecord & { area: string; cleaning_done: boolean }>(
    "admin_cleaning_records",
    "id,record_date,record_time,responsible,status,area,cleaning_done",
  );

  if (!result.ok) return result;

  return {
    ok: true,
    data: result.data.map((record) => ({
      ...record,
      main: `${record.area} · ${record.cleaning_done ? "Limpieza realizada" : "Sin marcar"}`,
    })),
  };
}

export async function getRecentFryerOilRecords(): Promise<DbResult<RecentAdminRecord[]>> {
  const result = await getRecentRows<RecentAdminRecord & { fryer: string; oil_status: string }>(
    "admin_fryer_oil_records",
    "id,record_date,record_time,responsible,status,fryer,oil_status",
  );

  if (!result.ok) return result;

  return {
    ok: true,
    data: result.data.map((record) => ({
      ...record,
      main: `${record.fryer} · ${record.oil_status}`,
    })),
  };
}

export async function getRecentGoodsReceptionRecords(): Promise<DbResult<RecentAdminRecord[]>> {
  const result = await getRecentRows<RecentAdminRecord & { supplier: string; product: string }>(
    "admin_goods_reception_records",
    "id,record_date,record_time,responsible,status,supplier,product",
  );

  if (!result.ok) return result;

  return {
    ok: true,
    data: result.data.map((record) => ({
      ...record,
      main: `${record.supplier} · ${record.product}`,
    })),
  };
}

export async function getRecentIncidentRecords(): Promise<DbResult<RecentAdminRecord[]>> {
  const result = await getRecentRows<RecentAdminRecord & { incident_type: string; severity: string | null }>(
    "admin_incident_records",
    "id,record_date,record_time,responsible,status,incident_type,severity",
  );

  if (!result.ok) return result;

  return {
    ok: true,
    data: result.data.map((record) => ({
      ...record,
      main: `${record.incident_type}${record.severity ? ` · ${record.severity}` : ""}`,
    })),
  };
}

export async function getRecentChecklistRecords(): Promise<DbResult<RecentAdminRecord[]>> {
  const result = await getRecentRows<RecentAdminRecord & { checklist_type: string; completed: boolean }>(
    "admin_checklist_records",
    "id,record_date,record_time,responsible,status,checklist_type,completed",
  );

  if (!result.ok) return result;

  return {
    ok: true,
    data: result.data.map((record) => ({
      ...record,
      main: `${record.checklist_type} · ${record.completed ? "Completado" : "Pendiente"}`,
    })),
  };
}

export async function getLatestChecklistByType(type: string): Promise<DbResult<RecentAdminRecord | null>> {
  const result = await getRows<RecentAdminRecord & { checklist_type: string; completed: boolean }>(
    "admin_checklist_records",
    `?select=id,record_date,record_time,responsible,status,checklist_type,completed&checklist_type=eq.${encodeURIComponent(type)}&order=record_date.desc,record_time.desc,created_at.desc&limit=1`,
  );

  if (!result.ok) return result;

  const record = result.data[0];
  return {
    ok: true,
    data: record
      ? {
          ...record,
          main: `${record.checklist_type} · ${record.completed ? "Completado" : "Pendiente"}`,
        }
      : null,
  };
}

export async function getRecentInspectionRecords(): Promise<DbResult<RecentAdminRecord[]>> {
  const result = await getRows<RecentAdminRecord & { inspection_date: string; inspector: string | null; result: string | null }>(
    "admin_inspection_records",
    "?select=id,inspection_date,inspector,result,status,responsible&order=inspection_date.desc,created_at.desc&limit=10",
  );

  if (!result.ok) return result;

  return {
    ok: true,
    data: result.data.map((record) => ({
      id: record.id,
      record_date: record.inspection_date,
      record_time: null,
      responsible: record.responsible,
      status: record.status,
      main: `${record.inspector || "Inspección"}${record.result ? ` · ${record.result}` : ""}`,
    })),
  };
}

export async function getRecentSupplierRecords(): Promise<DbResult<RecentAdminRecord[]>> {
  const result = await getRows<{ id: string; supplier: string; category: string | null; status: string | null; created_at: string }>(
    "admin_supplier_records",
    "?select=id,supplier,category,status,created_at&order=created_at.desc&limit=10",
  );

  if (!result.ok) return result;

  return {
    ok: true,
    data: result.data.map((record) => ({
      id: record.id,
      record_date: record.created_at?.slice(0, 10) || "",
      record_time: null,
      responsible: null,
      status: record.status || "activo",
      main: `${record.supplier}${record.category ? ` · ${record.category}` : ""}`,
    })),
  };
}

export async function getRecentAiProcessingLogs(limit = 20): Promise<DbResult<AiProcessingLog[]>> {
  return getRows<AiProcessingLog>(
    "admin_ai_processing_logs",
    `?select=id,created_at,document_name,detected_type,status,summary,error_message&order=created_at.desc&limit=${limit}`,
  );
}

export async function getRecentAiSupplierDocuments(limit = 20): Promise<DbResult<AiSupplierDocument[]>> {
  return getRows<AiSupplierDocument>(
    "admin_supplier_documents",
    `?select=id,created_at,document_type,document_number,document_date,supplier_name,ocr_status&order=created_at.desc&limit=${limit}`,
  );
}

export async function getRecentEquipmentAssets(): Promise<DbResult<RecentAdminRecord[]>> {
  const result = await getRows<{ id: string; name: string; location: string | null; status: string | null; created_at: string }>(
    "admin_equipment_assets",
    "?select=id,name,location,status,created_at&order=created_at.desc&limit=10",
  );

  if (!result.ok) return result;

  return {
    ok: true,
    data: result.data.map((record) => ({
      id: record.id,
      record_date: record.created_at?.slice(0, 10) || "",
      record_time: null,
      responsible: null,
      status: record.status || "operativo",
      main: `${record.name}${record.location ? ` · ${record.location}` : ""}`,
    })),
  };
}

export async function getRecentMaintenanceRecords(): Promise<DbResult<RecentAdminRecord[]>> {
  const result = await getRows<RecentAdminRecord & { equipment: string | null; intervention: string | null }>(
    "admin_maintenance_records",
    "?select=id,record_date,equipment,intervention,responsible&order=record_date.desc,created_at.desc&limit=10",
  );

  if (!result.ok) return result;

  return {
    ok: true,
    data: result.data.map((record) => ({
      id: record.id,
      record_date: record.record_date,
      record_time: null,
      responsible: record.responsible,
      status: null,
      main: `${record.equipment || "Equipo"}${record.intervention ? ` · ${record.intervention}` : ""}`,
    })),
  };
}

export async function getRecentWaterRecords(): Promise<DbResult<RecentAdminRecord[]>> {
  const result = await getRows<RecentAdminRecord & { color: string | null; smell: string | null; taste: string | null }>(
    "admin_water_records",
    "?select=id,record_date,color,smell,taste,responsible&order=record_date.desc,created_at.desc&limit=10",
  );

  if (!result.ok) return result;

  return {
    ok: true,
    data: result.data.map((record) => ({
      id: record.id,
      record_date: record.record_date,
      record_time: null,
      responsible: record.responsible,
      status: null,
      main: `Agua · color ${record.color || "-"} · olor ${record.smell || "-"} · sabor ${record.taste || "-"}`,
    })),
  };
}

export async function getRecentAnnualVerificationRecords(): Promise<DbResult<RecentAdminRecord[]>> {
  const result = await getRows<RecentAdminRecord & { documentation_complete: boolean }>(
    "admin_annual_verification_records",
    "?select=id,record_date,documentation_complete,responsible&order=record_date.desc,created_at.desc&limit=10",
  );

  if (!result.ok) return result;

  return {
    ok: true,
    data: result.data.map((record) => ({
      id: record.id,
      record_date: record.record_date,
      record_time: null,
      responsible: record.responsible,
      status: record.documentation_complete ? "completo" : "pendiente",
      main: "Verificación anual APPCC",
    })),
  };
}

export async function getAppccRecords(filters: AppccRecordFilters): Promise<DbResult<AppccRecord[]>> {
  const requestedType = filters.type || "todos";
  const shouldFetch = (type: AppccRecordType) => requestedType === "todos" || requestedType === type;
  const requests: Array<Promise<DbResult<AppccRecord[]>>> = [];

  if (shouldFetch("temperaturas")) {
    requests.push(
      getRows<{
        id: string;
        record_date: string;
        record_time: string | null;
        equipment: string;
        temperature: number;
        status: string | null;
        responsible: string | null;
        observations: string | null;
      } & SignatureFields>("admin_temperature_records", commonRecordQuery(filters, "id,record_date,record_time,equipment,temperature,status,responsible,observations,signed_by,signed_at,signature_note"))
        .then((result) => result.ok
          ? {
              ok: true as const,
              data: result.data.map((record) => ({
                id: record.id,
                type: "temperaturas" as const,
                typeLabel: "Temperaturas",
                record_date: record.record_date,
                record_time: record.record_time,
                subject: record.equipment,
                main: `${record.temperature} ºC`,
                status: record.status,
                responsible: record.responsible,
                observations: normalizeAppccObservation(record.observations),
                signed_by: record.signed_by,
                signed_at: record.signed_at,
                signature_note: record.signature_note,
              })),
            }
          : result),
    );
  }

  if (shouldFetch("limpieza")) {
    requests.push(
      getRows<{
        id: string;
        record_date: string;
        record_time: string | null;
        area: string;
        cleaning_done: boolean;
        products_used: string | null;
        status: string | null;
        responsible: string | null;
        observations: string | null;
      } & SignatureFields>("admin_cleaning_records", commonRecordQuery(filters, "id,record_date,record_time,area,cleaning_done,products_used,status,responsible,observations,signed_by,signed_at,signature_note"))
        .then((result) => result.ok
          ? {
              ok: true as const,
              data: result.data.map((record) => ({
                id: record.id,
                type: "limpieza" as const,
                typeLabel: "Limpieza",
                record_date: record.record_date,
                record_time: record.record_time,
                subject: record.area,
                main: `${record.cleaning_done ? "Realizada" : "Sin marcar"}${record.products_used ? ` · ${record.products_used}` : ""}`,
                status: record.status,
                responsible: record.responsible,
                observations: normalizeAppccObservation(record.observations),
                signed_by: record.signed_by,
                signed_at: record.signed_at,
                signature_note: record.signature_note,
              })),
            }
          : result),
    );
  }

  if (shouldFetch("aceite-freidora")) {
    requests.push(
      getRows<{
        id: string;
        record_date: string;
        record_time: string | null;
        fryer: string;
        oil_status: string;
        oil_changed: boolean;
        status: string | null;
        responsible: string | null;
        observations: string | null;
      } & SignatureFields>("admin_fryer_oil_records", commonRecordQuery(filters, "id,record_date,record_time,fryer,oil_status,oil_changed,status,responsible,observations,signed_by,signed_at,signature_note"))
        .then((result) => result.ok
          ? {
              ok: true as const,
              data: result.data.map((record) => ({
                id: record.id,
                type: "aceite-freidora" as const,
                typeLabel: "Aceite freidora",
                record_date: record.record_date,
                record_time: record.record_time,
                subject: record.fryer,
                main: `${record.oil_status}${record.oil_changed ? " · Aceite cambiado" : ""}`,
                status: record.status,
                responsible: record.responsible,
                observations: normalizeAppccObservation(record.observations),
                signed_by: record.signed_by,
                signed_at: record.signed_at,
                signature_note: record.signature_note,
              })),
            }
          : result),
    );
  }

  if (shouldFetch("recepcion-mercancia")) {
    requests.push(
      getRows<{
        id: string;
        record_date: string;
        record_time: string | null;
        supplier: string;
        product: string;
        delivery_temperature: number | null;
        accepted: boolean;
        status: string | null;
        responsible: string | null;
        observations: string | null;
      } & SignatureFields>("admin_goods_reception_records", commonRecordQuery(filters, "id,record_date,record_time,supplier,product,delivery_temperature,accepted,status,responsible,observations,signed_by,signed_at,signature_note"))
        .then((result) => result.ok
          ? {
              ok: true as const,
              data: result.data.map((record) => ({
                id: record.id,
                type: "recepcion-mercancia" as const,
                typeLabel: "Recepción mercancía",
                record_date: record.record_date,
                record_time: record.record_time,
                subject: record.product,
                main: `${record.supplier} · ${record.accepted ? "Aceptado" : "Rechazado"}${record.delivery_temperature !== null ? ` · ${record.delivery_temperature} ºC` : ""}`,
                status: record.status,
                responsible: record.responsible,
                observations: normalizeAppccObservation(record.observations),
                signed_by: record.signed_by,
                signed_at: record.signed_at,
                signature_note: record.signature_note,
              })),
            }
          : result),
    );
  }

  if (shouldFetch("incidencias")) {
    requests.push(
      getRows<{
        id: string;
        record_date: string;
        record_time: string | null;
        incident_type: string;
        severity: string | null;
        status: string | null;
        responsible: string | null;
        observations: string | null;
      } & SignatureFields>("admin_incident_records", commonRecordQuery(filters, "id,record_date,record_time,incident_type,severity,status,responsible,observations,signed_by,signed_at,signature_note"))
        .then((result) => result.ok
          ? {
              ok: true as const,
              data: result.data.map((record) => ({
                id: record.id,
                type: "incidencias" as const,
                typeLabel: "Incidencias",
                record_date: record.record_date,
                record_time: record.record_time,
                subject: record.incident_type,
                main: record.severity || "Sin gravedad",
                status: record.status,
                responsible: record.responsible,
                observations: normalizeAppccObservation(record.observations),
                signed_by: record.signed_by,
                signed_at: record.signed_at,
                signature_note: record.signature_note,
              })),
            }
          : result),
    );
  }

  if (shouldFetch("checklists")) {
    requests.push(
      getRows<{
        id: string;
        record_date: string;
        record_time: string | null;
        checklist_type: string;
        completed: boolean;
        status: string | null;
        responsible: string | null;
        observations: string | null;
      } & SignatureFields>("admin_checklist_records", commonRecordQuery(filters, "id,record_date,record_time,checklist_type,completed,status,responsible,observations,signed_by,signed_at,signature_note"))
        .then((result) => result.ok
          ? {
              ok: true as const,
              data: result.data.map((record) => ({
                id: record.id,
                type: "checklists" as const,
                typeLabel: "Checklists",
                record_date: record.record_date,
                record_time: record.record_time,
                subject: record.checklist_type,
                main: record.completed ? "Completado" : "Pendiente",
                status: record.status,
                responsible: record.responsible,
                observations: normalizeAppccObservation(record.observations),
                signed_by: record.signed_by,
                signed_at: record.signed_at,
                signature_note: record.signature_note,
              })),
            }
          : result),
    );
  }

  const results = await Promise.all(requests);
  const failed = results.find((result) => !result.ok);
  if (failed && !failed.ok) {
    return failed;
  }

  const records = results
    .flatMap((result) => (result.ok ? result.data : []))
    .filter((record) => shouldIncludeTemperatureRecord(record, filters.includeArchivedEquipment))
    .filter((record) => matchesEquipmentFilter(record, filters.equipment))
    .sort((a, b) => `${b.record_date} ${b.record_time || ""}`.localeCompare(`${a.record_date} ${a.record_time || ""}`));

  return { ok: true, data: records };
}

export async function getMonthlyAppccReport(filters: AppccRecordFilters & { year?: number; month?: number }): Promise<DbResult<MonthlyAppccReport>> {
  const current = getMadridMonthParts();
  const year = filters.year || current.year;
  const month = filters.month || current.month;
  const { start } = getMonthRange(year, month);
  const dateTo = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);

  const [records, alerts, signature] = await Promise.all([
    getAppccRecords({
      ...filters,
      dateFrom: start,
      dateTo,
    }),
    getEquipmentAlertsByMonth(year, month),
    getMonthlySignature(year, month),
  ]);

  if (!records.ok) {
    return records;
  }

  if (!alerts.ok) {
    return alerts;
  }

  if (!signature.ok) {
    return signature;
  }

  const filteredAlerts = alerts.data
    .filter((alert) => filters.includeArchivedEquipment || isActiveAlert(alert))
    .filter((alert) => !filters.status || alert.status === filters.status)
    .filter((alert) => matchesEquipmentFilter({
      id: alert.id,
      type: "temperaturas",
      typeLabel: "Alerta técnica",
      record_date: alert.alert_date,
      record_time: alert.alert_time,
      subject: alert.equipment,
      main: `${alert.temperature ?? ""}`,
      status: alert.status,
      responsible: null,
      observations: alert.description,
    }, filters.equipment));

  return {
    ok: true,
    data: {
      year,
      month,
      periodLabel: getPeriodLabel(year, month),
      generatedAt: getMadridDateTime(),
      records: records.data,
      temperatures: records.data.filter((record) => record.type === "temperaturas"),
      alerts: filteredAlerts,
      signature: signature.data,
      summary: {
        totalRecords: records.data.length,
        correctRecords: records.data.filter((record) => record.status === "correcto").length,
        reviewRecords: records.data.filter((record) => record.status === "revisar").length,
        incidentRecords: records.data.filter((record) => record.status === "incidencia").length,
        pendingAlerts: filteredAlerts.filter((alert) => alert.status === "pendiente").length,
        inProgressAlerts: filteredAlerts.filter((alert) => alert.status === "en_proceso").length,
        resolvedAlerts: filteredAlerts.filter((alert) => alert.status === "solventado").length,
      },
    },
  };
}

export function appccRecordsToCsv(records: AppccRecord[]) {
  const headers = ["fecha", "hora", "tipo", "equipo_o_area", "dato_principal", "estado", "responsable", "observaciones"];
  const escapeCsv = (value: string | null) => `"${String(value || "").replaceAll('"', '""')}"`;
  const rows = records.map((record) => [
    record.record_date,
    record.record_time?.slice(0, 5) || "",
    record.typeLabel,
    record.subject,
    record.main,
    record.status || "",
    record.responsible || "",
    record.observations || "",
  ]);

  return [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
}

async function countRows(table: string, query = "") {
  const result = await getRows<{ id: string }>(table, `?select=id${query}&limit=1000`);
  return result.ok ? result.data.length : 0;
}

export async function getOperationalAlerts(): Promise<DbResult<OperationalAlert[]>> {
  const today = getMadridDate();
  const soon = addDays(today, 7);
  const activeEquipment = temperatureEquipment.filter((equipment) => equipment.active).map((equipment) => equipment.name);
  const documentStats = getDocumentStats();
  const [inventory, openIncidents, equipmentAlerts, aiLogs, todayTemperatures, recentTemperatures, todayCleaning, todayOil, suppliers, rejectedReceptions, equipmentAssets, productionBatches] = await Promise.all([
    getInventoryProducts(),
    getRows<RecentAdminRecord & { incident_type: string; severity: string | null }>("admin_incident_records", "?select=id,record_date,record_time,responsible,status,incident_type,severity&resolved=eq.false&order=record_date.desc,created_at.desc&limit=50"),
    getRows<EquipmentAlert>("admin_equipment_alerts", "?select=id,equipment,alert_date,alert_time,temperature,alert_level,status,description,corrective_action&status=in.(pendiente,en_proceso)&order=created_at.desc&limit=50"),
    getRecentAiProcessingLogs(50),
    getRows<DashboardTemperatureRecord>("admin_temperature_records", `?select=id,equipment,record_date,record_time,temperature,status,responsible&record_date=eq.${today}&limit=1000`),
    getRows<DashboardTemperatureRecord>("admin_temperature_records", "?select=id,equipment,record_date,record_time,temperature,status,responsible&order=record_date.desc,record_time.desc,created_at.desc&limit=200"),
    getRows<{ id: string }>("admin_cleaning_records", `?select=id&record_date=eq.${today}&limit=1000`),
    getRows<{ id: string }>("admin_fryer_oil_records", `?select=id&record_date=eq.${today}&limit=1000`),
    getRows<{ id: string; supplier: string; cif: string | null; phone: string | null; email: string | null; certificates: string | null; status: string | null }>("admin_supplier_records", "?select=id,supplier,cif,phone,email,certificates,status&status=neq.baja&limit=1000"),
    getRows<{ id: string; supplier: string; product: string; record_date: string }>("admin_goods_reception_records", "?select=id,supplier,product,record_date&accepted=eq.false&order=record_date.desc,created_at.desc&limit=50"),
    getRows<{ id: string; name: string; status: string | null }>("admin_equipment_assets", "?select=id,name,status&limit=1000"),
    getRows<ProductionBatch>("admin_production_batches", `?select=${productionBatchSelect}&output_quantity=gt.0&order=production_date.desc&limit=200`),
  ]);

  const alerts: OperationalAlert[] = [];
  if (documentStats.pending + documentStats.expired + documentStats.review > 0) {
    alerts.push({
      id: "documents-pending",
      type: "documentacion",
      severity: "revisar",
      title: "Documentación sanitaria pendiente",
      detail: `${documentStats.pending + documentStats.expired + documentStats.review} documentos requieren aportación o revisión.`,
      href: "/admin-kiosko/documentacion",
    });
  }

  if (inventory.ok) {
    inventory.data.forEach((product) => {
      if (product.active && product.expiry_date && product.expiry_date <= soon) {
        alerts.push({
          id: `expiry-${product.id}`,
          type: "caducidad",
          severity: product.expiry_date < today ? "incidencia" : "revisar",
          title: product.expiry_date < today ? `${product.name} caducado` : `${product.name} próximo a caducar`,
          detail: product.expiry_date,
          href: "/admin-kiosko/inventario",
        });
      }

      if (product.active && Number(product.current_stock || 0) <= Number(product.minimum_stock || 0)) {
        alerts.push({
          id: `stock-${product.id}`,
          type: "stock",
          severity: "revisar",
          title: product.name,
          detail: `Stock bajo: ${product.current_stock || 0} ${product.unit || "ud"}. Reposición administrativa recomendada.`,
          href: "/admin-kiosko/inventario",
        });
      }

      if (product.active && !product.current_batch) {
        alerts.push({
          id: `batch-${product.id}`,
          type: "administrativo",
          severity: "revisar",
          title: product.name,
          detail: "Producto registrado. Información de lote pendiente de completar si aplica.",
          href: "/admin-kiosko/inventario",
        });
      }
    });
  }

  if (openIncidents.ok) {
    openIncidents.data.forEach((record) => alerts.push({
      id: `incident-${record.id}`,
      type: "incidencia",
      severity: "incidencia",
      title: `${record.incident_type}${record.severity ? ` · ${record.severity}` : ""}`,
      detail: record.status || "Requiere cierre sanitario.",
      href: "/admin-kiosko/incidencias",
    }));
  }

  if (equipmentAlerts.ok) {
    equipmentAlerts.data.forEach((alert) => alerts.push({
      id: `equipment-${alert.id}`,
      type: "temperatura",
      severity: alert.alert_level === "incidencia" ? "incidencia" : "revisar",
      title: alert.equipment,
      detail: alert.alert_level === "incidencia" ? alert.description || "Temperatura fuera de rango. Requiere actuación." : alert.description || "Seguimiento preventivo en curso.",
      href: "/admin-kiosko/temperaturas",
    }));
  }

  if (aiLogs.ok) {
    aiLogs.data.filter((log) => log.status === "error").forEach((log) => alerts.push({
      id: `ai-${log.id}`,
      type: "administrativo",
      severity: "revisar",
      title: log.document_name || "Documento digital",
      detail: "Documento recibido. Revisión administrativa pendiente.",
      href: "/admin-kiosko/ia/historial",
    }));
  }

  if (todayTemperatures.ok) {
    const registeredEquipment = new Set(todayTemperatures.data.filter((record) => isActiveTemperatureEquipment(record.equipment)).map((record) => record.equipment));
    activeEquipment
      .filter((equipment) => !registeredEquipment.has(equipment))
      .forEach((equipment) => {
        const latest = recentTemperatures.ok ? recentTemperatures.data.find((record) => record.equipment === equipment) : null;
        const latestText = latest?.record_date
          ? `Último registro: ${latest.record_date}${latest.record_time ? ` ${latest.record_time.slice(0, 5)}` : ""}.`
          : "Histórico inicial pendiente de consolidar.";
        alerts.push({
          id: `temperature-today-${equipment}`,
          type: "registro-diario",
          severity: "revisar",
          title: equipment,
          detail: `${latestText} Pendiente control correspondiente a la jornada actual.`,
          href: "/admin-kiosko/temperaturas",
        });
      });
  }

  if (todayCleaning.ok && todayCleaning.data.length === 0) {
    alerts.push({
      id: "cleaning-today",
      type: "registro-diario",
      severity: "revisar",
      title: "Limpieza",
      detail: "Pendiente control correspondiente a la jornada actual.",
      href: "/admin-kiosko/limpieza",
    });
  }

  if (todayOil.ok && todayOil.data.length === 0) {
    alerts.push({
      id: "oil-today",
      type: "registro-diario",
      severity: "revisar",
      title: "Aceite de freidora",
      detail: "Pendiente control correspondiente a la jornada actual.",
      href: "/admin-kiosko/aceite-freidora",
    });
  }

  if (suppliers.ok) {
    suppliers.data
      .filter((supplier) => !supplier.cif || !supplier.phone || !supplier.certificates)
      .forEach((supplier) => alerts.push({
        id: `supplier-${supplier.id}`,
        type: "administrativo",
        severity: "revisar",
        title: supplier.supplier,
        detail: "Proveedor registrado. Información administrativa pendiente de completar. No afecta al APPCC.",
        href: `/admin-kiosko/proveedores?q=${encodeURIComponent(supplier.supplier)}`,
      }));
  }

  if (rejectedReceptions.ok) {
    rejectedReceptions.data.forEach((reception) => alerts.push({
      id: `reception-${reception.id}`,
      type: "recepcion",
      severity: "incidencia",
      title: `${reception.supplier} · ${reception.product}`,
      detail: `Recepción rechazada el ${reception.record_date}. Requiere trazabilidad y acción correctora.`,
      href: "/admin-kiosko/recepcion-mercancia",
    }));
  }

  if (equipmentAssets.ok) {
    equipmentAssets.data
      .filter((equipment) => ["averiado", "inoperativo"].includes(String(equipment.status || "").toLowerCase()))
      .forEach((equipment) => alerts.push({
        id: `equipment-asset-${equipment.id}`,
        type: "equipo",
        severity: "incidencia",
        title: equipment.name,
        detail: "Equipo marcado como averiado o inoperativo. Requiere actuación técnica.",
        href: "/admin-kiosko/equipos",
      }));
  }

  if (productionBatches.ok) {
    productionBatches.data
      .filter((batch) => Boolean(batch.expiry_date && batch.expiry_date < today))
      .forEach((batch) => alerts.push({
        id: `production-expired-${batch.id}`,
        type: "caducidad",
        severity: "incidencia",
        title: batch.batch_code || batch.output_product || "Lote interno",
        detail: batch.storage_state === "descongelado"
          ? "Producto descongelado pasado de fecha. Requiere actuación según APPCC interno."
          : "Lote interno pasado de fecha. Requiere actuación.",
        href: `/admin-kiosko/produccion?batch=${encodeURIComponent(batch.id)}`,
      }));
  }

  return { ok: true, data: alerts.slice(0, 50) };
}

export async function getExecutiveDashboardMetrics(): Promise<DbResult<ExecutiveDashboardMetrics>> {
  const today = getMadridDate();
  const weekStart = startOfWeek(today);
  const monthStart = firstDayOfMonth(today);
  const soon = addDays(today, 7);
  const [inventory, alerts, latestInspection, productionMetrics] = await Promise.all([
    getInventoryProducts(),
    getOperationalAlerts(),
    getRecentInspectionRecords(),
    getProductionMetrics(),
  ]);

  const documentStats = getDocumentStats();
  const activeProducts = inventory.ok ? inventory.data.filter((product) => product.active).length : 0;
  const activeLots = inventory.ok ? new Set(inventory.data.filter((product) => product.active && product.current_batch).map((product) => product.current_batch)).size : 0;
  const expiringProducts = inventory.ok ? inventory.data.filter((product) => product.active && product.expiry_date && product.expiry_date <= soon).length : 0;
  const lowStockProducts = inventory.ok ? inventory.data.filter((product) => product.active && Number(product.current_stock || 0) <= Number(product.minimum_stock || 0)).length : 0;
  const criticalStockProducts = inventory.ok ? inventory.data.filter((product) => product.active && Number(product.current_stock || 0) <= 0).length : 0;
  const outOfRangeEquipment = alerts.ok ? alerts.data.filter((alert) => alert.type === "temperatura").length : 0;
  const openIncidents = await countRows("admin_incident_records", "&resolved=eq.false");
  const pendingMaintenance = await countRows("admin_equipment_assets", `&next_maintenance=lte.${soon}&status=neq.baja`);
  const waterToday = await countRows("admin_water_records", `&record_date=eq.${today}`);
  const ocrToReview = await countRows("admin_supplier_documents", "&ocr_status=eq.revisar");
  const rejectedReceptions = await countRows("admin_goods_reception_records", "&accepted=eq.false");
  const recordsTodayResult = await getAppccRecords({ type: "todos", dateFrom: today, dateTo: today });
  const recordsWeekResult = await getAppccRecords({ type: "todos", dateFrom: weekStart, dateTo: today });
  const recordsMonthResult = await getAppccRecords({ type: "todos", dateFrom: monthStart, dateTo: today });
  const incidentAlerts = alerts.ok ? alerts.data.filter((alert) => alert.severity === "incidencia").length : 0;
  const reviewAlerts = alerts.ok ? alerts.data.filter((alert) => alert.severity === "revisar").length : 0;

  return {
    ok: true,
    data: {
      receptionsThisMonth: await countRows("admin_goods_reception_records", `&record_date=gte.${monthStart}`),
      ocrProcessed: await countRows("admin_ai_processing_logs", "&status=not.eq.error"),
      activeProducts,
      activeLots,
      expiringProducts,
      openIncidents,
      outOfRangeEquipment,
      temperaturesToday: await countRows("admin_temperature_records", `&record_date=eq.${today}`),
      recordsToday: recordsTodayResult.ok ? recordsTodayResult.data.length : 0,
      recordsWeek: recordsWeekResult.ok ? recordsWeekResult.data.length : 0,
      recordsMonth: recordsMonthResult.ok ? recordsMonthResult.data.length : 0,
      pendingDocuments: documentStats.pending + documentStats.expired + documentStats.review,
      lowStockProducts,
      criticalStockProducts,
      pendingMaintenance,
      waterToday,
      ocrToReview,
      rejectedReceptions,
      activeInternalBatches: productionMetrics.ok ? productionMetrics.data.activeInternalBatches : 0,
      openDefrostedBatches: productionMetrics.ok ? productionMetrics.data.openDefrostedBatches : 0,
      productsToConsumeSoon: productionMetrics.ok ? productionMetrics.data.productsToConsumeSoon : 0,
      expiredDefrostedBatches: productionMetrics.ok ? productionMetrics.data.expiredDefrostedBatches : 0,
      monthlyWasteMovements: productionMetrics.ok ? productionMetrics.data.monthlyWasteMovements : 0,
      recentProductions: productionMetrics.ok ? productionMetrics.data.recentProductions : [],
      temperatureCompliancePercent: Math.max(0, Math.min(100, Math.round((1 - (outOfRangeEquipment / Math.max(1, temperatureEquipment.filter((equipment) => equipment.active).length))) * 100))),
      receptionCompliancePercent: rejectedReceptions > 0 ? 0 : 100,
      cleaningCompliancePercent: await countRows("admin_cleaning_records", `&record_date=eq.${today}`) > 0 ? 100 : 0,
      latestInspection: latestInspection.ok && latestInspection.data[0] ? latestInspection.data[0].main : "Sin inspecciones registradas",
      healthStatus: incidentAlerts > 0 ? "Incidencias" : reviewAlerts > 0 ? "Revisar" : "Correcto",
      alerts: alerts.ok ? alerts.data : [],
      dailyPending: alerts.ok ? alerts.data.filter((alert) => alert.type === "registro-diario") : [],
    },
  };
}
