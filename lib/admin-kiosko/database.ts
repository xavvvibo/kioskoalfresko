import { evaluateTemperature, isActiveTemperatureEquipment, getTemperatureEquipment, temperatureEquipment } from "./temperature-rules";

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
  phone?: string;
  email?: string;
  category?: string;
  certificates?: string;
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
    phone: cleanText(data.phone),
    email: cleanText(data.email),
    category: cleanText(data.category),
    certificates: cleanText(data.certificates),
    observations: cleanText(data.observations),
  });
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
