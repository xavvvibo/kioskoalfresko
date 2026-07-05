import { adminSupabaseRequest, getProductionBatchById, type ProductionBatch, type ProductionMovement } from "./legacy-core";

type DbResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export type BatchConsumptionStatus = "registered" | "complete" | "simulated";

export type BatchConsumption = {
  id: string;
  batchId: string;
  batchCode: string;
  recipeId: string;
  recipeName: string;
  quantity: number;
  unit: string;
  consumedAt: string;
  consumedBy: string;
  notes: string;
  status: BatchConsumptionStatus;
};

export type RegisterBatchConsumptionInput = {
  batchId: string;
  recipeId?: string;
  recipeName: string;
  quantity: number;
  unit: string;
  consumedAt: string;
  consumedBy: string;
  notes?: string;
};

const LOGICAL_CONSUMPTION_TYPE = "consumo_logico";
const LEGACY_CONSUMPTION_TYPES = ["consumo", "personal", "invitacion", "degustacion", "merma"];
const INACTIVE_STORAGE_STATES = ["bloqueado", "blocked", "descartado", "discarded", "mermado", "consumido", "consumed", "personal"];

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function dateTimeFromMovement(movement: ProductionMovement) {
  const date = cleanText(movement.movement_date) || cleanText(movement.created_at).slice(0, 10);
  const time = cleanText(movement.movement_time).slice(0, 5) || cleanText(movement.created_at).slice(11, 16) || "00:00";
  return `${date} ${time}`;
}

function parseConsumptionPayload(value?: string | null) {
  const raw = cleanText(value);
  if (!raw.startsWith("{")) return {};

  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function consumptionFromMovement(batch: ProductionBatch, movement: ProductionMovement): BatchConsumption | null {
  const movementType = cleanText(movement.movement_type);
  if (movementType !== LOGICAL_CONSUMPTION_TYPE && !LEGACY_CONSUMPTION_TYPES.includes(movementType)) return null;

  const payload = parseConsumptionPayload(movement.observations);
  const recipeName = cleanText(payload.recipeName) || cleanText(movement.reason) || (movementType === LOGICAL_CONSUMPTION_TYPE ? "Receta no indicada" : movementType);
  const status = cleanText(payload.status) as BatchConsumptionStatus;

  return {
    id: movement.id,
    batchId: cleanText(movement.batch_id) || batch.id,
    batchCode: cleanText(batch.batch_code),
    recipeId: cleanText(payload.recipeId),
    recipeName,
    quantity: Number(movement.quantity || 0),
    unit: cleanText(movement.unit) || cleanText(batch.output_unit) || "ud",
    consumedAt: cleanText(payload.consumedAt) || dateTimeFromMovement(movement),
    consumedBy: cleanText(payload.consumedBy) || cleanText(movement.responsible),
    notes: cleanText(payload.notes) || (movementType === LOGICAL_CONSUMPTION_TYPE ? "" : cleanText(movement.observations)),
    status: status === "complete" || status === "simulated" ? status : "registered",
  };
}

export function getBatchConsumptionsFromBatch(batch: ProductionBatch): BatchConsumption[] {
  return (batch.movements || [])
    .map((movement) => consumptionFromMovement(batch, movement))
    .filter((consumption): consumption is BatchConsumption => Boolean(consumption))
    .sort((a, b) => b.consumedAt.localeCompare(a.consumedAt));
}

function isBatchActive(batch: ProductionBatch) {
  const storage = cleanText(batch.storage_state).toLowerCase();
  const quantity = Number(batch.output_quantity || 0);
  return quantity > 0 && !INACTIVE_STORAGE_STATES.includes(storage);
}

export async function registerBatchConsumption(input: RegisterBatchConsumptionInput): Promise<DbResult<BatchConsumption>> {
  if (!cleanText(input.batchId)) return { ok: false, error: "Falta lote interno." };
  if (!cleanText(input.recipeName)) return { ok: false, error: "La receta es obligatoria." };
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) return { ok: false, error: "La cantidad debe ser mayor que cero." };

  const batchResult = await getProductionBatchById(input.batchId);
  if (!batchResult.ok) return batchResult;
  const batch = batchResult.data;
  if (!batch) return { ok: false, error: "Lote interno no localizado." };
  if (!isBatchActive(batch)) return { ok: false, error: "El lote no esta activo para registrar consumo." };

  const consumedAt = cleanText(input.consumedAt);
  const [movementDate, movementTime = "00:00"] = consumedAt.split(" ");
  const payload = {
    kind: "BatchConsumption",
    recipeId: cleanText(input.recipeId),
    recipeName: cleanText(input.recipeName),
    consumedAt,
    consumedBy: cleanText(input.consumedBy),
    notes: cleanText(input.notes),
    status: "registered" satisfies BatchConsumptionStatus,
    stockMutation: false,
  };

  const inserted = await adminSupabaseRequest<Array<{ id: string; created_at: string }>>("admin_production_movements", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      batch_id: batch.id,
      movement_date: cleanText(movementDate) || new Date().toISOString().slice(0, 10),
      movement_time: cleanText(movementTime).slice(0, 5),
      movement_type: LOGICAL_CONSUMPTION_TYPE,
      quantity: input.quantity,
      unit: cleanText(input.unit) || cleanText(batch.output_unit) || "ud",
      from_state: cleanText(batch.storage_state) || "refrigerado",
      to_state: cleanText(batch.storage_state) || "refrigerado",
      reason: cleanText(input.recipeName),
      responsible: cleanText(input.consumedBy),
      observations: JSON.stringify(payload),
    }),
  });
  if (!inserted.ok) return inserted;

  const id = inserted.data[0]?.id || "";
  return {
    ok: true,
    data: {
      id,
      batchId: batch.id,
      batchCode: cleanText(batch.batch_code),
      recipeId: payload.recipeId,
      recipeName: payload.recipeName,
      quantity: input.quantity,
      unit: cleanText(input.unit) || cleanText(batch.output_unit) || "ud",
      consumedAt,
      consumedBy: payload.consumedBy,
      notes: payload.notes,
      status: "registered",
    },
  };
}
