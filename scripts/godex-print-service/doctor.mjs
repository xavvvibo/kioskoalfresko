import net from "node:net";
import fs from "node:fs/promises";
import path from "node:path";
import { loadGodexEnv, packageVersion } from "./env.mjs";
import { buildGodex80x50QrTestEzpl, parseNativeQrCommand } from "../../lib/admin-kiosko/printing/godex-80x50-ezpl.mjs";

const loadedEnvFiles = await loadGodexEnv();
const version = process.env.BRIDGE_VERSION || process.env.npm_package_version || await packageVersion();

const config = {
  erpApiUrl: (process.env.ERP_API_URL || "").replace(/\/$/, ""),
  token: process.env.ERP_API_TOKEN || "",
  printerKey: process.env.PRINTER_KEY || "kiosko_godex_g500",
  transport: process.env.GODEX_PRINT_TRANSPORT || "tcp_9100",
  host: process.env.GODEX_PRINTER_HOST || "192.168.1.37",
  port: Number(process.env.GODEX_PRINTER_PORT || 9100),
  timeoutMs: Number(process.env.GODEX_TCP_TIMEOUT_MS || 5000),
  maxJobBytes: Number(process.env.GODEX_MAX_JOB_BYTES || 24576),
  maxCopies: Number(process.env.GODEX_MAX_COPIES || 8),
  healthUrl: `http://${process.env.BRIDGE_HEALTH_HOST || "127.0.0.1"}:${Number(process.env.BRIDGE_HEALTH_PORT || 8787)}/health`,
  supabaseUrl: (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, ""),
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  journalDir: process.env.GODEX_PRINT_JOURNAL_DIR || path.join(process.cwd(), "var/godex-print-journal"),
};

const checks = [];

function addCheck(name, status, detail = "") {
  checks.push({ name, status, detail });
}

function tcpProbe(host, port, timeoutMs) {
  const started = Date.now();
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const done = (result) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ ...result, durationMs: Date.now() - started });
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => {
      socket.end();
      done({ ok: true });
    });
    socket.once("timeout", () => done({ ok: false, error: `timeout ${timeoutMs}ms` }));
    socket.once("error", (error) => done({ ok: false, error: error.message }));
    socket.connect(port, host);
  });
}

async function fetchJson(url, init = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, cache: "no-store", signal: controller.signal });
    const body = await response.json().catch(() => null);
    return { response, body };
  } finally {
    clearTimeout(timeout);
  }
}

function formatDate(value) {
  return value ? String(value).replace("T", " ").slice(0, 19) : "-";
}

