import { evaluateTemperature } from "./temperature-rules";

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

export async function getRecentTemperatureRecords(): Promise<DbResult<RecentAdminRecord[]>> {
  const result = await getRecentRows<RecentAdminRecord & { equipment: string; temperature: number }>(
    "admin_temperature_records",
    "id,record_date,record_time,responsible,status,equipment,temperature",
  );

  if (!result.ok) return result;

  return {
    ok: true,
    data: result.data.map((record) => ({
      ...record,
      main: `${record.equipment} · ${record.temperature} °C`,
    })),
  };
}

export async function getOpenEquipmentAlerts(): Promise<DbResult<EquipmentAlert[]>> {
  return supabaseRequest<EquipmentAlert[]>("admin_equipment_alerts", {
    method: "GET",
    query: "?select=id,equipment,alert_date,alert_time,temperature,alert_level,status,description,corrective_action&status=in.(pendiente,en_proceso)&order=created_at.desc&limit=10",
  });
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
