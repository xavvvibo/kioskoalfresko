import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sendRawToWindowsPrinter } from "./raw-printer.mjs";

const serviceDir = path.dirname(fileURLToPath(import.meta.url));

async function loadEnvFile(filePath) {
  const content = await fs.readFile(filePath, "utf8").catch(() => "");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    const value = rest.join("=").trim().replace(/^"|"$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

await loadEnvFile(path.join(serviceDir, ".env"));
await loadEnvFile(path.join(process.cwd(), ".env"));

const config = {
  erpApiUrl: (process.env.ERP_API_URL || "").replace(/\/$/, ""),
  token: process.env.ERP_API_TOKEN || process.env.PRINT_JOBS_API_TOKEN || "",
  printerKey: process.env.PRINTER_KEY || "godex_g500_kiosko",
  windowsPrinterName: process.env.WINDOWS_PRINTER_NAME || "GoDEX G500",
  pollIntervalMs: Math.max(500, Number(process.env.POLL_INTERVAL_MS || 2000)),
  maxJobsPerPoll: Math.max(1, Math.min(5, Number(process.env.MAX_JOBS_PER_POLL || 1))),
  dryRun: process.env.GODEX_DRY_RUN === "true",
  dryRunMarkPrinted: process.env.DRY_RUN_MARK_PRINTED === "true",
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
  if (!config.windowsPrinterName) missing.push("WINDOWS_PRINTER_NAME");
  if (missing.length) {
    throw new Error(`Faltan variables de entorno: ${missing.join(", ")}`);
  }
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
        if (typeof job.raw_command !== "string" || !job.raw_command.trim()) {
          throw new Error("Trabajo sin comando RAW.");
        }

        logInfo("[PRINT JOB START]", {
          id: job.id,
          printer_key: job.printer_key,
          attempts: job.attempts,
          windowsPrinterName: config.windowsPrinterName,
          statusPrevious: job.claimed_from_status || "pending/error",
          statusNew: "printing",
          dryRun: config.dryRun,
        });

        if (config.dryRun) {
          logInfo("[PRINT JOB DRY RUN EZPL]", {
            id: job.id,
            printer_key: job.printer_key,
            attempts: job.attempts,
            windowsPrinterName: config.windowsPrinterName,
            rawCommand: job.raw_command,
          });
          if (!config.dryRunMarkPrinted) {
            throw new Error("Dry-run completado. No se marca printed porque DRY_RUN_MARK_PRINTED no es true.");
          }
        } else {
          await sendRawToWindowsPrinter(job.raw_command, config.windowsPrinterName);
        }

        await markPrinted(job.id);
        logInfo("[PRINT JOB PRINTED]", {
          id: job.id,
          printer_key: job.printer_key,
          attempts: job.attempts,
          windowsPrinterName: config.windowsPrinterName,
          statusPrevious: "printing",
          statusNew: "printed",
          durationMs: Date.now() - started,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido imprimiendo.";
        await markError(job.id, message).catch((reportError) => {
          logError("[PRINT JOB REPORT ERROR]", {
            id: job.id,
            printer_key: job.printer_key,
            attempts: job.attempts,
            windowsPrinterName: config.windowsPrinterName,
            originalError: message,
            reportError: reportError instanceof Error ? reportError.message : String(reportError),
          });
        });
        logError("[PRINT JOB ERROR]", {
          id: job.id,
          printer_key: job.printer_key,
          attempts: job.attempts,
          windowsPrinterName: config.windowsPrinterName,
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
logInfo("[PRINT BRIDGE START]", {
  erpApiUrl: config.erpApiUrl,
  printerKey: config.printerKey,
  windowsPrinterName: config.windowsPrinterName,
  pollIntervalMs: config.pollIntervalMs,
  dryRun: config.dryRun,
  dryRunMarkPrinted: config.dryRunMarkPrinted,
});

await pollOnce();
setInterval(pollOnce, config.pollIntervalMs);
