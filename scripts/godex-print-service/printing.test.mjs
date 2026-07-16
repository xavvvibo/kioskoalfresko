import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  buildGodex80x50LabelEzpl,
  buildGodex80x50PrepProfessionalEzpl,
  buildGodex80x50SafeErpTestEzpl,
  cleanLabelText,
  isValidGodex80x50Ezpl,
  normalizeGodexEzplCrlf,
  parseNativeQrCommand,
} from "../../lib/admin-kiosko/printing/godex-80x50-ezpl.mjs";
import { processBridgeJob, resolveBridgeRawCommand, startupQueueDecision } from "./bridge-core.mjs";

test("renders valid EZPL with escaped spanish characters", () => {
  const ezpl = buildGodex80x50LabelEzpl({
    template: "ingredient_label_basic",
    title: "Ñora, aliño y piñón",
    line1: "Lote A^1~2",
    line2: "Cad 07/07/26",
    copies: 2,
  });

  assert.equal(isValidGodex80x50Ezpl(ezpl), true);
  assert.match(ezpl, /\^P2/);
  assert.match(ezpl, /Nora alino y pinon/);
  assert.doesNotMatch(ezpl, /Ñ|ñ|\^bad|~cmd/);
  assert.match(ezpl, /Lote A 1 2/);
});

test("clamps copies to the operational maximum", () => {
  const ezpl = buildGodex80x50LabelEzpl({ title: "TEST", line1: "A", line2: "B", copies: 99 });
  assert.match(ezpl, /\^P8/);
});

test("safe ERP physical test is one copy and clearly non-food", () => {
  const ezpl = buildGodex80x50SafeErpTestEzpl({ host: "<IP_DE_LA_GODEX>", timestamp: "07/07/26 16:30:00" });

  assert.equal(isValidGodex80x50Ezpl(ezpl), true);
  assert.match(ezpl, /\^P1/);
  assert.match(ezpl, /PRUEBA ERP/);
  assert.match(ezpl, /NO USAR/);
  assert.match(ezpl, /GODEX <IP_DE_LA_GODEX>/);
});

test("prep professional label omits empty fields and keeps traceability", () => {
  const ezpl = buildGodex80x50PrepProfessionalEzpl({
    prepName: "Guacamole",
    productionDateTime: "2026-07-07T10:00:00.000Z",
    expiryDateTime: "2026-07-09T10:00:00.000Z",
    batchCode: "GM-070726-001",
    responsibleName: "",
    storageCondition: "Refrigerado 0-4 C",
    includeQr: false,
    copies: 1,
  });

  assert.equal(isValidGodex80x50Ezpl(ezpl), true);
  assert.match(ezpl, /GM-070726-001/);
  assert.doesNotMatch(ezpl, /RESPONSABLE:/);
});

