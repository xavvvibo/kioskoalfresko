import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPreparationTraceabilityQrUrl,
  buildPrintPayload,
  validatePrintLabelInput,
  type PrepLabelBasicData,
} from "../lib/admin-kiosko/printing/print-payload.ts";
import { generateLabelCommand } from "../lib/admin-kiosko/printing/label-command.ts";
import { parseNativeQrCommand } from "../lib/admin-kiosko/printing/godex-80x50-ezpl.mjs";

const batchCode = "PD-160726-7300";
const expectedUrl = "https://kioskoalfresko.es/admin-kiosko/qr/ERP%3Aprep_batch%3APD-160726-7300";

test("buildPreparationTraceabilityQrUrl creates an absolute HTTPS URL", () => {
  const url = buildPreparationTraceabilityQrUrl({ batchCode });

  assert.equal(url, expectedUrl);
  assert.match(url || "", /^https:\/\//);
  assert.doesNotMatch(url || "", /\r|\n/);
  assert.doesNotMatch(url || "", /^\{|\}$/);
  assert.doesNotMatch(url || "", /^ERP:/);
  assert.match(url || "", /PD-160726-7300/);
});

test("prep print payload uses the HTTPS URL as QR value", () => {
  const validated = validatePrintLabelInput({
    printerKey: "kiosko_godex_g500",
    template: "prep_label_professional",
    data: {
      prepName: "PICO DE GALLO",
      productionDateTime: "2026-07-16T20:00",
      expiryDateTime: "2026-07-18T20:00",
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
