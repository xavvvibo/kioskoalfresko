import http from "node:http";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";

const port = Number(process.env.PORT || process.env.PRINT_SERVICE_PORT || 9105);
const host = process.env.PRINT_SERVICE_HOST || "0.0.0.0";
const apiKey = process.env.PRINT_SERVICE_API_KEY || "";
const printerShare = process.env.GODEX_PRINTER_SHARE || "";
const maxBodyBytes = 512 * 1024;

function logInfo(message, meta) {
  process.stdout.write(`${message} ${JSON.stringify(meta)}\n`);
}

function logError(message, meta) {
  process.stderr.write(`${message} ${JSON.stringify(meta)}\n`);
}

function json(response, statusCode, body) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];

    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBodyBytes) {
        reject(new Error("Trabajo de impresión demasiado grande."));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });

    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function runCopyToPrinter(filePath) {
  return new Promise((resolve, reject) => {
    if (!printerShare) {
      reject(new Error("GODEX_PRINTER_SHARE no está configurado. Ejemplo: \\\\localhost\\GodexG500"));
      return;
    }

    execFile("cmd.exe", ["/d", "/s", "/c", "copy", "/B", filePath, printerShare], { windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error((stderr || stdout || error.message).trim()));
        return;
      }
      resolve();
    });
  });
}

async function printEzpl(ezpl) {
  const jobId = randomUUID();
  const filePath = path.join(os.tmpdir(), `kiosko-godex-${jobId}.ezpl`);

  await fs.writeFile(filePath, ezpl, "utf8");
  try {
    await runCopyToPrinter(filePath);
  } finally {
    await fs.rm(filePath, { force: true }).catch(() => undefined);
  }

  return jobId;
}

const server = http.createServer(async (request, response) => {
  const started = Date.now();

  if (request.method === "GET" && request.url === "/health") {
    json(response, 200, {
      success: true,
      printerConfigured: Boolean(printerShare),
      uptimeSeconds: Math.round(process.uptime()),
    });
    return;
  }

  if (request.method !== "POST" || request.url !== "/print") {
    json(response, 404, { success: false, error: "Endpoint no disponible." });
    return;
  }

  if (apiKey && request.headers["x-print-service-key"] !== apiKey) {
    json(response, 401, { success: false, error: "API key no válida." });
    return;
  }

  try {
    const rawBody = await readBody(request);
    const body = JSON.parse(rawBody);
    const ezpl = typeof body.ezpl === "string" ? body.ezpl : "";

    if (!ezpl.trim()) {
      json(response, 400, { success: false, error: "EZPL vacío." });
      return;
    }

    const jobId = await printEzpl(ezpl);
    const durationMs = Date.now() - started;
    logInfo("[GODEX PRINT]", {
      at: new Date().toISOString(),
      jobId,
      bytes: Buffer.byteLength(ezpl, "utf8"),
      durationMs,
      jobName: typeof body.jobName === "string" ? body.jobName : "sin-nombre",
    });
    json(response, 200, { success: true, jobId, durationMs });
  } catch (error) {
    const durationMs = Date.now() - started;
    const message = error instanceof Error ? error.message : "Error desconocido.";
    logError("[GODEX PRINT ERROR]", { at: new Date().toISOString(), error: message, durationMs });
    json(response, 500, { success: false, error: message, durationMs });
  }
});

server.listen(port, host, () => {
  logInfo("[GODEX PRINT SERVICE]", {
    url: `http://${host}:${port}`,
    printerConfigured: Boolean(printerShare),
    apiKeyEnabled: Boolean(apiKey),
  });
});
