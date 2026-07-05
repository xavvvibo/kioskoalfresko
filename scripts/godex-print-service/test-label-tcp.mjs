import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildGodex80x50TestEzpl } from "../../lib/admin-kiosko/printing/godex-80x50-ezpl.mjs";
import { GODEX_PRINT_TRANSPORTS, printRawEzpl } from "./raw-printer.mjs";

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

function logInfo(message, meta = {}) {
  process.stdout.write(`${new Date().toISOString()} ${message} ${JSON.stringify(meta)}\n`);
}

function logError(message, meta = {}) {
  process.stderr.write(`${new Date().toISOString()} ${message} ${JSON.stringify(meta)}\n`);
}

await loadEnvFile(path.join(serviceDir, ".env"));
await loadEnvFile(path.join(process.cwd(), ".env"));

const host = process.env.GODEX_PRINTER_HOST || "192.168.1.38";
const port = Number(process.env.GODEX_PRINTER_PORT || 9100);
const timeoutMs = Number(process.env.GODEX_TCP_TIMEOUT_MS || 5000);
const ezpl = buildGodex80x50TestEzpl();
const started = Date.now();

try {
  logInfo("[GODEX TCP TEST LABEL START]", {
    transport: GODEX_PRINT_TRANSPORTS.TCP_9100,
    host,
    port,
    timeoutMs,
    ezplBytes: Buffer.byteLength(ezpl, "utf8"),
  });
  logInfo("[GODEX TCP TEST LABEL EZPL]", { rawCommand: ezpl });

  await printRawEzpl(ezpl, {
    transport: GODEX_PRINT_TRANSPORTS.TCP_9100,
    host,
    port,
    timeoutMs,
  });

  logInfo("[GODEX TCP TEST LABEL OK]", {
    transport: GODEX_PRINT_TRANSPORTS.TCP_9100,
    host,
    port,
    durationMs: Date.now() - started,
  });
} catch (error) {
  logError("[GODEX TCP TEST LABEL ERROR]", {
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
