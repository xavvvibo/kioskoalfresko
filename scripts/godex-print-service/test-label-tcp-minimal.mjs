import { buildGodex80x50MinimalTestEzpl } from "../../lib/admin-kiosko/printing/godex-80x50-ezpl.mjs";
import { loadGodexEnv } from "./env.mjs";
import { GODEX_PRINT_TRANSPORTS, printRawEzpl } from "./raw-printer.mjs";

function logInfo(message, meta = {}) {
  process.stdout.write(`${new Date().toISOString()} ${message} ${JSON.stringify(meta)}\n`);
}

function logError(message, meta = {}) {
  process.stderr.write(`${new Date().toISOString()} ${message} ${JSON.stringify(meta)}\n`);
}

await loadGodexEnv();

const host = process.env.GODEX_PRINTER_HOST || "192.168.1.38";
const port = Number(process.env.GODEX_PRINTER_PORT || 9100);
const timeoutMs = Number(process.env.GODEX_TCP_TIMEOUT_MS || 5000);
const ezpl = buildGodex80x50MinimalTestEzpl();
const started = Date.now();

try {
  logInfo("[GODEX TCP MINIMAL TEST START]", {
    transport: GODEX_PRINT_TRANSPORTS.TCP_9100,
    host,
    port,
    timeoutMs,
    ezplBytes: Buffer.byteLength(ezpl, "utf8"),
  });
  logInfo("[GODEX TCP MINIMAL TEST EZPL]", { rawCommand: ezpl });

  await printRawEzpl(ezpl, {
    transport: GODEX_PRINT_TRANSPORTS.TCP_9100,
    host,
    port,
    timeoutMs,
  });

  logInfo("[GODEX TCP MINIMAL TEST OK]", {
    transport: GODEX_PRINT_TRANSPORTS.TCP_9100,
    host,
    port,
    durationMs: Date.now() - started,
  });
} catch (error) {
  logError("[GODEX TCP MINIMAL TEST ERROR]", {
    transport: GODEX_PRINT_TRANSPORTS.TCP_9100,
    host,
    port,
    timeoutMs,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    durationMs: Date.now() - started,
  });
  process.exitCode = 1;
}
