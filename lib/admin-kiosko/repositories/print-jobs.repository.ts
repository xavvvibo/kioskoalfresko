import "server-only";
import { adminSupabaseRequest } from "./legacy-core";

export type PrintJobStatus = "queued" | "claimed" | "printed" | "error";

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
  attempts: number;
  claimed_at: string | null;
  printed_at: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  claimed_from_status?: "queued" | "error";
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
  attempts: number;
  claimed_at: string | null;
  printed_at: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  claimed_from_status?: "queued" | "error";
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
  printerKey?: string;
  search?: string;
};

const selectPrintJob = "id,printer_key,status,payload,attempts,claimed_at,printed_at,error,created_at,updated_at";

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePayload(value: unknown): PrintJobPayload {
  return value && typeof value === "object" && !Array.isArray(value) ? value as PrintJobPayload : {};
}

function toPrintJob(row: SupabasePrintJobRow): PrintJob {
  return {
    ...row,
    payload: normalizePayload(row.payload),
  };
}

function toLegacyPrintJob(row: SupabasePrintJobRow, labelType = "test_label"): LegacyPrintJob {
  const job = toPrintJob(row);
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
  const payload = normalizePayload(input.payload);

  if (!printerKey) return { ok: false as const, error: "printer_key es obligatorio." };
  if (!Object.keys(payload).length) {
    return { ok: false as const, error: "payload/data es obligatorio." };
  }

  const result = await adminSupabaseRequest<SupabasePrintJobRow[]>("print_jobs", {
    method: "POST",
    query: `?select=${selectPrintJob}`,
    body: JSON.stringify({
      printer_key: printerKey,
      payload,
      status: "queued",
    }),
    headers: { Prefer: "return=representation" },
  });

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

  if (!result.ok) return result;
  if (!result.data[0]) return { ok: true as const, data: null };
  return { ok: true as const, data: toPrintJob(result.data[0]) };
}

function payloadText(payload: PrintJobPayload, key: string) {
  const value = payload[key];
  return typeof value === "string" ? value : "";
}

function payloadRecord(payload: PrintJobPayload, key: string) {
  const value = payload[key];
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function metadataText(payload: PrintJobPayload, key: string) {
  const value = payloadRecord(payload, "metadata")[key];
  return typeof value === "string" ? value : "";
}

function matchesPrintJobFilters(job: PrintJob, filters: PrintJobListFilters) {
  const template = cleanText(filters.template);
  const sourceType = cleanText(filters.sourceType);
  const sourceId = cleanText(filters.sourceId);
  const reason = cleanText(filters.reason);
  const search = cleanText(filters.search).toLowerCase();

  if (template && payloadText(job.payload, "template") !== template) return false;
  if (sourceType && metadataText(job.payload, "sourceType") !== sourceType) return false;
  if (sourceId && metadataText(job.payload, "sourceId") !== sourceId) return false;
  if (reason && metadataText(job.payload, "reason") !== reason) return false;

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

  if (status) query.set("status", `eq.${status}`);
  if (printerKey) query.set("printer_key", `eq.${printerKey}`);

  const result = await adminSupabaseRequest<SupabasePrintJobRow[]>("print_jobs", {
    method: "GET",
    query: `?${query.toString()}`,
  });

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
  limit?: number;
}) {
  const batchId = cleanText(input.batchId);
  const batchCode = cleanText(input.batchCode);
  const template = cleanText(input.template);
  const reason = cleanText(input.reason);
  const safeLimit = Math.max(1, Math.min(200, Math.round(input.limit || 100)));

  if (!batchId && !batchCode) {
    return { ok: false as const, error: "batchId o batchCode es obligatorio." };
  }

  const result = await getRecentPrintJobs({ limit: safeLimit, template, reason });
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
  return { ok: true as const, data: toLegacyPrintJob(result.data, cleanText(input.labelType) || "test_label") };
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

export async function recoverStalePrintJobs(staleMinutes = 10): Promise<{ ok: true; data: LegacyPrintJob[] } | { ok: false; error: string }> {
  const safeMinutes = Math.max(1, Math.min(120, Math.round(staleMinutes || 10)));
  const retryBefore = new Date(Date.now() - safeMinutes * 60_000).toISOString();
  const retryableErrorPattern = /ECONNREFUSED|timeout|timed out|ETIMEDOUT|EHOSTUNREACH|ENETUNREACH|ECONNRESET/i;

  const result = await adminSupabaseRequest<SupabasePrintJobRow[]>("print_jobs", {
    method: "GET",
    query: `?select=${selectPrintJob}&status=eq.error&updated_at=lte.${encodeURIComponent(retryBefore)}&order=updated_at.asc&limit=20`,
  });

  if (!result.ok) return result;

  const retryable = result.data.filter((job) => retryableErrorPattern.test(cleanText(job.error)));
  if (!retryable.length) return { ok: true as const, data: [] };

  const recovered: LegacyPrintJob[] = [];
  for (const job of retryable) {
    const patch = await adminSupabaseRequest<SupabasePrintJobRow[]>("print_jobs", {
      method: "PATCH",
      query: `?select=${selectPrintJob}&id=eq.${encodeURIComponent(job.id)}&status=eq.error`,
      body: JSON.stringify({
        status: "queued",
        claimed_at: null,
        updated_at: new Date().toISOString(),
        error: `Retry auto tras conectividad impresora: ${cleanText(job.error).slice(0, 900)}`,
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

  const result = await adminSupabaseRequest<SupabasePrintJobRow[]>("print_jobs", {
    method: "PATCH",
    query: `?select=${selectPrintJob}&id=eq.${encodeURIComponent(jobId)}&status=eq.claimed`,
    body: JSON.stringify({
      status: "printed",
      printed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      error: null,
    }),
    headers: { Prefer: "return=representation" },
  });

  if (!result.ok) return result;
  if (!result.data[0]) return { ok: false as const, error: "Trabajo no encontrado en estado claimed." };
  return { ok: true as const, data: toLegacyPrintJob(result.data[0]) };
}

export async function markPrintJobError(id: string, errorMessage: string) {
  const jobId = cleanText(id);
  if (!jobId) return { ok: false as const, error: "id es obligatorio." };

  const result = await adminSupabaseRequest<SupabasePrintJobRow[]>("print_jobs", {
    method: "PATCH",
    query: `?select=${selectPrintJob}&id=eq.${encodeURIComponent(jobId)}&status=eq.claimed`,
    body: JSON.stringify({
      status: "error",
      updated_at: new Date().toISOString(),
      error: cleanText(errorMessage).slice(0, 1000) || "Error de impresión no especificado.",
    }),
    headers: { Prefer: "return=representation" },
  });

  if (!result.ok) return result;
  if (!result.data[0]) return { ok: false as const, error: "Trabajo no encontrado en estado claimed." };
  return { ok: true as const, data: toLegacyPrintJob(result.data[0]) };
}
