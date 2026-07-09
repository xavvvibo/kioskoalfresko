#!/usr/bin/env node

import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const cwd = process.cwd();

async function loadEnvFile(filePath, allowedKeys = null) {
  const content = await fs.readFile(filePath, "utf8").catch(() => "");
  if (!content) return false;

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (allowedKeys && !allowedKeys.has(key)) continue;
    const value = rest.join("=").trim().replace(/^"|"$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
  return true;
}

await loadEnvFile(path.join(scriptDir, ".env.local"));
await loadEnvFile(path.join(scriptDir, ".env"));
const runningPackagedBridgeOutsideCwd = path.basename(scriptDir) === "godex-print-bridge-windows"
  && path.resolve(cwd) !== path.resolve(scriptDir);
const cwdAllowedKeys = runningPackagedBridgeOutsideCwd
  ? new Set(["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"])
  : null;
await loadEnvFile(path.join(cwd, ".env.local"), cwdAllowedKeys);
await loadEnvFile(path.join(cwd, ".env"), cwdAllowedKeys);

const BRIDGE_STARTED_AT = new Date();
const DEFAULT_PRINTER_KEY = "kiosko_godex_g500";
const DEFAULT_PRINTER_HOST = "192.168.1.37";
const DEFAULT_PRINTER_PORT = 9100;
const DEFAULT_POLL_MS = 4000;
const MAX_ATTEMPTS = 3;

function ezplLines(ezpl) {
  return String(ezpl || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function isValidGodex80x50Ezpl(ezpl) {
  const lines = ezplLines(ezpl);
  if (!lines.length) return false;
  const copiesLine = lines.find((line) => line.startsWith("^P"));
  const copies = copiesLine ? Number(copiesLine.slice(2).trim()) : 1;
  return Number.isFinite(copies)
    && copies >= 1
    && copies <= 8
    && lines[0].startsWith("^Q")
    && lines.some((line) => line.startsWith("^W"))
    && lines.some((line) => line === "^L")
    && lines[lines.length - 1] === "E"
    && /^[\x09\x0A\x0D\x20-\x7E]*$/.test(String(ezpl || ""));
}

function summarizeGodexEzpl(ezpl) {
  const lines = ezplLines(ezpl);
  return {
    rawCommandLength: Buffer.byteLength(String(ezpl || ""), "utf8"),
    firstLines: lines.slice(0, 8),
    lastLines: lines.slice(-8),
    lineCount: lines.length,
  };
}

async function sendRawToTcpPrinter(rawCommand, host, port = 9100, timeoutMs = 5000) {
  const payload = Buffer.from(String(rawCommand), "utf8");
  const printerPort = Number(port || 9100);
  const socketTimeoutMs = Math.max(1000, Number(timeoutMs || 5000));

  await new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let settled = false;
    let timer;

    function finish(error) {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      socket.destroy();
      if (error) reject(error);
      else resolve();
    }

    timer = setTimeout(() => {
      finish(new Error(`Timeout TCP GoDEX ${host}:${printerPort} tras ${socketTimeoutMs}ms.`));
    }, socketTimeoutMs);

    socket.on("error", (error) => {
      finish(new Error(`Error TCP GoDEX ${host}:${printerPort}: ${error.message}`));
    });

    socket.on("finish", () => finish());

    socket.connect(printerPort, host, () => {
      socket.write(payload, (error) => {
        if (error) {
          finish(new Error(`No se pudo enviar EZPL a GoDEX ${host}:${printerPort}: ${error.message}`));
          return;
        }
        socket.end();
      });
    });
  });
}

function parseArgs(argv) {
  const options = {
    dryRun: false,
    once: false,
    since: "",
    batch: "",
    jobGroup: "",
    limit: 5,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const [name, inlineValue] = arg.includes("=") ? arg.split(/=(.*)/s) : [arg, undefined];
    const nextValue = () => inlineValue ?? argv[index + 1] ?? "";

    if (name === "--dry-run") options.dryRun = true;
    else if (name === "--once") options.once = true;
    else if (name === "--since") {
      options.since = nextValue();
      if (inlineValue === undefined) index += 1;
    } else if (name === "--batch") {
      options.batch = nextValue();
      if (inlineValue === undefined) index += 1;
    } else if (name === "--job-group") {
      options.jobGroup = nextValue();
      if (inlineValue === undefined) index += 1;
    } else if (name === "--limit") {
      options.limit = Math.max(1, Math.min(20, Number(nextValue()) || 5));
      if (inlineValue === undefined) index += 1;
    } else if (name === "--help" || name === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Argumento no soportado: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Uso:
  node scripts/godex-print-bridge.mjs [--dry-run] [--once] [--since ISO] [--batch CODE] [--job-group ID]

Ejemplos:
  node scripts/godex-print-bridge.mjs --dry-run --once
  node scripts/godex-print-bridge.mjs --once --since "2026-07-09T00:00:00+02:00"
  node scripts/godex-print-bridge.mjs --since "2026-07-09T00:00:00+02:00" --batch FRZ-20260708

Fecha minima:
  --since manda sobre GODEX_MIN_JOB_CREATED_AT.
  Si no se configura ninguna, se usa la fecha/hora de arranque para no imprimir cola antigua.
`);
}

const args = parseArgs(process.argv.slice(2));

const config = {
  supabaseUrl: (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, ""),
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  printerKey: process.env.GODEX_PRINTER_KEY || process.env.PRINTER_KEY || DEFAULT_PRINTER_KEY,
  printerHost: process.env.GODEX_PRINTER_HOST || process.env.GODEX_BRIDGE_PRINTER_HOST || DEFAULT_PRINTER_HOST,
  printerPort: Number(process.env.GODEX_PRINTER_PORT || process.env.GODEX_BRIDGE_PRINTER_PORT || DEFAULT_PRINTER_PORT),
  pollIntervalMs: Math.max(3000, Math.min(5000, Number(process.env.GODEX_BRIDGE_POLL_MS || DEFAULT_POLL_MS))),
  tcpTimeoutMs: Math.max(1000, Number(process.env.GODEX_TCP_TIMEOUT_MS || 5000)),
  since: args.since || process.env.GODEX_MIN_JOB_CREATED_AT || BRIDGE_STARTED_AT.toISOString(),
  batch: args.batch,
  jobGroup: args.jobGroup,
  limit: args.limit,
  dryRun: args.dryRun,
  once: args.once,
};

function logInfo(message, meta = {}) {
  process.stdout.write(`${new Date().toISOString()} ${message} ${JSON.stringify(meta)}\n`);
}

function logError(message, meta = {}) {
  process.stderr.write(`${new Date().toISOString()} ${message} ${JSON.stringify(meta)}\n`);
}

function cleanError(value) {
  const text = value instanceof Error ? value.message : String(value || "Error desconocido");
  return text
    .replace(/<\/?[a-z][\s\S]*?>/gi, "")
    .replace(/\s+/g, " ")
    .slice(0, 500);
}

function assertConfig() {
  const missing = [];
  if (!config.supabaseUrl) missing.push("SUPABASE_URL o NEXT_PUBLIC_SUPABASE_URL");
  if (!config.serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!config.printerKey) missing.push("GODEX_PRINTER_KEY");
  if (!config.printerHost) missing.push("GODEX_PRINTER_HOST");
  if (!Number.isFinite(config.printerPort) || config.printerPort <= 0) missing.push("GODEX_PRINTER_PORT");
  if (Number.isNaN(new Date(config.since).getTime())) missing.push("--since con fecha ISO valida");
  if (missing.length) throw new Error(`Faltan variables/configuracion: ${missing.join(", ")}`);
}

async function supabaseRequest(path, init = {}) {
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  if (!response.ok) {
    const message = body && typeof body === "object"
      ? [body.message, body.details, body.hint, body.code].filter(Boolean).join(" · ")
      : text || `HTTP ${response.status}`;
    throw new Error(cleanError(message));
  }
  return body;
}

function metadata(job) {
  const payload = job?.payload && typeof job.payload === "object" ? job.payload : {};
  const meta = payload.metadata && typeof payload.metadata === "object" ? payload.metadata : {};
  return { payload, meta };
}

function matchesOptionalFilters(job) {
  const { payload, meta } = metadata(job);
  if (config.batch) {
    const values = [meta.batchCode, meta.batch, meta.sourceId, payload.batchCode, payload.batch]
      .map((value) => String(value || ""));
    if (!values.some((value) => value.includes(config.batch))) return false;
  }
  if (config.jobGroup) {
    const values = [meta.jobGroup, meta.requestId, meta.sourceId, meta.reason]
      .map((value) => String(value || ""));
    if (!values.some((value) => value.includes(config.jobGroup))) return false;
  }
  return true;
}

function rawCommandForJob(job) {
  const { payload } = metadata(job);
  return typeof payload.raw_command === "string" ? payload.raw_command : "";
}

async function listQueuedJobs() {
  const params = new URLSearchParams({
    select: "id,printer_key,status,payload,idempotency_key,attempts,created_at,updated_at,printed_at,error",
    printer_key: `eq.${config.printerKey}`,
    status: "eq.queued",
    created_at: `gte.${new Date(config.since).toISOString()}`,
    attempts: `lt.${MAX_ATTEMPTS}`,
    order: "created_at.asc",
    limit: String(config.limit),
  });
  const jobs = await supabaseRequest(`print_jobs?${params.toString()}`);
  return Array.isArray(jobs) ? jobs.filter(matchesOptionalFilters) : [];
}

async function patchJob(jobId, patch, extraQuery = "") {
  const query = `id=eq.${encodeURIComponent(jobId)}${extraQuery}&select=id,printer_key,status,payload,idempotency_key,attempts,created_at,updated_at,printed_at,error`;
  const result = await supabaseRequest(`print_jobs?${query}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  });
  return Array.isArray(result) ? result : [];
}

async function claimJob(job) {
  if (config.dryRun) return job;
  const now = new Date().toISOString();
  const claimed = await patchJob(job.id, {
    status: "claimed",
    attempts: Number(job.attempts || 0) + 1,
    claimed_at: now,
    error: null,
    error_message: null,
  }, "&status=eq.queued");
  return claimed[0] || null;
}

async function markSending(jobId) {
  if (config.dryRun) return;
  await patchJob(jobId, {
    status: "sending",
    transport_started_at: new Date().toISOString(),
    last_transport_result: {
      transport: "tcp_9100",
      host: config.printerHost,
      port: config.printerPort,
      bridge: "scripts/godex-print-bridge.mjs",
    },
  });
}

async function markPrinted(jobId) {
  if (config.dryRun) return;
  const now = new Date().toISOString();
  await patchJob(jobId, {
    status: "printed",
    sent_at: now,
    sent_unconfirmed_at: now,
    transport_confirmed_at: now,
    transport_confirmation_source: "godex-print-bridge",
    transport_confirmed_by: "local-kiosko-bridge",
    transport_confirmation_note: "TCP RAW 9100 aceptado por bridge local. No se expone la impresora a internet.",
    printed_at: now,
    error: null,
    error_message: null,
    last_transport_result: {
      ok: true,
      transport: "tcp_9100",
      host: config.printerHost,
      port: config.printerPort,
      bridge: "scripts/godex-print-bridge.mjs",
      printedAt: now,
    },
  });
}

async function markError(jobId, error) {
  if (config.dryRun) return;
  const message = cleanError(error);
  await patchJob(jobId, {
    status: "error",
    error: message,
    error_message: message,
    last_transport_result: {
      ok: false,
      transport: "tcp_9100",
      host: config.printerHost,
      port: config.printerPort,
      bridge: "scripts/godex-print-bridge.mjs",
      error: message,
      failedAt: new Date().toISOString(),
    },
  });
}

async function processJob(job) {
  const rawCommand = rawCommandForJob(job);
  const summary = summarizeGodexEzpl(rawCommand);
  const byteLength = Buffer.byteLength(rawCommand || "", "utf8");

  logInfo(config.dryRun ? "[GODEX BRIDGE DRY JOB]" : "[GODEX BRIDGE JOB]", {
    id: job.id,
    printerKey: job.printer_key,
    status: job.status,
    attempts: job.attempts,
    createdAt: job.created_at,
    bytes: byteLength,
    firstLines: summary.firstLines,
    lastLines: summary.lastLines,
  });

  if (!rawCommand || !isValidGodex80x50Ezpl(rawCommand)) {
    await markError(job.id, "raw_command EZPL ausente o invalido.");
    throw new Error("raw_command EZPL ausente o invalido.");
  }

  const claimed = await claimJob(job);
  if (!claimed) {
    logInfo("[GODEX BRIDGE SKIP CLAIMED]", { id: job.id });
    return false;
  }

  if (config.dryRun) return true;

  await markSending(claimed.id);
  try {
    await sendRawToTcpPrinter(rawCommand, config.printerHost, config.printerPort, config.tcpTimeoutMs);
    await markPrinted(claimed.id);
    logInfo("[GODEX BRIDGE PRINTED]", { id: claimed.id, printerKey: claimed.printer_key, bytes: byteLength });
    return true;
  } catch (error) {
    await markError(claimed.id, error);
    throw error;
  }
}

async function pollOnce() {
  const jobs = await listQueuedJobs();
  if (!jobs.length) {
    logInfo("[GODEX BRIDGE IDLE]", {
      printerKey: config.printerKey,
      since: config.since,
      batch: config.batch || null,
      jobGroup: config.jobGroup || null,
      dryRun: config.dryRun,
    });
    return 0;
  }

  let processed = 0;
  for (const job of jobs) {
    try {
      if (await processJob(job)) processed += 1;
    } catch (error) {
      logError("[GODEX BRIDGE JOB ERROR]", { id: job.id, error: cleanError(error) });
    }
  }
  return processed;
}

async function main() {
  assertConfig();
  logInfo("[GODEX BRIDGE START]", {
    printerKey: config.printerKey,
    printerHost: config.printerHost,
    printerPort: config.printerPort,
    pollIntervalMs: config.pollIntervalMs,
    dryRun: config.dryRun,
    once: config.once,
    since: config.since,
    batch: config.batch || null,
    jobGroup: config.jobGroup || null,
  });

  do {
    await pollOnce();
    if (config.once) break;
    await sleep(config.pollIntervalMs);
  } while (true);
}

main().catch((error) => {
  logError("[GODEX BRIDGE FATAL]", { error: cleanError(error) });
  process.exitCode = 1;
});
