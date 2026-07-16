import { buildGodex80x50QrTestEzpl, parseNativeQrCommand } from "../../lib/admin-kiosko/printing/godex-80x50-ezpl.mjs";
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
const ezpl = buildGodex80x50QrTestEzpl();
const qrValue = "ERP:QR-TEST:LOCAL";
const lines = ezpl.split(/\r?\n/);
const qrLineIndex = lines.findIndex((line) => line.startsWith("W360,150,3,2,M,8,5,"));
const parsedQr = parseNativeQrCommand(lines, qrLineIndex);
const started = Date.now();

if (!parsedQr || parsedQr.value !== qrValue) {
  logError("[GODEX QR VALIDATION ERROR]", {
    expected: qrValue,
    parsed: parsedQr,
  });
  process.exit(1);
}

try {
  logInfo("[GODEX TCP QR TEST START]", {
    transport: GODEX_PRINT_TRANSPORTS.TCP_9100,
    host,
    port,
    timeoutMs,
    qrValue,
    qrCommand: lines[qrLineIndex],
    ezplBytes: Buffer.byteLength(ezpl, "utf8"),
  });
  logInfo("[GODEX TCP QR TEST EZPL]", { rawCommand: ezpl });

  await printRawEzpl(ezpl, {
    transport: GODEX_PRINT_TRANSPORTS.TCP_9100,
    host,
    port,
    timeoutMs,
  });

  logInfo("[GODEX TCP QR TEST OK]", {
    transport: GODEX_PRINT_TRANSPORTS.TCP_9100,
    host,
    port,
    durationMs: Date.now() - started,
  });
} catch (error) {
  logError("[GODEX TCP QR TEST ERROR]", {
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