test("prep professional QR uses native EZPL W command without GW bitmap", () => {
  const qrValue = "https://kioskoalfresko.es/admin-kiosko/qr/ERP%3Aprep_batch%3AGM-070726-001";
  const ezpl = buildGodex80x50PrepProfessionalEzpl({
    prepName: "Guacamole",
    productionDateTime: "2026-07-07T10:00:00.000Z",
    expiryDateTime: "2026-07-09T10:00:00.000Z",
    batchCode: "GM-070726-001",
    responsibleName: "J. Bocanegra",
    storageCondition: "Refrigerado 0-4 C",
    qrValue,
    includeQr: true,
    copies: 1,
  });
  const lines = ezpl.split(/\r?\n/);
  const qrLineIndex = lines.findIndex((line) => line.startsWith("W360,150,3,2,M,8,5,"));

  assert.notEqual(qrLineIndex, -1);
  assert.equal(lines[qrLineIndex], `W360,150,3,2,M,8,5,${Buffer.byteLength(qrValue, "utf8")},0`);
  assert.equal(lines[qrLineIndex + 1], qrValue);
  assert.match(lines[qrLineIndex + 1], /^https:\/\//);
  assert.doesNotMatch(lines[qrLineIndex + 1], /^ERP:/);
  assert.deepEqual(parseNativeQrCommand(lines, qrLineIndex), {
    x: 360,
    y: 150,
    model: 3,
    multiplier: 2,
    errorCorrection: "M",
    mask: 8,
    rotation: 5,
    length: Buffer.byteLength(qrValue, "utf8"),
    mode: 0,
    value: qrValue,
  });
  assert.doesNotMatch(ezpl, /^GW,/m);
  assert.doesNotMatch(ezpl, /QR INTERNO/);
});

test("native QR sanitization preserves colon and length", () => {
  const qrValue = "https://kioskoalfresko.es/admin-kiosko/qr/ERP%3Aprep_batch%3AGM-070726-001";
  const ezpl = buildGodex80x50PrepProfessionalEzpl({
    prepName: "Guacamole",
    batchCode: "GM-070726-001",
    qrValue: `${qrValue}^bad~cmd`,
    includeQr: true,
  });
  const lines = ezpl.split(/\r?\n/);
  const qrLineIndex = lines.findIndex((line) => line.startsWith("W360,150,3,2,M,8,5,"));
  const parsed = parseNativeQrCommand(lines, qrLineIndex);

  assert.ok(parsed);
  assert.equal(parsed.value, `${qrValue} bad cmd`);
  assert.equal(parsed.length, Buffer.byteLength(parsed.value, "utf8"));
  assert.match(parsed.value, /^https:\/\//);
  assert.doesNotMatch(parsed.value, /^ERP:/);
});

test("native QR byte mode preserves full ERP URL payload", () => {
  const qrValue = "https://kioskoalfresko.es/admin-kiosko/qr/ERP%3Aprep_batch%3AQR-TEST-080726-001";
  const ezpl = buildGodex80x50PrepProfessionalEzpl({
    prepName: "PRUEBA QR ERP",
    batchCode: "QR-TEST-080726-001",
    qrValue,
    includeQr: true,
  });
  const lines = ezpl.split(/\r?\n/);
  const qrLineIndex = lines.findIndex((line) => line.startsWith("W360,150,3,2,M,8,5,"));

  assert.notEqual(qrLineIndex, -1);
  assert.equal(lines[qrLineIndex], `W360,150,3,2,M,8,5,${Buffer.byteLength(qrValue, "utf8")},0`);
  assert.equal(lines[qrLineIndex + 1], qrValue);
  assert.match(ezpl, /prep_batch/);
  assert.doesNotMatch(lines[qrLineIndex + 1], /\r|\n|^\{|\}$/);
  assert.doesNotMatch(lines[qrLineIndex + 1], /^ERP:/);
  assert.doesNotMatch(ezpl, /PREPGBATCH/);
});

test("prep professional QR ignores raw internal ERP identifiers", () => {
  const ezpl = buildGodex80x50PrepProfessionalEzpl({
    prepName: "Pico de gallo",
    batchCode: "PD-160726-7300",
    qrValue: "ERP:prep_batch:PD-160726-7300",
    includeQr: true,
  });

  assert.equal(isValidGodex80x50Ezpl(ezpl), true);
  assert.doesNotMatch(ezpl, /^W360,150,3,2,M,8,5,/m);
  assert.doesNotMatch(ezpl, /^ERP:prep_batch:/m);
});

test("prep professional label is 80x50, CRLF terminated and QR ready", () => {
  const qrValue = "https://kioskoalfresko.es/admin-kiosko/trazabilidad/prep/GM-070726-001";
  const ezpl = buildGodex80x50PrepProfessionalEzpl({
    prepName: "Guacamole APPCC",
    productionDateTime: "2026-07-07T10:00:00.000Z",
    expiryDateTime: "2026-07-09T10:00:00.000Z",
    batchCode: "GM-070726-001",
    responsibleName: "QA Manager",
    storageCondition: "Refrigerado 0-4 C",
    qrValue,
    includeQr: true,
  });

  assert.equal(isValidGodex80x50Ezpl(ezpl), true);
  assert.match(ezpl, /^\^Q50,3\r\n\^W80\r\n/);
  assert.match(ezpl, /\r\n\^L\r\n/);
  assert.match(ezpl, /W360,150,3,2,M,8,5,/);
  assert.match(ezpl, new RegExp(qrValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal(ezpl.endsWith("E\r\n"), true);
  assert.doesNotMatch(ezpl, /[^\r]\n|\r[^\n]/);
});

test("EZPL validation rejects unsafe commands and excessive copies", () => {
  const valid = buildGodex80x50LabelEzpl({ title: "TEST", line1: "OK", line2: "OK", copies: 1 });

  assert.equal(isValidGodex80x50Ezpl(valid), true);
  assert.equal(isValidGodex80x50Ezpl(valid.replace("^P1", "^P9")), false);
  assert.equal(isValidGodex80x50Ezpl(valid.replace(/^AA,/m, "^X,")), false);
});

test("normalizeGodexEzplCrlf enforces CRLF terminators", () => {
  const normalized = normalizeGodexEzplCrlf("^Q50,3\n^W80\n^P1\n^L\nAA,1,1,1,1,1,0,TEST\nE");

  assert.equal(normalized, "^Q50,3\r\n^W80\r\n^P1\r\n^L\r\nAA,1,1,1,1,1,0,TEST\r\nE\r\n");
});

test("cleanLabelText removes control characters and command delimiters", () => {
  assert.equal(cleanLabelText("Línea\t^bad~cmd, ñ"), "Linea bad cmd n");
});

test("prep print job stores complete raw_command for the bridge", () => {
  const service = fs.readFileSync(new URL("../../lib/admin-kiosko/printing/print-service.ts", import.meta.url), "utf8");
  const labelCommand = fs.readFileSync(new URL("../../lib/admin-kiosko/printing/label-command.ts", import.meta.url), "utf8");

  assert.match(service, /raw_command:\s*generated\.command/);
  assert.match(labelCommand, /buildGodex80x50PrepProfessionalEzpl/);
  assert.match(labelCommand, /normalizeGodexEzplCrlf/);
});

test("prep label page does not check localhost bridge health", () => {
  const page = fs.readFileSync(new URL("../../app/admin-kiosko/etiquetas-prep/page.tsx", import.meta.url), "utf8");
  const actions = fs.readFileSync(new URL("../../app/admin-kiosko/actions.ts", import.meta.url), "utf8");

  assert.doesNotMatch(page, /LocalBridgeStatus|Bridge local no disponible|127\.0\.0\.1|localhost:8787/);
  assert.match(page, /cola Supabase/);
  assert.match(actions, /Etiqueta enviada a la cola de impresión/);
});

test("server actions do not connect directly to the private printer IP", () => {
  const actions = fs.readFileSync(new URL("../../app/admin-kiosko/actions.ts", import.meta.url), "utf8");
  assert.doesNotMatch(actions, /192\.168\.1\.37|net\.Socket|createConnection|fetch\([^)]*192\.168\./);
});

test("reprint policy requires reason and links the original job", () => {
  const actions = fs.readFileSync(new URL("../../app/admin-kiosko/actions.ts", import.meta.url), "utf8");
  const repository = fs.readFileSync(new URL("../../lib/admin-kiosko/repositories/print-jobs.repository.ts", import.meta.url), "utf8");

  assert.match(actions, /reprintReason\.length < 6/);
  assert.match(actions, /buildReprintPayload\(payload, original\.data\.id, reprintReason, reprintRequestId\)/);
  assert.match(repository, /copiedFromJobId: originalId/);
  assert.match(repository, /reason: "reprint"/);
  assert.match(repository, /reprintReason: cleanReason/);
});

test("preview component does not create print jobs", () => {
  const preview = fs.readFileSync(new URL("../../app/admin-kiosko/_components/Label80x50Preview.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(preview, /print_jobs|print-jobs|enqueuePrintJob|printService|fetch\(/);
});

test("enqueue path checks idempotency before insert", () => {
  const repository = fs.readFileSync(new URL("../../lib/admin-kiosko/repositories/print-jobs.repository.ts", import.meta.url), "utf8");
  const idempotencyCheck = repository.indexOf("const idempotencyKey = metadataText(payload, \"idempotencyKey\")");
  const insert = repository.indexOf('method: "POST"');

  assert.ok(idempotencyCheck > -1);
  assert.ok(insert > -1);
  assert.ok(idempotencyCheck < insert);
  assert.match(repository, /return \{ ok: true as const, data: existing\.data\[0\], idempotent: true as const \}/);
});

function mockJob(overrides = {}) {
  return {
    id: "job-1",
    command_language: "ezpl",
    raw_command: "^Q50,3\r\n^W80\r\n^P1\r\n^L\r\nAA,1,1,1,1,1,0,TEST\r\nE\r\n",
    ...overrides,
  };
}

test("bridge resolves raw_command first and keeps legacy fallback available", () => {
  const raw = "^Q50,3\r\n^W80\r\n^P1\r\n^L\r\nAA,1,1,1,1,1,0,RAW\r\nE\r\n";
  const fallback = "^Q50,3\r\n^W80\r\n^P1\r\n^L\r\nAA,1,1,1,1,1,0,FALLBACK\r\nE\r\n";

  assert.equal(resolveBridgeRawCommand(mockJob({ raw_command: raw }), {
    buildFallbackCommand: () => fallback,
  }), raw);
  assert.equal(resolveBridgeRawCommand(mockJob({ raw_command: "", payload_json: { title: "Legacy" } }), {
    buildFallbackCommand: () => fallback,
  }), fallback);
});

test("standalone Windows bridge keeps legacy fallback behind raw_command", () => {
  const bridge = fs.readFileSync(new URL("../godex-print-bridge.mjs", import.meta.url), "utf8");

  assert.match(bridge, /payload\.raw_command/);
  assert.match(bridge, /return normalizeEzplCrlf\(payload\.raw_command\)/);
  assert.match(bridge, /buildLegacyFallbackEzpl\(payload\)/);
  assert.match(bridge, /process\.env\.GODEX_HOST/);
  assert.doesNotMatch(bridge, /DEFAULT_PRINTER_HOST = "192\.168\./);
});

test("bridge prints the resolved fallback command for legacy jobs", async () => {
  const printed = [];
  const fallback = "^Q50,3\r\n^W80\r\n^P1\r\n^L\r\nAA,1,1,1,1,1,0,FALLBACK\r\nE\r\n";
  const result = await processBridgeJob(mockJob({ raw_command: "" }), {
    markSending: async () => undefined,
    printRaw: async (rawCommand) => printed.push(rawCommand),
    markSentUnconfirmed: async () => undefined,
    markPrinted: async () => undefined,
    markError: async () => undefined,
  }, {
    transport: "tcp_9100",
    host: "<IP_DE_LA_GODEX>",
    port: 9100,
    isValidEzpl: (rawCommand) => rawCommand === fallback,
    buildFallbackCommand: () => fallback,
  });

  assert.equal(result.status, "printed");
  assert.deepEqual(printed, [fallback]);
});

test("bridge marks printed after TCP accepted and ERP ACK succeeds", async () => {
  const calls = [];
  const result = await processBridgeJob(mockJob(), {
    markSending: async () => calls.push("sending"),
    printRaw: async () => calls.push("tcp"),
    writeJournal: async () => calls.push("journal"),
    markSentUnconfirmed: async () => calls.push("sent_unconfirmed"),
    markPrinted: async () => calls.push("printed"),
    markError: async () => calls.push("error"),
  }, {
    transport: "tcp_9100",
    host: "<IP_DE_LA_GODEX>",
    port: 9100,
    isValidEzpl: () => true,
  });

  assert.equal(result.status, "printed");
  assert.deepEqual(calls, ["sending", "tcp", "journal", "sent_unconfirmed", "printed"]);
});

test("bridge leaves sent_unconfirmed after TCP accepted and printed ACK fails", async () => {
  const calls = [];
  const result = await processBridgeJob(mockJob(), {
    markSending: async () => calls.push("sending"),
    printRaw: async () => calls.push("tcp"),
    writeJournal: async () => calls.push("journal"),
    markSentUnconfirmed: async () => calls.push("sent_unconfirmed"),
    markPrinted: async () => {
      calls.push("printed");
      throw new Error("PGRST204 missing column");
    },
    markError: async () => calls.push("error"),
  }, {
    transport: "tcp_9100",
    host: "<IP_DE_LA_GODEX>",
    port: 9100,
    isValidEzpl: () => true,
  });

  assert.equal(result.status, "sent_unconfirmed");
  assert.equal(result.phase, "tcp_accepted_printed_ack_failed");
  assert.deepEqual(calls, ["sending", "tcp", "journal", "sent_unconfirmed", "printed"]);
});

test("bridge marks error only when TCP fails before acceptance", async () => {
  const calls = [];
  const result = await processBridgeJob(mockJob(), {
    markSending: async () => calls.push("sending"),
    printRaw: async () => {
      calls.push("tcp");
      throw new Error("ECONNREFUSED");
    },
    markSentUnconfirmed: async () => calls.push("sent_unconfirmed"),
    markPrinted: async () => calls.push("printed"),
    markError: async () => calls.push("error"),
  }, {
    transport: "tcp_9100",
    host: "<IP_DE_LA_GODEX>",
    port: 9100,
    isValidEzpl: () => true,
  });

  assert.equal(result.status, "error");
  assert.deepEqual(calls, ["sending", "tcp", "error"]);
});

test("bridge does not open TCP if sending transition fails", async () => {
  const calls = [];
  const result = await processBridgeJob(mockJob(), {
    markSending: async () => {
      calls.push("sending");
      throw new Error("PGRST transition failed");
    },
    printRaw: async () => calls.push("tcp"),
    writeJournal: async () => calls.push("journal"),
    markSentUnconfirmed: async () => calls.push("sent_unconfirmed"),
    markPrinted: async () => calls.push("printed"),
    markError: async () => calls.push("error"),
  }, {
    transport: "tcp_9100",
    host: "<IP_DE_LA_GODEX>",
    port: 9100,
    isValidEzpl: () => true,
  });

  assert.equal(result.status, "claimed");
  assert.equal(result.phase, "sending_transition_failed_no_tcp");
  assert.deepEqual(calls, ["sending"]);
});

test("historical queue is held unless explicitly enabled", () => {
  const started = new Date("2026-07-07T12:00:00.000Z");
  const summary = {
    counts: { queued: 2, claimed: 5, sending: 1, sent_unconfirmed: 1 },
    pendingCopies: 2,
    oldestJob: { id: "old", status: "queued", created_at: "2026-07-07T11:59:00.000Z", attempts: 0 },
  };

  assert.equal(startupQueueDecision(summary, { bridgeStartedAt: started }).shouldPoll, false);
  assert.equal(startupQueueDecision(summary, { bridgeStartedAt: started, processHistoricalJobs: true }).shouldPoll, true);
});

test("schema protects idempotency and excludes uncertain states from automatic claim", () => {
  const sql = fs.readFileSync(new URL("../../supabase/admin_kiosko_print_jobs.sql", import.meta.url), "utf8");

  assert.match(sql, /print_jobs_printer_idempotency_uidx/);
  assert.match(sql, /pj\.status = 'queued'/);
  assert.doesNotMatch(sql, /pj\.status in \('queued', 'error'\)/);
  assert.match(sql, /idempotency_key text/);
});

test("manual cancellation and manual regularization are modeled without TCP", () => {
  const sql = fs.readFileSync(new URL("../../supabase/admin_kiosko_print_jobs.sql", import.meta.url), "utf8");
  const server = fs.readFileSync(new URL("./server.mjs", import.meta.url), "utf8");

  assert.match(sql, /cancelled_at/);
  assert.match(sql, /transport_confirmation_source/);
  assert.doesNotMatch(server, /sent_unconfirmed.*markError/s);
});

test("reprint idempotency uses request id, not reason identity", () => {
  const repository = fs.readFileSync(new URL("../../lib/admin-kiosko/repositories/print-jobs.repository.ts", import.meta.url), "utf8");
  const service = fs.readFileSync(new URL("../../lib/admin-kiosko/domain/label-event.service.ts", import.meta.url), "utf8");

  assert.match(repository, /idempotencyKey: `reprint:\$\{originalId\}:\$\{requestId\}`/);
  assert.doesNotMatch(repository, /reprint:\$\{originalId\}:\$\{simpleHash\(cleanReason\)\}/);
  assert.doesNotMatch(service, /Math\.random\(\)|Date\.now\(\)/);
});

test("unit suite does not perform physical printing", () => {
  const testSource = fs.readFileSync(new URL("./printing.test.mjs", import.meta.url), "utf8");

  assert.doesNotMatch(testSource, /printRawEzpl\(/);
  assert.doesNotMatch(testSource, /^import\s+net\s+from/m);
});
