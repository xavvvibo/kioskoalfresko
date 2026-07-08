import "server-only";
import { adminSupabaseRequest } from "./legacy-core";

export type PrintJobStatus = "queued" | "claimed" | "sending" | "sent_unconfirmed" | "printed" | "error" | "cancelled";

export type PrintJobPayload = {
  title?: string;
  line1?: string;
  line2?: string;
  nombre_producto?: string;
  lote?: string;
  fecha_elaboracion?: string;
  fecha_caducidad?: string;
  alergenos?: string[] | string;
  codigo_barras?: string;
  cantidad?: string | number;
  responsable?: string;
  proveedor?: string;
  tipo?: string;
  copies?: number;
  [key: string]: unknown;
};

export type PrintJob = {
  id: string;
  printer_key: string;
  status: PrintJobStatus;
  payload: PrintJobPayload;
  idempotency_key?: string | null;
  attempts: number;
  claimed_at: string | null;
  transport_started_at?: string | null;
  printed_at: string | null;
  sent_at?: string | null;
  sent_unconfirmed_at?: string | null;
  transport_confirmed_at?: string | null;
  transport_confirmation_source?: string | null;
  transport_confirmed_by?: string | null;
  transport_confirmation_note?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancel_reason?: string | null;
  last_transport_result?: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  claimed_from_status?: "queued";
};

export type LegacyPrintJob = PrintJob & {
  label_type: string;
  payload_json: PrintJobPayload;
  error_message: string | null;
};

type SupabasePrintJobRow = {
  id: string;
  printer_key: string;
  status: PrintJobStatus;
  payload: PrintJobPayload;
  idempotency_key?: string | null;
  attempts: number;
  claimed_at: string | null;
  transport_started_at?: string | null;
  printed_at: string | null;
  sent_at?: string | null;
  sent_unconfirmed_at?: string | null;
  transport_confirmed_at?: string | null;
  transport_confirmation_source?: string | null;
  transport_confirmed_by?: string | null;
  transport_confirmation_note?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancel_reason?: string | null;
  last_transport_result?: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  claimed_from_status?: "queued";
};

export type CreatePrintJobInput = {
  printerKey: string;
  labelType?: string;
  payload: PrintJobPayload;
};

export type EnqueuePrintJobInput = {
  printerKey: string;
  payload: PrintJobPayload;
};

export type PrintJobListFilters = {
  limit?: number;
  status?: string;
  template?: string;
  sourceType?: string;
  sourceId?: string;
  reason?: string;
  idempotencyKey?: string;
  printerKey?: string;
  search?: string;
};

const selectPrintJobBase = "id,printer_key,status,payload,idempotency_key,attempts,claimed_at,printed_at,error,created_at,updated_at";
const selectPrintJob = `${selectPrintJobBase},transport_started_at,sent_at,sent_unconfirmed_at,transport_confirmed_at,transport_confirmation_source,transport_confirmed_by,transport_confirmation_note,cancelled_at,cancelled_by,cancel_reason,last_transport_result`;
const reprintReasonMinLength = 6;

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePayload(value: unknown): PrintJobPayload {
  return value && typeof value === "object" && !Array.isArray(value) ? value as PrintJobPayload : {};
}

