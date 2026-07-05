import fs from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GODEX_PRINT_TRANSPORTS, printRawEzpl } from "./raw-printer.mjs";

const serviceDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(serviceDir, "../..");

async function loadEnvFile(filePath, { override = false } = {}) {
  const content = await fs.readFile(filePath, "utf8").catch(() => "");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    const value = rest.join("=").trim().replace(/^"|"$/g, "");
    if (override || !process.env[key]) process.env[key] = value;
  }
}

async function packageVersion() {
  const content = await fs.readFile(path.join(repoRoot, "package.json"), "utf8").catch(() => "");
  if (!content) return "unknown";
  return JSON.parse(content).version || "unknown";
}

await loadEnvFile(path.join(serviceDir, ".env"));
await loadEnvFile(path.join(process.cwd(), ".env"));
await loadEnvFile(path.join(serviceDir, "bridge.env"), { override: true });
await loadEnvFile(path.join(process.cwd(), "bridge.env"), { override: true });

const bridgeVersion = process.env.BRIDGE_VERSION || process.env.npm_package_version || await packageVersion();

const config = {
  erpApiUrl: (process.env.ERP_API_URL || "").replace(/\/$/, ""),
  token: process.env.ERP_API_TOKEN || process.env.PRINT_JOBS_API_TOKEN || "",
  printerKey: process.env.PRINTER_KEY || "godex_g500_kiosko",
  transport: process.env.GODEX_PRINT_TRANSPORT || GODEX_PRINT_TRANSPORTS.WINDOWS_SPOOLER,
  windowsPrinterName: process.env.WINDOWS_PRINTER_NAME || "GoDEX G500",
  printerHost: process.env.GODEX_PRINTER_HOST || "",
  printerPort: Number(process.env.GODEX_PRINTER_PORT || 9100),
  tcpTimeoutMs: Number(process.env.GODEX_TCP_TIMEOUT_MS || 5000),
  printDebugEzpl: process.env.PRINT_DEBUG_EZPL === "true",
  pollIntervalMs: Math.max(500, Number(process.env.POLL_INTERVAL_MS || 2000)),
  maxJobsPerPoll: Math.max(1, Math.min(5, Number(process.env.MAX_JOBS_PER_POLL || 1))),
  dryRun: process.env.GODEX_DRY_RUN === "true",
  dryRunMarkPrinted: process.env.DRY_RUN_MARK_PRINTED === "true",
  bridgeVersion,
  healthHost: process.env.BRIDGE_HEALTH_HOST || "127.0.0.1",
  healthPort: Number(process.env.BRIDGE_HEALTH_PORT || 8787),
};

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
  if (![GODEX_PRINT_TRANSPORTS.WINDOWS_SPOOLER, GODEX_PRINT_TRANSPORTS.TCP_9100].includes(config.transport)) {
    throw new Error(`GODEX_PRINT_TRANSPORT no soportado: ${config.transport}`);
  }
  if (config.transport === GODEX_PRINT_TRANSPORTS.WINDOWS_SPOOLER && !config.windowsPrinterName) missing.push("WINDOWS_PRINTER_NAME");
  if (config.transport === GODEX_PRINT_TRANSPORTS.TCP_9100 && !config.printerHost) missing.push("GODEX_PRINTER_HOST");
  if (config.transport === GODEX_PRINT_TRANSPORTS.TCP_9100 && (!Number.isFinite(config.printerPort) || config.printerPort <= 0)) missing.push("GODEX_PRINTER_PORT");
  if (missing.length) {
    throw new Error(`Faltan variables de entorno: ${missing.join(", ")}`);
  }
}

