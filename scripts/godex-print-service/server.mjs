import http from "node:http";
import net from "node:net";
import fs from "node:fs/promises";
import path from "node:path";
import { loadGodexEnv, packageVersion } from "./env.mjs";
import { GODEX_PRINT_TRANSPORTS, printRawEzpl } from "./raw-printer.mjs";
import { processBridgeJob, startupQueueDecision } from "./bridge-core.mjs";

const loadedEnvFiles = await loadGodexEnv();

const bridgeVersion = process.env.BRIDGE_VERSION || process.env.npm_package_version || await packageVersion();

const config = {
  erpApiUrl: (process.env.ERP_API_URL || "").replace(/\/$/, ""),
  token: process.env.ERP_API_TOKEN || "",
  printerKey: process.env.PRINTER_KEY || "kiosko_godex_g500",
  transport: process.env.GODEX_PRINT_TRANSPORT || GODEX_PRINT_TRANSPORTS.TCP_9100,
  printerHost: process.env.GODEX_HOST || process.env.GODEX_PRINTER_HOST || "",
  printerPort: Number(process.env.GODEX_PORT || process.env.GODEX_PRINTER_PORT || 9100),
  tcpTimeoutMs: Number(process.env.GODEX_TCP_TIMEOUT_MS || 5000),
  printDebugEzpl: process.env.PRINT_DEBUG_EZPL === "true",
  pollIntervalMs: Math.max(500, Number(process.env.POLL_INTERVAL_MS || 2000)),
  maxJobsPerPoll: Math.max(1, Math.min(5, Number(process.env.MAX_JOBS_PER_POLL || 1))),
  dryRun: process.env.GODEX_DRY_RUN === "true",
  dryRunMarkPrinted: process.env.DRY_RUN_MARK_PRINTED === "true",
  processHistoricalJobs: process.env.BRIDGE_PROCESS_HISTORICAL_JOBS === "true",
  bridgeVersion,
  healthHost: process.env.BRIDGE_HEALTH_HOST || "127.0.0.1",
  healthPort: Number(process.env.BRIDGE_HEALTH_PORT || 8787),
  maxJobBytes: Math.max(512, Math.min(64 * 1024, Number(process.env.GODEX_MAX_JOB_BYTES || 24576))),
  maxCopies: Math.max(1, Math.min(8, Number(process.env.GODEX_MAX_COPIES || 8))),
  journalDir: process.env.GODEX_PRINT_JOURNAL_DIR || path.join(process.cwd(), "var/godex-print-journal"),
  allowedOrigins: (process.env.LOCAL_PRINT_BRIDGE_ALLOWED_ORIGINS || "http://localhost:3000,https://kioskoalfresko.es")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};
const bridgeStartedAt = new Date();

function logInfo(message, meta = {}) {
  process.stdout.write(`${new Date().toISOString()} ${message} ${JSON.stringify(meta)}\n`);
}

function logError(message, meta = {}) {
  process.stderr.write(`${new Date().toISOString()} ${message} ${JSON.stringify(meta)}\n`);
}

function assertConfig() {
  const missing = [];
  if (!config.erpApiUrl) missing.push("ERP_API_URL");
  if (!config.token) missing.push("ERP_API_TOKEN");
  if (!config.printerKey) missing.push("PRINTER_KEY");
  if (config.transport !== GODEX_PRINT_TRANSPORTS.TCP_9100) {
    throw new Error(`GODEX_PRINT_TRANSPORT no soportado: ${config.transport}`);
  }
  if (config.transport === GODEX_PRINT_TRANSPORTS.TCP_9100 && !config.printerHost) missing.push("GODEX_HOST");
  if (config.transport === GODEX_PRINT_TRANSPORTS.TCP_9100 && (!Number.isFinite(config.printerPort) || config.printerPort <= 0)) missing.push("GODEX_PORT");
  if (missing.length) {
    throw new Error(`Faltan variables de entorno: ${missing.join(", ")}`);
  }
}

function transportMeta() {
  return {
    transport: config.transport,
    host: config.printerHost,
    port: config.printerPort,
    timeoutMs: config.tcpTimeoutMs,
  };
}

