import { buildGodex80x50SafeErpTestEzpl } from "../../lib/admin-kiosko/printing/godex-80x50-ezpl.mjs";
import { loadGodexEnv } from "./env.mjs";
import { GODEX_PRINT_TRANSPORTS, printRawEzpl } from "./raw-printer.mjs";

function logInfo(message, meta = {}) {
  process.stdout.write(`${new Date().toISOString()} ${message} ${JSON.stringify(meta)}\n`);
}

function logError(message, meta = {}) {
  process.stderr.write(`${new Date().toISOString()} ${message} ${JSON.stringify(meta)}\n`);
}

await loadGodexEnv();

const host = process.env.GODEX_HOST || process.env.GODEX_PRINTER_HOST || "";
const port = Number(process.env.GODEX_PORT || process.env.GODEX_PRINTER_PORT || 9100);
const timeoutMs = Number(process.env.GODEX_TCP_TIMEOUT_MS || 5000);
const timestamp = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  dateStyle: "short",
  timeStyle: "medium",
}).format(new Date());
const ezpl = buildGodex80x50SafeErpTestEzpl({ host, timestamp });
const started = Date.now();

try {
  logInfo("[GODEX SAFE ERP TEST START]", {
    transport: GODEX_PRINT_TRANSPORTS.TCP_9100,
    host,
    port,
    timeoutMs,
    copies: 1,
    ezplBytes: Buffer.byteLength(ezpl, "utf8"),
  });
  logInfo("[GODEX SAFE ERP TEST EZPL]", { rawCommand: ezpl });

  await printRawEzpl(ezpl, {
    transport: GODEX_PRINT_TRANSPORTS.TCP_9100,
    host,
    port,
    timeoutMs,
  });

  logInfo("[GODEX SAFE ERP TEST SENT]", {
    transport: GODEX_PRINT_TRANSPORTS.TCP_9100,
    host,
    port,
    copies: 1,
    bytesSent: Buffer.byteLength(ezpl, "utf8"),
    durationMs: Date.now() - started,
    verification: "TCP write accepted; physical paper output is not observable from this process.",
  });
} catch (error) {
  logError("[GODEX SAFE ERP TEST ERROR]", {
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