function transportMeta() {
  return config.transport === GODEX_PRINT_TRANSPORTS.TCP_9100
    ? {
        transport: config.transport,
        host: config.printerHost,
        port: config.printerPort,
        timeoutMs: config.tcpTimeoutMs,
      }
    : {
        transport: config.transport,
        windowsPrinterName: config.windowsPrinterName,
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
  const lines = ezplLines(rawCommand);
  if (!lines.length) return false;
  return lines[0].startsWith("^Q")
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
  if (config.transport !== GODEX_PRINT_TRANSPORTS.TCP_9100) {
    return {
      ok: true,
      skipped: true,
      reason: "printer_health_tcp_only",
    };
  }

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
    if (request.method !== "GET" || request.url?.split("?")[0] !== "/health") {
      response.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "Not found" }));
      return;
    }

    const payload = await healthPayload();
    response.writeHead(payload.status === "OK" ? 200 : 503, {
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

async function markError(jobId, errorMessage) {
  await apiFetch(`/api/print-jobs/${encodeURIComponent(jobId)}/error`, {
    method: "PATCH",
    body: JSON.stringify({ error_message: errorMessage }),
  });
}

let polling = false;

async function pollOnce() {
  if (polling) return;
  polling = true;

  try {
    const pathName = `/api/print-jobs/pending?printer_key=${encodeURIComponent(config.printerKey)}&limit=${config.maxJobsPerPoll}`;
    const body = await apiFetch(pathName);
    const jobs = Array.isArray(body.jobs) ? body.jobs : [];

    if (!jobs.length) return;

    for (const job of jobs) {
      const started = Date.now();
      try {
        if (job.command_language !== "ezpl") {
          throw new Error(`Lenguaje no soportado por este bridge: ${job.command_language}`);
        }

        const ezplBytes = typeof job.raw_command === "string" ? Buffer.byteLength(job.raw_command, "utf8") : 0;
        const ezplMeta = {
          id: job.id,
          template: jobTemplate(job),
          printer_key: job.printer_key,
          attempts: job.attempts,
          ...jobPayloadKeys(job),
          ezplBytes,
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

        if (!isValidGodexEzpl(job.raw_command)) {
          throw new Error("Invalid or empty EZPL payload");
        }

        logInfo("[PRINT JOB START]", {
          id: job.id,
          template: jobTemplate(job),
          printer_key: job.printer_key,
          attempts: job.attempts,
          ...transportMeta(),
          ezplBytes,
          statusPrevious: job.claimed_from_status || "pending/error",
          statusNew: "printing",
          dryRun: config.dryRun,
        });

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
        } else {
          await printRawEzpl(job.raw_command, {
            transport: config.transport,
            windowsPrinterName: config.windowsPrinterName,
            host: config.printerHost,
            port: config.printerPort,
            timeoutMs: config.tcpTimeoutMs,
          });
        }

        await markPrinted(job.id);
        logInfo("[PRINT JOB PRINTED]", {
          id: job.id,
          template: jobTemplate(job),
          printer_key: job.printer_key,
          attempts: job.attempts,
          ...transportMeta(),
          ezplBytes,
          statusPrevious: "printing",
          statusNew: "printed",
          durationMs: Date.now() - started,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido imprimiendo.";
        await markError(job.id, message).catch((reportError) => {
          logError("[PRINT JOB REPORT ERROR]", {
            id: job.id,
            template: jobTemplate(job),
            printer_key: job.printer_key,
            attempts: job.attempts,
            ...transportMeta(),
            originalError: message,
            reportError: reportError instanceof Error ? reportError.message : String(reportError),
          });
        });
        logError("[PRINT JOB ERROR]", {
          id: job.id,
          template: jobTemplate(job),
          printer_key: job.printer_key,
          attempts: job.attempts,
          ...transportMeta(),
          ezplBytes: typeof job.raw_command === "string" ? Buffer.byteLength(job.raw_command, "utf8") : 0,
          statusPrevious: "printing",
          statusNew: "error",
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
  ...transportMeta(),
  pollIntervalMs: config.pollIntervalMs,
  dryRun: config.dryRun,
  dryRunMarkPrinted: config.dryRunMarkPrinted,
  printDebugEzpl: config.printDebugEzpl,
});

await pollOnce();
setInterval(pollOnce, config.pollIntervalMs);