function payloadRecord(payload: PrintJobPayload, key: string) {
  const value = payload[key];
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function payloadText(payload: PrintJobPayload, key: string) {
  const value = payload[key];
  return typeof value === "string" ? value : "";
}

function metadataText(payload: PrintJobPayload, key: string) {
  const value = payloadRecord(payload, "metadata")[key];
  return typeof value === "string" ? value : "";
}

function isMissingColumnError(result: { ok: false; error: string }, column: string) {
  return result.error.includes(column) && (result.error.includes("PGRST204") || result.error.includes("does not exist"));
}

function isMissingAnyColumnError(result: { ok: false; error: string }, columns: string[]) {
  return columns.some((column) => isMissingColumnError(result, column));
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function simpleHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function ensurePayloadIdempotencyKey(printerKey: string, payload: PrintJobPayload) {
  const metadata = payloadRecord(payload, "metadata");
  const current = cleanText(metadata.idempotencyKey);
  if (current) return payload;

  const generated = `print_job:${simpleHash(`${printerKey}:${stableStringify({
    template: payload.template,
    data: payload.data,
    metadata: {
      sourceType: metadata.sourceType,
      sourceId: metadata.sourceId,
      reason: metadata.reason,
      copiedFromJobId: metadata.copiedFromJobId,
      reprintReason: metadata.reprintReason,
    },
  })}`)}`;

  return {
    ...payload,
    metadata: {
      ...metadata,
      idempotencyKey: generated,
    },
  };
}

export function isValidReprintReason(value: unknown) {
  return cleanText(value).length >= reprintReasonMinLength;
}

export function buildReprintPayload(originalPayload: PrintJobPayload, originalJobId: string, reason: string, reprintRequestId?: string): PrintJobPayload | null {
  const cleanReason = cleanText(reason).slice(0, 160);
  const originalId = cleanText(originalJobId);
  const requestId = cleanText(reprintRequestId) || crypto.randomUUID();
  if (!originalId || !isValidReprintReason(cleanReason)) return null;

  return {
    ...originalPayload,
    metadata: {
      ...payloadRecord(originalPayload, "metadata"),
      copiedFromJobId: originalId,
      reason: "reprint",
      reprintReason: cleanReason,
      createdFrom: "erp_ui",
      module: "printing",
      reprintRequestId: requestId,
      idempotencyKey: `reprint:${originalId}:${requestId}`,
    },
  };
}

function toPrintJob(row: SupabasePrintJobRow): PrintJob {
  return {
    ...row,
    payload: normalizePayload(row.payload),
  };
}

function toLegacyPrintJob(row: SupabasePrintJobRow, labelType = "test_label"): LegacyPrintJob {
  const job = toPrintJob(row);
  return toLegacyFromPrintJob(job, labelType);
}

function toLegacyFromPrintJob(job: PrintJob, labelType = "test_label"): LegacyPrintJob {
  return {
    ...job,
    label_type: labelType,
    payload_json: job.payload,
    error_message: job.error,
  };
}

function legacyPayloadToBridgePayload(input: CreatePrintJobInput): PrintJobPayload {
  const payload = normalizePayload(input.payload);

  if (cleanText(payload.title) || cleanText(payload.line1) || cleanText(payload.line2)) {
    return {
      title: cleanText(payload.title),
      line1: cleanText(payload.line1),
      line2: cleanText(payload.line2),
    };
  }

  return {
    title: cleanText(payload.nombre_producto) || cleanText(input.labelType) || "Etiqueta ERP",
    line1: cleanText(payload.lote) ? `Lote ${cleanText(payload.lote)}` : cleanText(payload.proveedor),
    line2: cleanText(payload.fecha_caducidad) ? `Cad. ${cleanText(payload.fecha_caducidad)}` : cleanText(payload.fecha_elaboracion),
  };
}

export async function enqueuePrintJob(input: EnqueuePrintJobInput) {
  const printerKey = cleanText(input.printerKey);
  const payload = printerKey ? ensurePayloadIdempotencyKey(printerKey, normalizePayload(input.payload)) : normalizePayload(input.payload);

  if (!printerKey) return { ok: false as const, error: "printer_key es obligatorio." };
  if (!Object.keys(payload).length) {
    return { ok: false as const, error: "payload/data es obligatorio." };
  }

  const idempotencyKey = metadataText(payload, "idempotencyKey");
  if (idempotencyKey) {
    const existing = await getRecentPrintJobs({ limit: 1, printerKey, idempotencyKey });
    if (!existing.ok) return existing;
    if (existing.data[0]) return { ok: true as const, data: existing.data[0], idempotent: true as const };
  }

  const result = await adminSupabaseRequest<SupabasePrintJobRow[]>("print_jobs", {
    method: "POST",
    query: `?select=${selectPrintJob}`,
    body: JSON.stringify({
      printer_key: printerKey,
      payload,
      payload_json: payload,
      idempotency_key: idempotencyKey || null,
      status: "queued",
    }),
    headers: { Prefer: "return=representation" },
  });

  if (!result.ok && isMissingAnyColumnError(result, [
    "sent_at",
    "sent_unconfirmed_at",
    "transport_confirmed_at",
    "transport_confirmation_source",
    "transport_confirmed_by",
    "transport_confirmation_note",
    "cancelled_at",
    "cancelled_by",
    "cancel_reason",
    "last_transport_result",
  ])) {
    const retry = await adminSupabaseRequest<SupabasePrintJobRow[]>("print_jobs", {
      method: "POST",
      query: `?select=${selectPrintJobBase}`,
      body: JSON.stringify({
        printer_key: printerKey,
        payload,
        payload_json: payload,
        idempotency_key: idempotencyKey || null,
        status: "queued",
      }),
      headers: { Prefer: "return=representation" },
    });
    if (!retry.ok) return retry;
    return { ok: true as const, data: toPrintJob(retry.data[0]) };
  }
  if (!result.ok) return result;
  return { ok: true as const, data: toPrintJob(result.data[0]) };
}

export async function getPrintJobById(id: string) {
  const jobId = cleanText(id);
  if (!jobId) return { ok: false as const, error: "id es obligatorio." };

  const result = await adminSupabaseRequest<SupabasePrintJobRow[]>("print_jobs", {
    method: "GET",
    query: `?select=${selectPrintJob}&id=eq.${encodeURIComponent(jobId)}&limit=1`,
  });

  if (!result.ok && isMissingAnyColumnError(result, [
    "sent_at",
    "sent_unconfirmed_at",
    "transport_confirmed_at",
    "transport_confirmation_source",
    "transport_confirmed_by",
    "transport_confirmation_note",
    "cancelled_at",
    "cancelled_by",
    "cancel_reason",
    "last_transport_result",
  ])) {
    const retry = await adminSupabaseRequest<SupabasePrintJobRow[]>("print_jobs", {
      method: "GET",
      query: `?select=${selectPrintJobBase}&id=eq.${encodeURIComponent(jobId)}&limit=1`,
    });
    if (!retry.ok) return retry;
    if (!retry.data[0]) return { ok: true as const, data: null };
    return { ok: true as const, data: toPrintJob(retry.data[0]) };
  }
  if (!result.ok) return result;
  if (!result.data[0]) return { ok: true as const, data: null };
  return { ok: true as const, data: toPrintJob(result.data[0]) };
}

function matchesPrintJobFilters(job: PrintJob, filters: PrintJobListFilters) {
  const template = cleanText(filters.template);
  const sourceType = cleanText(filters.sourceType);
  const sourceId = cleanText(filters.sourceId);
  const reason = cleanText(filters.reason);
  const idempotencyKey = cleanText(filters.idempotencyKey);
  const search = cleanText(filters.search).toLowerCase();

  if (template && payloadText(job.payload, "template") !== template) return false;
  if (sourceType && metadataText(job.payload, "sourceType") !== sourceType) return false;
  if (sourceId && metadataText(job.payload, "sourceId") !== sourceId) return false;
  if (reason && metadataText(job.payload, "reason") !== reason) return false;
  if (idempotencyKey && cleanText(job.idempotency_key) !== idempotencyKey && metadataText(job.payload, "idempotencyKey") !== idempotencyKey) return false;

  if (search) {
    const haystack = [
      job.id,
      metadataText(job.payload, "sourceId"),
      payloadText(job.payload, "title"),
    ].join(" ").toLowerCase();
    if (!haystack.includes(search)) return false;
  }

  return true;
}

export async function getRecentPrintJobs(filtersOrLimit: PrintJobListFilters | number = 50) {
  const filters = typeof filtersOrLimit === "number" ? { limit: filtersOrLimit } : filtersOrLimit;
  const safeLimit = Math.max(1, Math.min(200, Math.round(filters.limit || 50)));
  const query = new URLSearchParams({
    select: selectPrintJob,
    order: "created_at.desc",
    limit: String(safeLimit),
  });
  const status = cleanText(filters.status);
  const printerKey = cleanText(filters.printerKey);
  const template = cleanText(filters.template);
  const sourceType = cleanText(filters.sourceType);
  const sourceId = cleanText(filters.sourceId);
  const reason = cleanText(filters.reason);
  const idempotencyKey = cleanText(filters.idempotencyKey);

  if (status) query.set("status", `eq.${status}`);
  if (printerKey) query.set("printer_key", `eq.${printerKey}`);
  if (template) query.set("payload->>template", `eq.${template}`);
  if (sourceType) query.set("payload->metadata->>sourceType", `eq.${sourceType}`);
  if (sourceId) query.set("payload->metadata->>sourceId", `eq.${sourceId}`);
  if (reason) query.set("payload->metadata->>reason", `eq.${reason}`);
  if (idempotencyKey) query.set("idempotency_key", `eq.${idempotencyKey}`);

  const result = await adminSupabaseRequest<SupabasePrintJobRow[]>("print_jobs", {
    method: "GET",
    query: `?${query.toString()}`,
  });

  if (!result.ok && isMissingAnyColumnError(result, [
    "sent_at",
    "sent_unconfirmed_at",
    "transport_confirmed_at",
    "transport_confirmation_source",
    "transport_confirmed_by",
    "transport_confirmation_note",
    "cancelled_at",
    "cancelled_by",
    "cancel_reason",
    "last_transport_result",
  ])) {
    const retryQuery = new URLSearchParams(query);
    retryQuery.set("select", selectPrintJobBase);
    const retry = await adminSupabaseRequest<SupabasePrintJobRow[]>("print_jobs", {
      method: "GET",
      query: `?${retryQuery.toString()}`,
    });
    if (!retry.ok) return retry;
    return {
      ok: true as const,
      data: retry.data
        .map((job) => toPrintJob(job))
        .filter((job) => matchesPrintJobFilters(job, filters)),
    };
  }
  if (!result.ok) return result;
  return {
    ok: true as const,
    data: result.data
      .map((job) => toPrintJob(job))
      .filter((job) => matchesPrintJobFilters(job, filters)),
  };
}

export async function getPrintJobsByProductionBatch(input: {
  batchId: string;
  batchCode?: string;
  template?: string;
  reason?: string;
  idempotencyKey?: string;
  limit?: number;
}) {
  const batchId = cleanText(input.batchId);
  const batchCode = cleanText(input.batchCode);
  const template = cleanText(input.template);
  const reason = cleanText(input.reason);
  const idempotencyKey = cleanText(input.idempotencyKey);
  const safeLimit = Math.max(1, Math.min(200, Math.round(input.limit || 100)));

  if (!batchId && !batchCode) {
    return { ok: false as const, error: "batchId o batchCode es obligatorio." };
  }

  const result = await getRecentPrintJobs({ limit: safeLimit, template, reason, sourceId: batchId, idempotencyKey });
  if (!result.ok) return result;

  return {
    ok: true as const,
    data: result.data.filter((job) => {
      const data = payloadRecord(job.payload, "data");
      const metadata = payloadRecord(job.payload, "metadata");
      const candidates = [
        cleanText(data.batchCode),
        cleanText(metadata.batchCode),
        cleanText(metadata.sourceId),
      ].filter(Boolean);

      return (batchId && cleanText(metadata.sourceId) === batchId) || (batchCode && candidates.includes(batchCode));
    }),
  };
}

export async function createPrintJob(input: CreatePrintJobInput) {
  const result = await enqueuePrintJob({
    printerKey: input.printerKey,
    payload: legacyPayloadToBridgePayload(input),
  });

  if (!result.ok) return result;
  return { ok: true as const, data: toLegacyFromPrintJob(result.data, cleanText(input.labelType) || "test_label") };
}

export async function claimPendingPrintJobs(printerKey: string, limit = 1) {
  const key = cleanText(printerKey);
  const safeLimit = Math.max(1, Math.min(10, Math.round(limit)));
  if (!key) return { ok: false as const, error: "printer_key es obligatorio." };

  const result = await adminSupabaseRequest<SupabasePrintJobRow[]>("rpc/claim_next_print_jobs", {
    method: "POST",
    body: JSON.stringify({
      p_printer_key: key,
      p_limit: safeLimit,
    }),
  });

  if (!result.ok) return result;
  return { ok: true as const, data: result.data.map((job) => toLegacyPrintJob(job)) };
}

export type PrintJobQueueSummary = {
  printerKey: string;
  counts: Record<string, number>;
  pendingCopies: number;
  oldestJob: Pick<PrintJob, "id" | "status" | "created_at" | "attempts"> | null;
  claimedWithoutPrintedAt: Array<Pick<PrintJob, "id" | "status" | "created_at" | "claimed_at" | "attempts">>;
  sentUnconfirmed: Array<Pick<PrintJob, "id" | "status" | "created_at" | "sent_unconfirmed_at" | "attempts">>;
  sending: Array<Pick<PrintJob, "id" | "status" | "created_at" | "transport_started_at" | "attempts">>;
};

function payloadCopies(payload: PrintJobPayload) {
  const candidates = [
    payload.copies,
    payloadRecord(payload, "data").copies,
    payloadRecord(payload, "metadata").requestedCopies,
  ];
  const parsed = candidates
    .map((value) => Number(value))
    .find((value) => Number.isFinite(value) && value > 0);
  return parsed ? Math.max(1, Math.min(8, Math.round(parsed))) : 1;
}

export async function getPrintJobQueueSummary(printerKey: string) {
  const key = cleanText(printerKey);
  if (!key) return { ok: false as const, error: "printer_key es obligatorio." };

  const query = new URLSearchParams({
    select: selectPrintJob,
    printer_key: `eq.${key}`,
    status: "in.(queued,claimed,sending,sent_unconfirmed)",
    order: "created_at.asc",
    limit: "200",
  });
  const result = await adminSupabaseRequest<SupabasePrintJobRow[]>("print_jobs", {
    method: "GET",
    query: `?${query.toString()}`,
  });

  if (!result.ok && isMissingAnyColumnError(result, [
    "sent_at",
    "sent_unconfirmed_at",
    "transport_confirmed_at",
    "transport_confirmation_source",
    "transport_confirmed_by",
    "transport_confirmation_note",
    "cancelled_at",
    "cancelled_by",
    "cancel_reason",
    "last_transport_result",
  ])) {
    const retryQuery = new URLSearchParams(query);
    retryQuery.set("select", selectPrintJobBase);
    retryQuery.set("status", "in.(queued,claimed)");
    const retry = await adminSupabaseRequest<SupabasePrintJobRow[]>("print_jobs", {
      method: "GET",
      query: `?${retryQuery.toString()}`,
    });
    if (!retry.ok) return retry;
    const jobs = retry.data.map((job) => toPrintJob(job));
    return { ok: true as const, data: summarizeQueue(key, jobs) };
  }
  if (!result.ok) return result;
  return { ok: true as const, data: summarizeQueue(key, result.data.map((job) => toPrintJob(job))) };
}

function summarizeQueue(printerKey: string, jobs: PrintJob[]): PrintJobQueueSummary {
  const counts: Record<string, number> = {};
  jobs.forEach((job) => {
    counts[job.status] = (counts[job.status] || 0) + 1;
  });
  return {
    printerKey,
    counts,
    pendingCopies: jobs
      .filter((job) => job.status === "queued")
      .reduce((total, job) => total + payloadCopies(job.payload), 0),
    oldestJob: jobs[0]
      ? { id: jobs[0].id, status: jobs[0].status, created_at: jobs[0].created_at, attempts: jobs[0].attempts }
      : null,
    claimedWithoutPrintedAt: jobs
      .filter((job) => job.status === "claimed" && !job.printed_at)
      .map((job) => ({ id: job.id, status: job.status, created_at: job.created_at, claimed_at: job.claimed_at, attempts: job.attempts })),
    sentUnconfirmed: jobs
      .filter((job) => job.status === "sent_unconfirmed")
      .map((job) => ({ id: job.id, status: job.status, created_at: job.created_at, sent_unconfirmed_at: job.sent_unconfirmed_at, attempts: job.attempts })),
    sending: jobs
      .filter((job) => job.status === "sending")
      .map((job) => ({ id: job.id, status: job.status, created_at: job.created_at, transport_started_at: job.transport_started_at, attempts: job.attempts })),
  };
}

export async function recoverStalePrintJobs(staleMinutes = 10): Promise<{ ok: true; data: LegacyPrintJob[] } | { ok: false; error: string }> {
  const safeMinutes = Math.max(1, Math.min(120, Math.round(staleMinutes || 10)));
  const retryBefore = new Date(Date.now() - safeMinutes * 60_000).toISOString();

  const result = await adminSupabaseRequest<SupabasePrintJobRow[]>("print_jobs", {
    method: "GET",
    query: `?select=${selectPrintJob}&status=in.(claimed,sending)&claimed_at=lte.${encodeURIComponent(retryBefore)}&order=claimed_at.asc&limit=20`,
  });

  if (!result.ok) return result;

  const recovered: LegacyPrintJob[] = [];
  for (const job of result.data) {
    const note = `Trabajo claimed antiguo marcado como resultado incierto; no se reimprime automaticamente: ${cleanText(job.error).slice(0, 700)}`;
    const patch = await adminSupabaseRequest<SupabasePrintJobRow[]>("print_jobs", {
      method: "PATCH",
      query: `?select=${selectPrintJob}&id=eq.${encodeURIComponent(job.id)}&status=in.(claimed,sending)`,
      body: JSON.stringify({
        status: "sent_unconfirmed",
        sent_unconfirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        error: note,
        error_message: note,
      }),
      headers: { Prefer: "return=representation" },
    });

    if (!patch.ok) return patch;
    if (patch.data[0]) recovered.push(toLegacyPrintJob(patch.data[0]));
  }

  return { ok: true as const, data: recovered };
}

export async function markPrintJobPrinted(id: string) {
  const jobId = cleanText(id);
  if (!jobId) return { ok: false as const, error: "id es obligatorio." };

  const now = new Date().toISOString();
  const existing = await getPrintJobById(jobId);
  if (!existing.ok) return existing;
  if (existing.data?.status === "printed") return { ok: true as const, data: toLegacyFromPrintJob(existing.data) };
  if (existing.data && !["sent_unconfirmed"].includes(existing.data.status)) {
    return { ok: false as const, error: `Transicion imposible: ${existing.data.status} -> printed.` };
  }

  const bodyWithLegacy = {
    status: "printed",
    printed_at: now,
    transport_confirmed_at: now,
    transport_confirmation_source: "bridge_tcp_ack",
    updated_at: now,
    error: null,
    error_message: null,
  };
  const result = await adminSupabaseRequest<SupabasePrintJobRow[]>("print_jobs", {
    method: "PATCH",
    query: `?select=${selectPrintJob}&id=eq.${encodeURIComponent(jobId)}&status=eq.sent_unconfirmed`,
    body: JSON.stringify(bodyWithLegacy),
    headers: { Prefer: "return=representation" },
  });

  if (!result.ok && isMissingAnyColumnError(result, ["error_message", "transport_confirmed_at", "transport_confirmation_source"])) {
    const body = { ...bodyWithLegacy };
    delete (body as Partial<typeof bodyWithLegacy>).error_message;
    delete (body as Partial<typeof bodyWithLegacy>).transport_confirmed_at;
    delete (body as Partial<typeof bodyWithLegacy>).transport_confirmation_source;
    const retry = await adminSupabaseRequest<SupabasePrintJobRow[]>("print_jobs", {
      method: "PATCH",
        query: `?select=${selectPrintJobBase}&id=eq.${encodeURIComponent(jobId)}&status=eq.sent_unconfirmed`,
      body: JSON.stringify(body),
      headers: { Prefer: "return=representation" },
    });
    if (!retry.ok) return retry;
    if (!retry.data[0]) return { ok: false as const, error: "Trabajo no encontrado en estado sent_unconfirmed." };
    return { ok: true as const, data: toLegacyPrintJob(retry.data[0]) };
  }

  if (!result.ok) return result;
  if (!result.data[0]) return { ok: false as const, error: "Trabajo no encontrado en estado sent_unconfirmed." };
  return { ok: true as const, data: toLegacyPrintJob(result.data[0]) };
}

export async function markPrintJobSending(id: string) {
  const jobId = cleanText(id);
  if (!jobId) return { ok: false as const, error: "id es obligatorio." };

  const existing = await getPrintJobById(jobId);
  if (!existing.ok) return existing;
  if (existing.data?.status === "sending" || existing.data?.status === "sent_unconfirmed" || existing.data?.status === "printed") {
    return { ok: true as const, data: toLegacyFromPrintJob(existing.data) };
  }
  if (existing.data && existing.data.status !== "claimed") {
    return { ok: false as const, error: `Transicion imposible: ${existing.data.status} -> sending.` };
  }

  const now = new Date().toISOString();
  const result = await adminSupabaseRequest<SupabasePrintJobRow[]>("print_jobs", {
    method: "PATCH",
    query: `?select=${selectPrintJob}&id=eq.${encodeURIComponent(jobId)}&status=eq.claimed`,
    body: JSON.stringify({
      status: "sending",
      transport_started_at: now,
      updated_at: now,
      error: null,
      error_message: null,
    }),
    headers: { Prefer: "return=representation" },
  });

  if (!result.ok) return result;
  if (!result.data[0]) return { ok: false as const, error: "Trabajo no encontrado en estado claimed." };
  return { ok: true as const, data: toLegacyPrintJob(result.data[0]) };
}

export async function markPrintJobSentUnconfirmed(id: string, input: { bytes?: number; transport?: string; host?: string; port?: number; note?: string } = {}) {
  const jobId = cleanText(id);
  if (!jobId) return { ok: false as const, error: "id es obligatorio." };

  const existing = await getPrintJobById(jobId);
  if (!existing.ok) return existing;
  if (existing.data?.status === "sent_unconfirmed" || existing.data?.status === "printed") {
    return { ok: true as const, data: toLegacyFromPrintJob(existing.data) };
  }
  if (existing.data && existing.data.status !== "sending") {
    return { ok: false as const, error: `Transicion imposible: ${existing.data.status} -> sent_unconfirmed.` };
  }

  const now = new Date().toISOString();
  const note = cleanText(input.note) || "TCP aceptado; ACK final pendiente.";
  const result = await adminSupabaseRequest<SupabasePrintJobRow[]>("print_jobs", {
    method: "PATCH",
    query: `?select=${selectPrintJob}&id=eq.${encodeURIComponent(jobId)}&status=eq.sending`,
    body: JSON.stringify({
      status: "sent_unconfirmed",
      sent_at: now,
      sent_unconfirmed_at: now,
      updated_at: now,
      error: note,
      error_message: note,
      last_transport_result: {
        acceptedByTransport: true,
        bytes: input.bytes,
        transport: input.transport,
        host: input.host,
        port: input.port,
      },
    }),
    headers: { Prefer: "return=representation" },
  });

  if (!result.ok) return result;
  if (!result.data[0]) return { ok: false as const, error: "Trabajo no encontrado en estado sending." };
  return { ok: true as const, data: toLegacyPrintJob(result.data[0]) };
}

export async function markPrintJobError(id: string, errorMessage: string) {
  const jobId = cleanText(id);
  if (!jobId) return { ok: false as const, error: "id es obligatorio." };

  const cleanError = cleanText(errorMessage).slice(0, 1000) || "Error de impresión no especificado.";
  const existing = await getPrintJobById(jobId);
  if (!existing.ok) return existing;
  if (existing.data?.status === "error") return { ok: true as const, data: toLegacyFromPrintJob(existing.data) };
  if (existing.data && !["claimed", "sending"].includes(existing.data.status)) {
    return { ok: false as const, error: `Transicion imposible: ${existing.data.status} -> error.` };
  }

  const bodyWithLegacy = {
    status: "error",
    updated_at: new Date().toISOString(),
    error: cleanError,
    error_message: cleanError,
  };
  const result = await adminSupabaseRequest<SupabasePrintJobRow[]>("print_jobs", {
    method: "PATCH",
    query: `?select=${selectPrintJob}&id=eq.${encodeURIComponent(jobId)}&status=in.(claimed,sending)`,
    body: JSON.stringify(bodyWithLegacy),
    headers: { Prefer: "return=representation" },
  });

  if (!result.ok && isMissingColumnError(result, "error_message")) {
    const body = { ...bodyWithLegacy };
    delete (body as Partial<typeof bodyWithLegacy>).error_message;
    const retry = await adminSupabaseRequest<SupabasePrintJobRow[]>("print_jobs", {
      method: "PATCH",
        query: `?select=${selectPrintJobBase}&id=eq.${encodeURIComponent(jobId)}&status=in.(claimed,sending)`,
      body: JSON.stringify(body),
      headers: { Prefer: "return=representation" },
    });
    if (!retry.ok) return retry;
    if (!retry.data[0]) return { ok: false as const, error: "Trabajo no encontrado en estado claimed/sending." };
    return { ok: true as const, data: toLegacyPrintJob(retry.data[0]) };
  }

  if (!result.ok) return result;
  if (!result.data[0]) return { ok: false as const, error: "Trabajo no encontrado en estado claimed/sending." };
  return { ok: true as const, data: toLegacyPrintJob(result.data[0]) };
}
