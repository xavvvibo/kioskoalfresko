import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  buildPreparationTraceabilityQrUrl,
  buildPrintPayload,
  validatePrintLabelInput,
  type PrepLabelBasicData,
} from "../lib/admin-kiosko/printing/print-payload.ts";
import { generateLabelCommand } from "../lib/admin-kiosko/printing/label-command.ts";
import { parseNativeQrCommand } from "../lib/admin-kiosko/printing/godex-80x50-ezpl.mjs";
import { parseInternalQrValue } from "../lib/admin-kiosko/qr/resolve-qr.ts";

const batchCode = "PD-160726-7300";
const productionBatchId = "8a5e2b02-9f52-4f91-8ed0-7a8df90b5b7a";
const expectedUrl = "https://kioskoalfresko.es/admin-kiosko/qr/ERP%3Aprep_batch%3A8a5e2b02-9f52-4f91-8ed0-7a8df90b5b7a";
const legacyUrl = "https://kioskoalfresko.es/admin-kiosko/qr/ERP%3Aprep_batch%3APD-160726-7300";

test("buildPreparationTraceabilityQrUrl creates a canonical UUID HTTPS URL", () => {
  const url = buildPreparationTraceabilityQrUrl({ productionBatchId, batchCode });

  assert.equal(url, expectedUrl);
  assert.match(url || "", /^https:\/\//);
  assert.doesNotMatch(url || "", /\r|\n/);
  assert.doesNotMatch(url || "", /^\{|\}$/);
  assert.doesNotMatch(url || "", /^ERP:/);
  assert.match(url || "", /8a5e2b02-9f52-4f91-8ed0-7a8df90b5b7a/);
});

test("buildPreparationTraceabilityQrUrl keeps legacy batch fallback", () => {
  assert.equal(buildPreparationTraceabilityQrUrl({ batchCode }), legacyUrl);
});

test("prep print payload uses the HTTPS URL as QR value", () => {
  const validated = validatePrintLabelInput({
    printerKey: "kiosko_godex_g500",
    template: "prep_label_professional",
    data: {
      prepName: "PICO DE GALLO",
      productionDateTime: "2026-07-16T20:00",
      expiryDateTime: "2026-07-18T20:00",
      productionBatchId,
      batchCode,
      qrValue: `ERP:prep_batch:${batchCode}`,
      includeQr: true,
      copies: 1,
    },
    metadata: {
      module: "prep",
      sourceType: "prep_batch",
      sourceId: batchCode,
    },
  });

  assert.equal(validated.ok, true);
  if (!validated.ok) return;

  const payload = buildPrintPayload(validated.input);
  const prepData = payload.data as PrepLabelBasicData;
  assert.equal(prepData.qrValue, expectedUrl);
  assert.equal(prepData.qrUrl, expectedUrl);

  const generated = generateLabelCommand({
    printerLanguage: "ezpl",
    labelType: "prep_label_professional",
    payload,
  });
  const lines = generated.command.split(/\r?\n/);
  const qrLineIndex = lines.findIndex((line) => line.startsWith("W360,150,3,2,M,8,5,"));
  const parsedQr = parseNativeQrCommand(lines, qrLineIndex);

  assert.ok(parsedQr);
  assert.equal(parsedQr.value, expectedUrl);
  assert.equal(parsedQr.length, Buffer.byteLength(expectedUrl, "utf8"));
  assert.equal(lines[qrLineIndex + 1], expectedUrl);
  assert.equal(generated.command.endsWith("E\r\n"), true);
  assert.doesNotMatch(generated.command, /[^\r]\n|\r[^\n]/);
});

test("internal QR parser resolves new UUID and old visible batch formats", () => {
  const parsedNew = parseInternalQrValue(expectedUrl);
  const parsedLegacy = parseInternalQrValue(legacyUrl);
  const parsedMissing = parseInternalQrValue("https://kioskoalfresko.es/admin-kiosko/qr/ERP%3Aprep_batch%3A");
  const parsedInvalid = parseInternalQrValue("https://kioskoalfresko.es/admin-kiosko/qr/not-valid");

  assert.deepEqual(parsedNew, {
    ok: true,
    kind: "prep_batch",
    qrValue: `ERP:prep_batch:${productionBatchId}`,
    identifier: productionBatchId,
    identifierType: "id",
    batchId: productionBatchId,
  });
  assert.deepEqual(parsedLegacy, {
    ok: true,
    kind: "prep_batch",
    qrValue: `ERP:prep_batch:${batchCode}`,
    identifier: batchCode,
    identifierType: "batch_code",
    batchCode,
  });
  assert.equal(parsedMissing.ok, false);
  if (!parsedMissing.ok) assert.equal(parsedMissing.error, "missing_identifier");
  assert.equal(parsedInvalid.ok, false);
  if (!parsedInvalid.ok) assert.equal(parsedInvalid.error, "invalid_format");
});

test("prep action persists the preparation before creating the print job", () => {
  const actions = fs.readFileSync(new URL("../app/admin-kiosko/actions.ts", import.meta.url), "utf8");
  const createIndex = actions.indexOf("const preparationBatch = await createManualPreparationBatch");
  const guardIndex = actions.indexOf("if (!preparationBatch.ok)");
  const printIndex = actions.indexOf("const printResult = await labelEventService.requestPrepManualLabel");

  assert.ok(createIndex > -1);
  assert.ok(guardIndex > createIndex);
  assert.ok(printIndex > guardIndex);
  assert.match(actions.slice(printIndex, printIndex + 700), /productionBatchId: preparationBatch\.data\.id/);
});
