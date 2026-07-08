import { buildGodex80x50QrTestEzpl, decodeGodexGwQr } from "../../lib/admin-kiosko/printing/godex-80x50-ezpl.mjs";
import { loadGodexEnv } from "./env.mjs";

await loadGodexEnv();

const config = {
  erpApiUrl: (process.env.ERP_API_URL || "").replace(/\/$/, ""),
  token: process.env.ERP_API_TOKEN || "",
  printerKey: "kiosko_godex_g500",
  requestId: process.env.QR_FINAL_REQUEST_ID || crypto.randomUUID(),
  supabaseUrl: (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, ""),
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
};

function fail(message, meta = {}) {
  console.error(JSON.stringify({ ok: false, blocked: true, message, ...meta }, null, 2));
  process.exit(1);
}

async function fetchJson(url, init = {}) {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const body = await response.json().catch(() => null);
  return { response, body };
}

if (!config.erpApiUrl) fail("Falta ERP_API_URL.");
if (!config.token) fail("Falta ERP_API_TOKEN.");

const qrValue = `ERP:QR-TEST:${config.requestId.slice(0, 8)}`;
const ezpl = buildGodex80x50QrTestEzpl({ qrValue, batchCode: "QR FINAL" });
const qrLine = ezpl.split(/\r?\n/).find((line) => line.startsWith("GW,"));
const decoded = decodeGodexGwQr(qrLine, qrValue);
if (!decoded.ok) fail("QR automatico no valido; no se encola prueba fisica.", decoded);

if (config.supabaseUrl && config.serviceRoleKey) {
  const headers = {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
  };
  const schemaQuery = new URLSearchParams({
    select: "id,idempotency_key,transport_started_at,sent_unconfirmed_at,transport_confirmed_at,cancelled_at",
    limit: "1",
  });
  const schema = await fetchJson(`${config.supabaseUrl}/rest/v1/print_jobs?${schemaQuery.toString()}`, { headers });
  if (!schema.response.ok) fail("Migracion estructural pendiente o esquema no verificable.", { status: schema.response.status, body: schema.body });
}

const summary = await fetchJson(`${config.erpApiUrl}/api/print-jobs/summary?printer_key=${encodeURIComponent(config.printerKey)}`, {
  headers: { Authorization: `Bearer ${config.token}` },
});
if (!summary.response.ok) fail("No se pudo leer summary de cola.", { status: summary.response.status, body: summary.body });

const counts = summary.body?.summary?.counts || {};
const unsafe = ["queued", "claimed", "sending", "sent_unconfirmed"].filter((status) => Number(counts[status] || 0) > 0);
if (unsafe.length) {
  fail("Cola no regularizada; no se imprime la prueba QR final.", { counts, unsafe });
}

const create = await fetchJson(`${config.erpApiUrl}/api/print-jobs`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${config.token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    printerKey: config.printerKey,
    template: "prep_label_professional",
    data: {
      prepName: "PRUEBA QR ERP",
      productionDateTime: new Date().toISOString(),
      shelfLifeDays: 1,
      batchCode: "NO USAR",
      responsibleName: "xavibocanegra",
      storageCondition: "NO USAR",
      brandName: "KIOSKO ALFRESKO",
      qrValue,
      includeQr: true,
      copies: 1,
    },
    metadata: {
      requestedBy: "xavibocanegra",
      module: "printing",
      sourceType: "qr_final_test",
      sourceId: qrValue,
      createdFrom: "printer:test:qr-final",
      reason: "qr_final_physical_test",
      requestId: config.requestId,
      idempotencyKey: `print:qr_final_test:${qrValue}:${config.requestId}`,
      requestedCopies: "1",
    },
  }),
});

if (create.response.status === 200) {
  fail("La misma prueba ya existia para este requestId; no se permite ejecutar dos veces.", { requestId: config.requestId, body: create.body });
}
if (!create.response.ok) fail("No se pudo crear el print job QR final.", { status: create.response.status, body: create.body });

console.info(JSON.stringify({
  ok: true,
  message: "Prueba QR final encolada. El bridge debe recorrer queued -> claimed -> sending -> sent_unconfirmed -> printed.",
  requestId: config.requestId,
  qrValue,
  qrPreviewPath: decoded.previewPath,
  job: create.body?.job || create.body,
}, null, 2));
