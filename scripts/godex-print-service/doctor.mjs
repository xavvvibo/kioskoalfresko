import net from "node:net";
import { loadGodexEnv, packageVersion } from "./env.mjs";

const loadedEnvFiles = await loadGodexEnv();
const version = process.env.BRIDGE_VERSION || process.env.npm_package_version || await packageVersion();

const config = {
  erpApiUrl: (process.env.ERP_API_URL || "").replace(/\/$/, ""),
  token: process.env.ERP_API_TOKEN || "",
  printerKey: process.env.PRINTER_KEY || "kiosko_godex_g500",
  transport: process.env.GODEX_PRINT_TRANSPORT || "tcp_9100",
  host: process.env.GODEX_PRINTER_HOST || "192.168.1.38",
  port: Number(process.env.GODEX_PRINTER_PORT || 9100),
  timeoutMs: Number(process.env.GODEX_TCP_TIMEOUT_MS || 5000),
  healthUrl: `http://${process.env.BRIDGE_HEALTH_HOST || "127.0.0.1"}:${Number(process.env.BRIDGE_HEALTH_PORT || 8787)}/health`,
  supabaseUrl: (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, ""),
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
};

const checks = [];

function addCheck(name, status, detail = "") {
  checks.push({ name, status, detail });
}

function tcpProbe(host, port, timeoutMs) {
  const started = Date.now();
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const done = (result) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ ...result, durationMs: Date.now() - started });
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => {
      socket.end();
      done({ ok: true });
    });
    socket.once("timeout", () => done({ ok: false, error: `timeout ${timeoutMs}ms` }));
    socket.once("error", (error) => done({ ok: false, error: error.message }));
    socket.connect(port, host);
  });
}

async function fetchJson(url, init = {}) {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const body = await response.json().catch(() => null);
  return { response, body };
}

function formatDate(value) {
  return value ? String(value).replace("T", " ").slice(0, 19) : "-";
}

for (const key of ["GODEX_HOST", "GODEX_PORT"]) {
  if (process.env[key]) {
    addCheck(`deprecated ${key}`, "ERROR", "Variable antigua presente. Eliminarla.");
  }
}

addCheck("version", "OK", version);
addCheck("env files", loadedEnvFiles.length ? "OK" : "WARN", loadedEnvFiles.length ? loadedEnvFiles.join(", ") : "No se ha cargado .env/.env.local");
addCheck("ERP_API_URL", config.erpApiUrl ? "OK" : "ERROR", config.erpApiUrl || "Falta ERP_API_URL");
addCheck("ERP_API_TOKEN", config.token ? "OK" : "ERROR", config.token ? "Configurado" : "Falta ERP_API_TOKEN");
addCheck("PRINTER_KEY", config.printerKey === "kiosko_godex_g500" ? "OK" : "WARN", config.printerKey);
addCheck("GODEX_PRINT_TRANSPORT", config.transport === "tcp_9100" ? "OK" : "ERROR", config.transport);
addCheck("GODEX_PRINTER_HOST", config.host === "192.168.1.38" ? "OK" : "WARN", config.host);
addCheck("GODEX_PRINTER_PORT", config.port === 9100 ? "OK" : "WARN", String(config.port));

if (config.erpApiUrl) {
  try {
    const response = await fetch(config.erpApiUrl, { method: "GET", cache: "no-store" });
    addCheck("ERP connection", response.status < 500 ? "OK" : "ERROR", `HTTP ${response.status}`);
  } catch (error) {
    addCheck("ERP connection", "WARN", error instanceof Error ? error.message : String(error));
  }
}

if (config.erpApiUrl && config.token) {
  try {
    const { response } = await fetchJson(`${config.erpApiUrl}/api/print-jobs/__doctor_token_check__`, {
      headers: { Authorization: `Bearer ${config.token}` },
    });
    addCheck("ERP_API_TOKEN auth", response.status === 404 ? "OK" : response.status === 401 || response.status === 503 ? "ERROR" : "WARN", `HTTP ${response.status}`);
  } catch (error) {
    addCheck("ERP_API_TOKEN auth", "WARN", error instanceof Error ? error.message : String(error));
  }
}

const tcp = await tcpProbe(config.host, config.port, config.timeoutMs);
addCheck("Printer TCP", tcp.ok ? "OK" : "WARN", tcp.ok ? `${config.host}:${config.port} ${tcp.durationMs}ms` : `${config.host}:${config.port} ${tcp.error}`);

try {
  const { response, body } = await fetchJson(config.healthUrl);
  addCheck("Bridge health", response.ok ? "OK" : "WARN", response.ok ? JSON.stringify({ status: body?.status, printerKey: body?.printerKey, version: body?.version }) : `HTTP ${response.status}`);
  addCheck("Bridge polling", body?.polling === true ? "OK" : "WARN", body?.polling === true ? "polling activo" : "health responde pero polling no confirmado");
} catch (error) {
  addCheck("Bridge health", "WARN", `No responde ${config.healthUrl}: ${error instanceof Error ? error.message : String(error)}`);
  addCheck("Bridge polling", "WARN", "No confirmado porque el bridge no responde al healthcheck local.");
}

if (config.supabaseUrl && config.serviceRoleKey) {
  const base = `${config.supabaseUrl}/rest/v1/print_jobs`;
  const headers = {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
  };

  try {
    const query = new URLSearchParams({
      select: "id,status,printer_key,attempts,printed_at,error,created_at,updated_at",
      printer_key: `eq.${config.printerKey}`,
      order: "created_at.desc",
      limit: "1",
    });
    const { response, body } = await fetchJson(`${base}?${query.toString()}`, { headers });
    const latest = Array.isArray(body) ? body[0] : null;
    addCheck("Latest print job", response.ok ? "OK" : "WARN", latest ? `${latest.id} ${latest.status} created=${formatDate(latest.created_at)} printed=${formatDate(latest.printed_at)} error=${latest.error || "-"}` : "Sin jobs para printer_key");
  } catch (error) {
    addCheck("Latest print job", "WARN", error instanceof Error ? error.message : String(error));
  }

  try {
    const query = new URLSearchParams({
      select: "id,status,error,updated_at",
      printer_key: `eq.${config.printerKey}`,
      status: "eq.error",
      order: "updated_at.desc",
      limit: "10",
    });
    const { response, body } = await fetchJson(`${base}?${query.toString()}`, { headers });
    const retryable = Array.isArray(body)
      ? body.filter((job) => /ECONNREFUSED|timeout|timed out|ETIMEDOUT|EHOSTUNREACH|ENETUNREACH/i.test(String(job.error || "")))
      : [];
    addCheck("Retryable error jobs", response.ok ? "OK" : "WARN", `${retryable.length} error(es) de conectividad detectados en los ultimos 10 error jobs`);
  } catch (error) {
    addCheck("Retryable error jobs", "WARN", error instanceof Error ? error.message : String(error));
  }
} else {
  addCheck("Latest print job", "WARN", "No se consulta Supabase: falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
}

const maxName = Math.max(...checks.map((check) => check.name.length));
console.info("");
console.info("GoDEX bridge doctor");
console.info("===================");
for (const check of checks) {
  console.info(`${check.status.padEnd(5)} ${check.name.padEnd(maxName)} ${check.detail}`);
}
console.info("");