function ageText(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

function jobCopies(job) {
  const payload = job?.payload && typeof job.payload === "object" ? job.payload : {};
  const data = payload.data && typeof payload.data === "object" ? payload.data : {};
  const metadata = payload.metadata && typeof payload.metadata === "object" ? payload.metadata : {};
  const parsed = [payload.copies, data.copies, metadata.requestedCopies]
    .map((value) => Number(value))
    .find((value) => Number.isFinite(value) && value > 0);
  return parsed ? Math.max(1, Math.min(8, Math.round(parsed))) : 1;
}

for (const key of ["GODEX_HOST", "GODEX_PORT"]) {
  if (process.env[key]) {
    addCheck(`deprecated ${key}`, "ERROR", "Variable antigua presente. Eliminarla.");
  }
}

addCheck("version", "OK", version);
addCheck("env files", loadedEnvFiles.length ? "OK" : "WARN", loadedEnvFiles.length ? loadedEnvFiles.join(", ") : "No se ha cargado .env/.env.local");
addCheck("ERP_API_URL", config.erpApiUrl ? "OK" : "ERROR", config.erpApiUrl || "Falta ERP_API_URL");
addCheck("ERP_API_TOKEN", config.token ? "OK" : "ERROR", config.token ? "Configurado" : "Falta ERP_API_TOKEN");
addCheck("PRINTER_KEY", config.printerKey ? "OK" : "ERROR", config.printerKey || "Falta PRINTER_KEY");
addCheck("GODEX_PRINT_TRANSPORT", config.transport === "tcp_9100" ? "OK" : "ERROR", config.transport);
addCheck("GODEX_PRINTER_HOST", config.host ? "OK" : "ERROR", config.host || "Falta GODEX_PRINTER_HOST");
addCheck("GODEX_PRINTER_PORT", config.port === 9100 ? "OK" : "WARN", String(config.port));
addCheck("GODEX_MAX_JOB_BYTES", config.maxJobBytes > 0 && config.maxJobBytes <= 65536 ? "OK" : "WARN", String(config.maxJobBytes));
addCheck("GODEX_MAX_COPIES", config.maxCopies >= 1 && config.maxCopies <= 8 ? "OK" : "WARN", String(config.maxCopies));
addCheck("Journal dir", "OK", config.journalDir);

try {
  const qrValue = "ERP:QR-TEST:DOCTOR";
  const ezpl = buildGodex80x50QrTestEzpl({ qrValue });
  const lines = ezpl.split(/\r?\n/);
  const qrLineIndex = lines.findIndex((line) => line.startsWith("W360,150,2,2,M,8,5,"));
  const parsedQr = parseNativeQrCommand(lines, qrLineIndex);
  addCheck(
    "QR automatic validation",
    parsedQr?.value === qrValue ? "OK" : "ERROR",
    parsedQr?.value === qrValue
      ? `native=${lines[qrLineIndex]} value=${parsedQr.value}`
      : `QR nativo invalido: ${lines[qrLineIndex] || "sin linea W"}`,
  );
} catch (error) {
  addCheck("QR automatic validation", "ERROR", error instanceof Error ? error.message : String(error));
}

if (config.erpApiUrl) {
  let timeout;
  try {
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(config.erpApiUrl, { method: "GET", cache: "no-store", signal: controller.signal });
    addCheck("ERP connection", response.status < 500 ? "OK" : "ERROR", `HTTP ${response.status}`);
  } catch (error) {
    addCheck("ERP connection", "WARN", error instanceof Error ? error.message : String(error));
  } finally {
    clearTimeout(timeout);
  }
}

if (config.erpApiUrl && config.token) {
  try {
    const { response, body } = await fetchJson(`${config.erpApiUrl}/api/print-jobs/health`, {
      headers: { Authorization: `Bearer ${config.token}` },
    });
    addCheck(
      "ERP_API_TOKEN auth",
      response.ok && body?.ok === true ? "OK" : response.status === 401 || response.status === 503 ? "ERROR" : "WARN",
      response.ok ? `HTTP ${response.status} ${body?.service || "print-jobs"}` : `HTTP ${response.status}`,
    );
  } catch (error) {
    addCheck("ERP_API_TOKEN auth", "WARN", error instanceof Error ? error.message : String(error));
  }
}

const tcp = await tcpProbe(config.host, config.port, config.timeoutMs);
addCheck("Printer TCP", tcp.ok ? "OK" : "WARN", tcp.ok ? `${config.host}:${config.port} ${tcp.durationMs}ms` : `${config.host}:${config.port} ${tcp.error}`);

try {
  const { response, body } = await fetchJson(config.healthUrl);
  addCheck("Bridge health", response.ok ? "OK" : "WARN", response.ok ? JSON.stringify({ status: body?.status, printerKey: body?.printerKey, version: body?.version }) : `HTTP ${response.status}`);
  addCheck("Bridge polling", body?.polling === true ? "OK" : "WARN", body?.polling === true ? "polling activo" : "health responde pero polling no confirmado");
} catch (error) {
  addCheck("Bridge health", "WARN", `No responde ${config.healthUrl}: ${error instanceof Error ? error.message : String(error)}`);
  addCheck("Bridge polling", "WARN", "No confirmado porque el bridge no responde al healthcheck local.");
}

if (config.supabaseUrl && config.serviceRoleKey) {
  const base = `${config.supabaseUrl}/rest/v1/print_jobs`;
  const headers = {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
  };

  try {
    const sql = await fs.readFile(new URL("../../supabase/admin_kiosko_print_jobs.sql", import.meta.url), "utf8");
    addCheck("Local migration idempotency index", /create unique index if not exists print_jobs_printer_idempotency_uidx/i.test(sql) ? "OK" : "ERROR", "print_jobs_printer_idempotency_uidx");
    addCheck("Local migration statuses", /queued', 'claimed', 'sending', 'sent_unconfirmed', 'printed', 'error', 'cancelled/i.test(sql) ? "OK" : "ERROR", "queued, claimed, sending, sent_unconfirmed, printed, error, cancelled");
  } catch (error) {
    addCheck("Local migration schema", "ERROR", error instanceof Error ? error.message : String(error));
  }

  try {
    const schemaQuery = new URLSearchParams({
      select: "id,idempotency_key,status,claimed_at,transport_started_at,sent_unconfirmed_at,transport_confirmed_at,transport_confirmation_source,transport_confirmed_by,transport_confirmation_note,printed_at,cancelled_at,cancelled_by,cancel_reason,attempts,updated_at",
      limit: "1",
    });
    const { response, body } = await fetchJson(`${base}?${schemaQuery.toString()}`, { headers });
    addCheck("Remote print_jobs required columns", response.ok ? "OK" : "ERROR", response.ok ? "column select OK" : `HTTP ${response.status} ${JSON.stringify(body)}`);
  } catch (error) {
    addCheck("Remote print_jobs required columns", "ERROR", error instanceof Error ? error.message : String(error));
  }

  try {
    const query = new URLSearchParams({
      select: "id,status,printer_key,attempts,printed_at,error,created_at,updated_at",
      printer_key: `eq.${config.printerKey}`,
      order: "created_at.desc",
      limit: "1",
    });
    const { response, body } = await fetchJson(`${base}?${query.toString()}`, { headers });
    const latest = Array.isArray(body) ? body[0] : null;
    addCheck("Latest print job", response.ok ? "OK" : "WARN", latest ? `${latest.id} ${latest.status} created=${formatDate(latest.created_at)} printed=${formatDate(latest.printed_at)} error=${latest.error || "-"}` : "Sin jobs para printer_key");
  } catch (error) {
    addCheck("Latest print job", "WARN", error instanceof Error ? error.message : String(error));
  }

  try {
    const queueQuery = new URLSearchParams({
      select: "id,status,printer_key,attempts,printed_at,claimed_at,transport_started_at,sent_unconfirmed_at,error,created_at,updated_at,payload",
      printer_key: `eq.${config.printerKey}`,
      status: "in.(queued,claimed,sending,sent_unconfirmed,cancelled)",
      order: "created_at.asc",
      limit: "200",
    });
    let { response, body } = await fetchJson(`${base}?${queueQuery.toString()}`, { headers });
    if (!response.ok && JSON.stringify(body || {}).includes("sent_unconfirmed_at")) {
      const legacyQuery = new URLSearchParams({
        select: "id,status,printer_key,attempts,printed_at,claimed_at,error,created_at,updated_at,payload",
        printer_key: `eq.${config.printerKey}`,
        status: "in.(queued,claimed)",
        order: "created_at.asc",
        limit: "200",
      });
      ({ response, body } = await fetchJson(`${base}?${legacyQuery.toString()}`, { headers }));
      addCheck("Schema sent_unconfirmed", "WARN", "Migracion pendiente: no existe sent_unconfirmed_at en la base actual.");
    }
    const jobs = Array.isArray(body) ? body : [];
    const counts = jobs.reduce((acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    }, {});
    const queued = Number(counts.queued || 0);
    const claimed = Number(counts.claimed || 0);
    const sentUnconfirmed = Number(counts.sent_unconfirmed || 0);
    const sending = Number(counts.sending || 0);
    const cancelled = Number(counts.cancelled || 0);
    const oldest = jobs[0] || null;
    const claimedWithoutPrinted = jobs.filter((job) => job.status === "claimed" && !job.printed_at);
    const pendingCopies = jobs
      .filter((job) => job.status === "queued")
      .reduce((total, job) => total + jobCopies(job), 0);

    addCheck(
      "Queue status counts",
      response.ok ? "OK" : "WARN",
      `queued=${queued} claimed=${claimed} sending=${sending} sent_unconfirmed=${sentUnconfirmed} cancelled=${cancelled}`,
    );
    addCheck(
      "Sending jobs",
      sending ? "WARN" : "OK",
      sending ? jobs.filter((job) => job.status === "sending").map((job) => job.id).join(", ") : "0",
    );
    addCheck(
      "Claimed without printed_at",
      claimedWithoutPrinted.length ? "WARN" : "OK",
      claimedWithoutPrinted.length
        ? `${claimedWithoutPrinted.length}: ${claimedWithoutPrinted.map((job) => job.id).join(", ")}`
        : "0",
    );
    addCheck(
      "Sent unconfirmed jobs",
      sentUnconfirmed ? "WARN" : "OK",
      sentUnconfirmed ? jobs.filter((job) => job.status === "sent_unconfirmed").map((job) => job.id).join(", ") : "0",
    );
    addCheck(
      "Queue age",
      queued || claimed || sending || sentUnconfirmed ? "WARN" : "OK",
      oldest ? `oldest=${oldest.id} status=${oldest.status} age=${ageText(oldest.created_at)} created=${formatDate(oldest.created_at)}` : "Sin cola pendiente",
    );
    addCheck("Potential queued copies", pendingCopies ? "WARN" : "OK", String(pendingCopies));
  } catch (error) {
    addCheck("Queue status counts", "WARN", error instanceof Error ? error.message : String(error));
  }

  try {
    const historicalIds = [
      "a1aadfee-e6bd-4000-ac17-0f2a9b5a3474",
      "95d0cf8f-04f8-4fea-b30d-6083a8675981",
      "c006313a-7496-478f-a9f2-64f63b1ff43d",
      "fdf8ec3c-c15f-4885-9b4b-7bd756e5d5cb",
      "3efa2c80-0877-4aaf-9fe6-e6d5e382c789",
      "b5a37527-d499-4c2f-88f3-e3e38c148e17",
      "cb78963d-913a-4816-bc17-e17d06b2bbc5",
    ];
    const query = new URLSearchParams({
      select: "id,status,transport_confirmation_source,cancel_reason",
      id: `in.(${historicalIds.join(",")})`,
      order: "id.asc",
    });
    const { response, body } = await fetchJson(`${base}?${query.toString()}`, { headers });
    const jobs = Array.isArray(body) ? body : [];
    const unsafe = jobs.filter((job) => ["queued", "claimed", "sending", "sent_unconfirmed"].includes(job.status));
    addCheck("Historical seven jobs", response.ok && jobs.length === 7 && !unsafe.length ? "OK" : "WARN", response.ok ? `rows=${jobs.length} unsafe=${unsafe.map((job) => `${job.id}:${job.status}`).join(", ") || "0"}` : `HTTP ${response.status}`);
  } catch (error) {
    addCheck("Historical seven jobs", "WARN", error instanceof Error ? error.message : String(error));
  }

  try {
    const files = await fs.readdir(config.journalDir).catch((error) => error.code === "ENOENT" ? [] : Promise.reject(error));
    const receipts = [];
    for (const file of files.filter((name) => name.endsWith(".json"))) {
      const raw = await fs.readFile(path.join(config.journalDir, file), "utf8").catch(() => "");
      try {
        const parsed = JSON.parse(raw);
        if (parsed.jobId) receipts.push(parsed);
      } catch {
        // ignore malformed local files but report below
      }
    }
    if (!receipts.length) {
      addCheck("Local journal unreconciled", "OK", "0");
    } else {
      const ids = receipts.map((receipt) => receipt.jobId).slice(0, 50);
      const query = new URLSearchParams({
        select: "id,status,printed_at,transport_confirmed_at",
        id: `in.(${ids.join(",")})`,
      });
      const { response, body } = await fetchJson(`${base}?${query.toString()}`, { headers });
      const remote = new Map((Array.isArray(body) ? body : []).map((job) => [job.id, job]));
      const unreconciled = receipts.filter((receipt) => {
        const job = remote.get(receipt.jobId);
        return !job || !["printed", "cancelled"].includes(job.status);
      });
      addCheck("Local journal unreconciled", response.ok && !unreconciled.length ? "OK" : "WARN", unreconciled.map((receipt) => receipt.jobId).join(", ") || "0");
    }
  } catch (error) {
    addCheck("Local journal unreconciled", "WARN", error instanceof Error ? error.message : String(error));
  }

  if (config.printerKey !== "kiosko_godex_g500") {
    try {
      const productionQuery = new URLSearchParams({
        select: "id,status,printer_key,attempts,printed_at,claimed_at,error,created_at,updated_at,payload",
        printer_key: "eq.kiosko_godex_g500",
        status: "in.(queued,claimed)",
        order: "created_at.asc",
        limit: "200",
      });
      const { response, body } = await fetchJson(`${base}?${productionQuery.toString()}`, { headers });
      const jobs = Array.isArray(body) ? body : [];
      const queued = jobs.filter((job) => job.status === "queued").length;
      const claimed = jobs.filter((job) => job.status === "claimed").length;
      const claimedWithoutPrinted = jobs.filter((job) => job.status === "claimed" && !job.printed_at);
      const pendingCopies = jobs
        .filter((job) => job.status === "queued")
        .reduce((total, job) => total + jobCopies(job), 0);
      const oldest = jobs[0] || null;

      addCheck(
        "Production queue counts",
        response.ok && !queued && !claimed ? "OK" : "WARN",
        `printer=kiosko_godex_g500 queued=${queued} claimed=${claimed} claimed_without_printed_at=${claimedWithoutPrinted.length} potential_copies=${pendingCopies}${oldest ? ` oldest=${oldest.id} age=${ageText(oldest.created_at)}` : ""}`,
      );
    } catch (error) {
      addCheck("Production queue counts", "WARN", error instanceof Error ? error.message : String(error));
    }
  }

  try {
    const query = new URLSearchParams({
      select: "id,status,error,updated_at",
      printer_key: `eq.${config.printerKey}`,
      status: "eq.error",
      order: "updated_at.desc",
      limit: "10",
    });
    const { response, body } = await fetchJson(`${base}?${query.toString()}`, { headers });
    const retryable = Array.isArray(body)
      ? body.filter((job) => /ECONNREFUSED|timeout|timed out|ETIMEDOUT|EHOSTUNREACH|ENETUNREACH/i.test(String(job.error || "")))
      : [];
    addCheck("Retryable error jobs", response.ok ? "OK" : "WARN", `${retryable.length} error(es) de conectividad detectados en los ultimos 10 error jobs`);
  } catch (error) {
    addCheck("Retryable error jobs", "WARN", error instanceof Error ? error.message : String(error));
  }
} else {
  addCheck("Latest print job", "WARN", "No se consulta Supabase: falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
}

const maxName = Math.max(...checks.map((check) => check.name.length));
console.info("");
console.info("GoDEX bridge doctor");
console.info("===================");
for (const check of checks) {
  console.info(`${check.status.padEnd(5)} ${check.name.padEnd(maxName)} ${check.detail}`);
}
console.info("");
