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

function logInfo(message, meta = {}) {
  process.stdout.write(`${new Date().toISOString()} ${message} ${JSON.stringify(meta)}\n`);
}

function logError(message, meta = {}) {
  process.stderr.write(`${new Date().toISOString()} ${message} ${JSON.stringify(meta)}\n`);
}

function testEzpl() {
  return [
    "^Q40,3",
    "^W58",
    "^H10",
    "^S4",
    "^P1",
    "^C1",
    "^R0",
    "~Q+0",
    "^O0",
    "^D0",
    "^L",
    "AA,16,18,1,2,2,0,KIOSKO ALFRESKO",
    "AA,16,52,1,1,1,0,TEST GODEX G500",
    "Lo,16,76,450,76,2",
    "AA,16,94,1,1,1,0,PRODUCTO: Etiqueta prueba",
    "AA,16,122,1,1,1,0,LOTE: TEST-GODEX-001",
    "AA,16,150,1,1,1,0,ELAB: 2026-07-03",
    "AA,16,178,1,1,1,0,CAD: 2026-07-05",
    "AA,16,214,1,1,1,0,RAW EZPL desde Windows Spooler",
    "BQ,330,96,2,4,80,0,TEST-GODEX-001",
    "E",
  ].join("\n");
}

await loadEnvFile(path.join(serviceDir, ".env"));
await loadEnvFile(path.join(process.cwd(), ".env"));

const windowsPrinterName = process.env.WINDOWS_PRINTER_NAME || "GoDEX G500";
const dryRun = process.env.GODEX_DRY_RUN === "true" || process.argv.includes("--dry-run");
const ezpl = testEzpl();
const started = Date.now();

try {
  logInfo("[GODEX TEST LABEL START]", {
    windowsPrinterName,
    dryRun,
    bytes: Buffer.byteLength(ezpl, "utf8"),
  });

  if (dryRun) {
    logInfo("[GODEX TEST LABEL DRY RUN EZPL]", { rawCommand: ezpl });
  } else {
    await sendRawToWindowsPrinter(ezpl, windowsPrinterName);
  }

  logInfo("[GODEX TEST LABEL OK]", {
    windowsPrinterName,
    dryRun,
    durationMs: Date.now() - started,
  });
} catch (error) {
  logError("[GODEX TEST LABEL ERROR]", {
    windowsPrinterName,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    durationMs: Date.now() - started,
  });
  process.exitCode = 1;
}