function objectKeys(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? Object.keys(value).sort() : [];
}

function ezplLines(rawCommand) {
  return String(rawCommand || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function ezplSummary(rawCommand) {
  const lines = ezplLines(rawCommand);
  return {
    firstLines: lines.slice(0, 8),
    lastLines: lines.slice(-8),
    lineCount: lines.length,
  };
}

function isValidGodexEzpl(rawCommand) {
  if (typeof rawCommand !== "string" || !rawCommand.trim()) return false;
  if (Buffer.byteLength(rawCommand, "utf8") > config.maxJobBytes) return false;
  const lines = ezplLines(rawCommand);
  if (!lines.length) return false;
  const copiesLine = lines.find((line) => line.startsWith("^P"));
  const copies = copiesLine ? Number(copiesLine.slice(2).trim()) : 1;
  return Number.isFinite(copies)
    && copies >= 1
    && copies <= config.maxCopies
    && lines[0].startsWith("^Q")
    && lines.some((line) => line.startsWith("^W"))
    && lines.some((line) => line === "^L")
    && lines[lines.length - 1] === "E";
}

function jobTemplate(job) {
  return job.payload_json?.template || job.payload_json?.data?.template || job.label_type || "";
}

function jobPayloadKeys(job) {
  return {
    jobKeys: objectKeys(job),
    payloadKeys: objectKeys(job.payload_json),
    payloadDataKeys: objectKeys(job.payload_json?.data),
    payloadMetadataKeys: objectKeys(job.payload_json?.metadata),
    hasRawCommand: typeof job.raw_command === "string",
    rawCommandType: typeof job.raw_command,
    hasCommand: typeof job.command === "string",
    hasLabelCommand: Boolean(job.labelCommand || job.label_command),
  };
}

function apiUrl(pathname) {
  return `${config.erpApiUrl}${pathname}`;
}

async function apiFetch(pathname, init = {}) {
  const response = await fetch(apiUrl(pathname), {
    ...init,
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `HTTP ${response.status}`);
  }
  return body;
}

async function checkApiHealth() {
  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(config.erpApiUrl, {
      method: "GET",
      headers: config.token ? { Authorization: `Bearer ${config.token}` } : {},
      signal: controller.signal,
    });

    return {
      ok: response.status < 500,
      status: response.status,
      durationMs: Date.now() - started,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - started,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function checkPrinterTcpHealth() {
  const started = Date.now();
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const done = (result) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({
        ...result,
        host: config.printerHost,
        port: config.printerPort,
        durationMs: Date.now() - started,
      });
    };

    socket.setTimeout(config.tcpTimeoutMs);
    socket.once("connect", () => {
      socket.end();
      done({ ok: true });
    });
    socket.once("timeout", () => done({ ok: false, error: `Timeout TCP ${config.printerHost}:${config.printerPort}` }));
    socket.once("error", (error) => done({ ok: false, error: error.message }));
    socket.connect(config.printerPort, config.printerHost);
  });
}

async function healthPayload() {
  const [api, printerTcp] = await Promise.all([
    checkApiHealth(),
    checkPrinterTcpHealth(),
  ]);

  return {
    status: api.ok && printerTcp.ok ? "OK" : "ERROR",
    api: api.ok ? "OK" : "ERROR",
    printerTcp: printerTcp.skipped ? "SKIPPED" : printerTcp.ok ? "OK" : "ERROR",
    version: config.bridgeVersion,
    printerKey: config.printerKey,
    transport: config.transport,
    polling: true,
    pollIntervalMs: config.pollIntervalMs,
    maxJobsPerPoll: config.maxJobsPerPoll,
    maxJobBytes: config.maxJobBytes,
    maxCopies: config.maxCopies,
    details: {
      api,
      printerTcp,
    },
  };
}

function startHealthServer() {
  if (!Number.isFinite(config.healthPort) || config.healthPort <= 0) {
    logInfo("[BRIDGE HEALTH DISABLED]", { healthPort: config.healthPort });
    return;
  }

  const server = http.createServer(async (request, response) => {
    const origin = request.headers.origin || "";
    const corsHeaders = {
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
    };
    if (origin && config.allowedOrigins.includes(origin)) {
      corsHeaders["Access-Control-Allow-Origin"] = origin;
    }

    if (request.method === "OPTIONS") {
      response.writeHead(origin && !config.allowedOrigins.includes(origin) ? 403 : 204, corsHeaders);
      response.end();
      return;
    }

    if (request.method !== "GET" || request.url?.split("?")[0] !== "/health") {
      response.writeHead(404, { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "Not found" }));
      return;
    }

    const payload = await healthPayload();
    response.writeHead(payload.status === "OK" ? 200 : 503, {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end(JSON.stringify(payload, null, 2));
  });

  server.listen(config.healthPort, config.healthHost, () => {
    logInfo("[BRIDGE HEALTH START]", {
      url: `http://${config.healthHost}:${config.healthPort}/health`,
      version: config.bridgeVersion,
      printerKey: config.printerKey,
    });
  });
}

async function markPrinted(jobId) {
  await apiFetch(`/api/print-jobs/${encodeURIComponent(jobId)}/printed`, { method: "PATCH" });
}

async function markSending(jobId) {
  await apiFetch(`/api/print-jobs/${encodeURIComponent(jobId)}/sending`, { method: "PATCH" });
}

async function markSentUnconfirmed(jobId, meta) {
  await apiFetch(`/api/print-jobs/${encodeURIComponent(jobId)}/sent-unconfirmed`, {
    method: "PATCH",
    body: JSON.stringify(meta),
  });
}

function safeJournalPart(value) {
  return String(value || "")
    .replace(/[^a-zA-Z0-9_.-]/g, "_")
    .slice(0, 120);
}

async function writeJournal(receipt) {
  await fs.mkdir(config.journalDir, { recursive: true });
  const timestamp = safeJournalPart(receipt.timestamp || new Date().toISOString());
  const jobId = safeJournalPart(receipt.jobId);
  const filePath = path.join(config.journalDir, `${timestamp}-${jobId}.json`);
  const tmpPath = path.join(config.journalDir, `.${timestamp}-${jobId}-${process.pid}.tmp`);
  const body = JSON.stringify({
    jobId: receipt.jobId,
    printerKey: receipt.printerKey,
    timestamp: receipt.timestamp,
    bytes: receipt.bytes,
    tcpResult: receipt.tcpResult,
  }, null, 2);
  await fs.writeFile(tmpPath, `${body}\n`, { mode: 0o600 });
  await fs.rename(tmpPath, filePath);
  return filePath;
}

async function markError(jobId, errorMessage) {
  await apiFetch(`/api/print-jobs/${encodeURIComponent(jobId)}/error`, {
    method: "PATCH",
    body: JSON.stringify({ error_message: errorMessage }),
  });
}

async function queueSummary() {
  const body = await apiFetch(`/api/print-jobs/summary?printer_key=${encodeURIComponent(config.printerKey)}`);
  return body.summary || null;
}

let polling = false;

async function pollOnce() {
  if (polling) return;
  polling = true;

  try {
    const summary = await queueSummary();
    const decision = startupQueueDecision(summary, { bridgeStartedAt, processHistoricalJobs: config.processHistoricalJobs });
    if (!decision.shouldPoll) {
      logError("[PRINT BRIDGE HOLD HISTORICAL QUEUE]", {
        bridgeStartedAt: bridgeStartedAt.toISOString(),
        ...decision,
      });
      return;
    }

    const pathName = `/api/print-jobs/pending?printer_key=${encodeURIComponent(config.printerKey)}&limit=${config.maxJobsPerPoll}`;
    const body = await apiFetch(pathName);
    const jobs = Array.isArray(body.jobs) ? body.jobs : [];

    if (!jobs.length) return;

    for (const job of jobs) {
      const started = Date.now();
      try {
        const ezplBytes = typeof job.raw_command === "string" ? Buffer.byteLength(job.raw_command, "utf8") : 0;
        const ezplMeta = {
          id: job.id,
          template: jobTemplate(job),
          printer_key: job.printer_key,
          attempts: job.attempts,
          ...jobPayloadKeys(job),
          ezplBytes,
          maxJobBytes: config.maxJobBytes,
          maxCopies: config.maxCopies,
          ...ezplSummary(job.raw_command),
        };

        logInfo("[PRINT JOB EZPL INSPECT]", ezplMeta);
        if (config.printDebugEzpl) {
          logInfo("[PRINT JOB EZPL FULL]", {
            id: job.id,
            template: jobTemplate(job),
            printer_key: job.printer_key,
            ezplBytes,
            rawCommand: job.raw_command,
          });
        }

        logInfo("[PRINT JOB START]", {
          id: job.id,
          template: jobTemplate(job),
          printer_key: job.printer_key,
          attempts: job.attempts,
          ...transportMeta(),
          ezplBytes,
          statusPrevious: job.claimed_from_status || "queued/error",
          statusNew: "claimed",
          dryRun: config.dryRun,
        });

        const printRaw = async (rawCommand) => {
          if (config.dryRun) {
          logInfo("[PRINT JOB DRY RUN EZPL]", {
            id: job.id,
            template: jobTemplate(job),
            printer_key: job.printer_key,
            attempts: job.attempts,
            ...transportMeta(),
            ezplBytes,
            rawCommand: job.raw_command,
          });
          if (!config.dryRunMarkPrinted) {
            throw new Error("Dry-run completado. No se marca printed porque DRY_RUN_MARK_PRINTED no es true.");
          }
            return;
          }
          await printRawEzpl(rawCommand, {
            transport: config.transport,
            host: config.printerHost,
            port: config.printerPort,
            timeoutMs: config.tcpTimeoutMs,
          });
        };

        const result = await processBridgeJob(job, {
          printRaw,
          markSending,
          markSentUnconfirmed,
          markPrinted,
          markError,
          writeJournal,
        }, {
          transport: config.transport,
          host: config.printerHost,
          port: config.printerPort,
          timeoutMs: config.tcpTimeoutMs,
          isValidEzpl: isValidGodexEzpl,
        });
        if (!result.ok) {
          throw new Error(`${result.phase}: ${result.error || result.status}`);
        }
        logInfo("[PRINT JOB PRINTED]", {
          id: job.id,
          template: jobTemplate(job),
          printer_key: job.printer_key,
          attempts: job.attempts,
          ...transportMeta(),
          ezplBytes,
          statusPrevious: "claimed",
          statusNew: "printed",
          durationMs: Date.now() - started,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido imprimiendo.";
        const statusNew = /tcp_accepted|sent_unconfirmed/.test(message) ? "sent_unconfirmed" : "error";
        logError("[PRINT JOB ERROR]", {
          id: job.id,
          template: jobTemplate(job),
          printer_key: job.printer_key,
          attempts: job.attempts,
          ...transportMeta(),
          ezplBytes: typeof job.raw_command === "string" ? Buffer.byteLength(job.raw_command, "utf8") : 0,
          statusPrevious: "claimed",
          statusNew,
          error: message,
          stack: error instanceof Error ? error.stack : undefined,
          durationMs: Date.now() - started,
        });
      }
    }
  } catch (error) {
    logError("[PRINT BRIDGE POLL ERROR]", { error: error instanceof Error ? error.message : String(error) });
  } finally {
    polling = false;
  }
}

assertConfig();
startHealthServer();
logInfo("[PRINT BRIDGE START]", {
  erpApiUrl: config.erpApiUrl,
  printerKey: config.printerKey,
  version: config.bridgeVersion,
  loadedEnvFiles,
  ...transportMeta(),
  pollIntervalMs: config.pollIntervalMs,
  dryRun: config.dryRun,
  dryRunMarkPrinted: config.dryRunMarkPrinted,
  printDebugEzpl: config.printDebugEzpl,
  maxJobBytes: config.maxJobBytes,
  maxCopies: config.maxCopies,
  journalDir: config.journalDir,
  processHistoricalJobs: config.processHistoricalJobs,
  bridgeStartedAt: bridgeStartedAt.toISOString(),
  allowedOrigins: config.allowedOrigins,
});

await pollOnce();
setInterval(pollOnce, config.pollIntervalMs);
