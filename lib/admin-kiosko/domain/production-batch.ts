import { getBatchConsumptionsFromBatch, type BatchConsumption } from "../repositories/batch-consumption.repository";
import type { PrintJob, PrintJobPayload } from "../repositories/print-jobs.repository";
import type { ProductionBatch as LegacyProductionBatch, ProductionMovement } from "../repositories/legacy-core";
import { buildPreparationTraceabilityQrUrl } from "../printing/print-payload";

export const PRODUCTION_BATCH_STATUSES = [
  "ACTIVE",
  "NEAR_EXPIRY",
  "EXPIRED",
  "BLOCKED",
  "CONSUMED",
  "DISCARDED",
] as const;

export type ProductionBatchStatus = typeof PRODUCTION_BATCH_STATUSES[number];

export type ProductionBatchIngredientUsed = {
  productName: string;
  supplierName: string;
  batchNumber: string;
  quantity: number | null;
  unit: string;
  documentId: string;
};

export type ProductionBatchPrintJob = {
  id: string;
  status: PrintJob["status"];
  template: string;
  title: string;
  line1: string;
  line2: string;
  attempts: number;
  createdAt: string;
  printedAt: string | null;
  error: string | null;
};

export type ProductionBatchDocument = {
  id: string;
  type: "source_document" | "label_record";
  label: string;
  createdAt?: string;
};

export type ProductionBatchAppccRecord = {
  id: string;
  label: string;
  status: "ok" | "warning" | "pending";
  detail: string;
  createdAt?: string;
};

export type ProductionBatchLifeSummary = {
  producedQuantity: number;
  consumedQuantity: number;
  pendingQuantity: number;
  unit: string;
  simulated: boolean;
};

export type ProductionBatchTimelineEvent = {
  id: string;
  occurredAt: string;
  label: string;
  detail: string;
  tone: "neutral" | "success" | "warning" | "danger";
};

export type ProductionBatch = {
  id: string;
  batchCode: string;
  recipeId: string | null;
  recipeName: string;
  productionDateTime: string;
  expiryDateTime: string | null;
  status: ProductionBatchStatus;
  responsibleUser: string;
  storageCondition: string;
  notes: string;
  quantity: number | null;
  unit: string;
  qrValue: string;
  remainingLifeLabel: string;
  ingredientsUsed: ProductionBatchIngredientUsed[];
  printJobs: ProductionBatchPrintJob[];
  documents: ProductionBatchDocument[];
  appcc: ProductionBatchAppccRecord[];
  consumptions: BatchConsumption[];
  lifeSummary: ProductionBatchLifeSummary;
  timeline: ProductionBatchTimelineEvent[];
};

const CONSUMPTION_MOVEMENT_TYPES = ["consumo", "consumo_logico", "personal", "invitacion", "degustacion", "merma"];
const BLOCKED_STATES = ["bloqueado", "blocked"];
const DISCARDED_STATES = ["descartado", "mermado", "discarded"];
const CONSUMED_STATES = ["consumido", "consumed", "personal"];

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function payloadRecord(payload: PrintJobPayload, key: string) {
  const value = payload[key];
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function payloadText(payload: PrintJobPayload, key: string) {
  return cleanText(payload[key]);
}

function recordText(record: Record<string, unknown>, key: string) {
  return cleanText(record[key]);
}

export function printJobMatchesProductionBatch(job: PrintJob, batchId: string, batchCode: string) {
  const data = payloadRecord(job.payload, "data");
  const metadata = payloadRecord(job.payload, "metadata");
  const candidates = [
    recordText(data, "batchCode"),
    recordText(metadata, "batchCode"),
    recordText(metadata, "sourceId"),
  ].filter(Boolean);

  return candidates.includes(batchCode) || recordText(metadata, "sourceId") === batchId;
}

function dateTimeFromParts(date?: string | null, time?: string | null) {
  const safeDate = cleanText(date);
  if (!safeDate) return "";
  const safeTime = cleanText(time).slice(0, 5) || "00:00";
  return `${safeDate} ${safeTime}`;
}

function dateFromDateTime(value: string) {
  if (!value) return null;
  const [date, time = "00:00"] = value.split(" ");
  const parsed = new Date(`${date}T${time.slice(0, 5)}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDuration(ms: number) {
  const minutesTotal = Math.max(0, Math.round(ms / 60000));
  const days = Math.floor(minutesTotal / 1440);
  const hours = Math.floor((minutesTotal % 1440) / 60);
  const minutes = minutesTotal % 60;
  const parts = [
    days ? `${days} ${days === 1 ? "dia" : "dias"}` : "",
    hours ? `${hours} ${hours === 1 ? "hora" : "horas"}` : "",
    minutes || (!days && !hours) ? `${minutes} ${minutes === 1 ? "minuto" : "minutos"}` : "",
  ].filter(Boolean);

  return parts.join(" ");
}

export function getRemainingLifeLabel(expiryDateTime: string | null, now = new Date()) {
  const expiry = expiryDateTime ? dateFromDateTime(expiryDateTime) : null;
  if (!expiry) return "Sin caducidad informada";

  const delta = expiry.getTime() - now.getTime();
  if (delta < 0) return `Caducado hace ${formatDuration(Math.abs(delta))}`;
  return `Caduca en ${formatDuration(delta)}`;
}

export function calculateProductionBatchStatus(batch: LegacyProductionBatch, now = new Date()): ProductionBatchStatus {
  const storage = cleanText(batch.storage_state).toLowerCase();
  const quantity = Number(batch.output_quantity || 0);

  if (BLOCKED_STATES.includes(storage)) return "BLOCKED";
  if (DISCARDED_STATES.includes(storage)) return "DISCARDED";
  if (CONSUMED_STATES.includes(storage) || quantity <= 0) return "CONSUMED";

  const expiryDateTime = dateTimeFromParts(batch.expiry_date, batch.production_time);
  const expiry = dateFromDateTime(expiryDateTime);
  if (!expiry) return "ACTIVE";

  const delta = expiry.getTime() - now.getTime();
  if (delta < 0) return "EXPIRED";
  if (delta <= 24 * 60 * 60 * 1000) return "NEAR_EXPIRY";
  return "ACTIVE";
}

function mapIngredientsUsed(batch: LegacyProductionBatch): ProductionBatchIngredientUsed[] {
  if (!batch.source_product && !batch.source_batch_number && !batch.source_supplier && !batch.input_quantity) return [];

  return [{
    productName: batch.source_product || "Materia prima no consignada",
    supplierName: batch.source_supplier || "",
    batchNumber: batch.source_batch_number || "",
    quantity: batch.input_quantity,
    unit: batch.input_unit || "ud",
    documentId: batch.source_document_id || "",
  }];
}

function mapPrintJobs(printJobs: PrintJob[]): ProductionBatchPrintJob[] {
  return printJobs.map((job) => ({
    id: job.id,
    status: job.status,
    template: payloadText(job.payload, "template"),
    title: payloadText(job.payload, "title"),
    line1: payloadText(job.payload, "line1"),
    line2: payloadText(job.payload, "line2"),
    attempts: job.attempts,
    createdAt: job.created_at,
    printedAt: job.printed_at,
    error: job.error,
  }));
}

function mapDocuments(batch: LegacyProductionBatch): ProductionBatchDocument[] {
  const sourceDocument = batch.source_document_id
    ? [{
        id: batch.source_document_id,
        type: "source_document" as const,
        label: "Documento origen materia prima",
      }]
    : [];
  const labelDocuments = (batch.labels || []).map((label) => ({
    id: label.id,
    type: "label_record" as const,
    label: `Etiqueta ${label.template || label.model || "APPCC"}`,
    createdAt: label.created_at,
  }));

  return [...sourceDocument, ...labelDocuments];
}

function mapAppcc(batch: LegacyProductionBatch): ProductionBatchAppccRecord[] {
  const appcc: ProductionBatchAppccRecord[] = [];

  appcc.push({
    id: "expiry",
    label: "Caducidad",
    status: batch.expiry_date ? "ok" : "warning",
    detail: batch.expiry_date ? `Caducidad registrada: ${batch.expiry_date}` : "Pendiente de informar caducidad.",
  });

  appcc.push({
    id: "storage",
    label: "Conservacion",
    status: batch.storage_state ? "ok" : "pending",
    detail: batch.storage_state || "Pendiente de informar conservacion.",
  });

  if (batch.labels?.length) {
    appcc.push({
      id: "labels",
      label: "Registro de etiqueta",
      status: "ok",
      detail: `${batch.labels.length} registro(s) APPCC/etiqueta asociados.`,
    });
  }

  return appcc;
}

function buildLifeSummary(batch: LegacyProductionBatch, consumptions: BatchConsumption[]): ProductionBatchLifeSummary {
  const producedQuantity = Number(batch.output_quantity || 0);
  const consumedQuantity = consumptions.reduce((total, consumption) => total + Number(consumption.quantity || 0), 0);

  return {
    producedQuantity,
    consumedQuantity,
    pendingQuantity: Math.max(0, producedQuantity - consumedQuantity),
    unit: batch.output_unit || consumptions[0]?.unit || "ud",
    simulated: true,
  };
}

function movementTone(movement: ProductionMovement): ProductionBatchTimelineEvent["tone"] {
  const type = cleanText(movement.movement_type);
  if (type === "merma") return "warning";
  if (CONSUMPTION_MOVEMENT_TYPES.includes(type)) return "neutral";
  return "success";
}

function buildTimeline(batch: LegacyProductionBatch, printJobs: ProductionBatchPrintJob[], appcc: ProductionBatchAppccRecord[], consumptions: BatchConsumption[], lifeSummary: ProductionBatchLifeSummary): ProductionBatchTimelineEvent[] {
  const events: ProductionBatchTimelineEvent[] = [{
    id: `production-${batch.id}`,
    occurredAt: dateTimeFromParts(batch.production_date, batch.production_time) || batch.created_at,
    label: "Produccion registrada",
    detail: `${batch.output_product || "Preparacion"} · ${batch.output_quantity ?? 0} ${batch.output_unit || "ud"}`,
    tone: "success",
  }];

  (batch.movements || []).forEach((movement) => {
    if (CONSUMPTION_MOVEMENT_TYPES.includes(cleanText(movement.movement_type))) return;

    events.push({
      id: `movement-${movement.id}`,
      occurredAt: dateTimeFromParts(movement.movement_date, movement.movement_time) || movement.created_at,
      label: movement.movement_type || "Movimiento",
      detail: `${movement.quantity ?? 0} ${movement.unit || batch.output_unit || "ud"} · ${movement.from_state || "-"} -> ${movement.to_state || "-"}`,
      tone: movementTone(movement),
    });
  });

  printJobs.forEach((job) => {
    events.push({
      id: `print-${job.id}`,
      occurredAt: job.printedAt || job.createdAt,
      label: job.status === "printed" ? "Etiqueta GoDEX enviada a impresora" : job.status === "error" ? "Error impresion GoDEX" : "Etiqueta GoDEX enviada",
      detail: `${job.template || "template"} · ${job.id.slice(0, 8)}`,
      tone: job.status === "printed" ? "success" : job.status === "error" ? "danger" : "neutral",
    });
  });

  appcc.forEach((record) => {
    events.push({
      id: `appcc-${record.id}`,
      occurredAt: record.createdAt || batch.created_at,
      label: `APPCC: ${record.label}`,
      detail: record.detail,
      tone: record.status === "warning" ? "warning" : "neutral",
    });
  });

  consumptions.forEach((consumption) => {
    events.push({
      id: `consumption-${consumption.id}`,
      occurredAt: consumption.consumedAt,
      label: "Consumo registrado",
      detail: `${consumption.recipeName} · ${consumption.quantity} ${consumption.unit}`,
      tone: "neutral",
    });
  });

  if (consumptions.length && lifeSummary.pendingQuantity <= 0) {
    events.push({
      id: `consumption-complete-${batch.id}`,
      occurredAt: consumptions[0].consumedAt,
      label: "Consumo completo",
      detail: `Consumo logico acumulado: ${lifeSummary.consumedQuantity} ${lifeSummary.unit}`,
      tone: "warning",
    });
  }

  return events.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
}

export function buildProductionBatchTraceability(batch: LegacyProductionBatch, matchingPrintJobs: PrintJob[], now = new Date()): ProductionBatch {
  const batchCode = batch.batch_code || "";
  const productionDateTime = dateTimeFromParts(batch.production_date, batch.production_time);
  const expiryDateTime = batch.expiry_date ? dateTimeFromParts(batch.expiry_date, batch.production_time) : null;
  const printJobs = mapPrintJobs(matchingPrintJobs);
  const appcc = mapAppcc(batch);
  const consumptions = getBatchConsumptionsFromBatch(batch);
  const lifeSummary = buildLifeSummary(batch, consumptions);

  return {
    id: batch.id,
    batchCode,
    recipeId: null,
    recipeName: batch.output_product || "Preparacion",
    productionDateTime,
    expiryDateTime,
    status: calculateProductionBatchStatus(batch, now),
    responsibleUser: batch.responsible || "",
    storageCondition: batch.storage_state || "refrigerado",
    notes: batch.observations || "",
    quantity: batch.output_quantity,
    unit: batch.output_unit || "ud",
    qrValue: buildPreparationTraceabilityQrUrl({ productionBatchId: batch.id, batchCode }) || "",
    remainingLifeLabel: getRemainingLifeLabel(expiryDateTime, now),
    ingredientsUsed: mapIngredientsUsed(batch),
    printJobs,
    documents: mapDocuments(batch),
    appcc,
    consumptions,
    lifeSummary,
    timeline: buildTimeline(batch, printJobs, appcc, consumptions, lifeSummary),
  };
}
