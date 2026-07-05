import assert from "node:assert/strict";
import {
  buildGodex80x50PrepProfessionalEzpl,
  ezplLines,
  isValidGodex80x50Ezpl,
} from "../../lib/admin-kiosko/printing/godex-80x50-ezpl.mjs";

const batchCode = "GM-050726-0017";
const command = buildGodex80x50PrepProfessionalEzpl({
  prepName: "GUACAMOLE",
  productionDateTime: "2026-07-05T12:30:00.000Z",
  expiryDateTime: "2026-07-07T12:30:00.000Z",
  batchCode,
  responsibleName: "J. Bocanegra",
  storageCondition: "Refrigerado 0-4 C",
  qrValue: `ERP:prep_batch:${batchCode}`,
  includeQr: true,
  line1: "0.",
  line2: "-",
  sourceId: "",
  emptyValue: null,
});

const lines = ezplLines(command);
const visiblePayload = lines.slice(lines.indexOf("^L") + 1, -1).join("\n");

assert.equal(lines[0], "^Q50,3");
assert.equal(lines.includes("^W80"), true);
assert.equal(lines[lines.length - 1], "E");
assert.equal(isValidGodex80x50Ezpl(command), true);
assert.equal(command.includes("GUACAMOLE"), true);
assert.equal(command.includes(batchCode), true);
assert.equal(command.includes("GW,"), true);
assert.equal(command.includes("QRCODE"), false);
assert.equal(/(^|[,\s])0\.(?=[,\s]|$)/.test(visiblePayload), false);
assert.equal(command.includes("undefined"), false);
assert.equal(command.includes("null"), false);
assert.equal(command.includes("sourceId"), false);
assert.equal(lines.some((line) => /AA,\d+,\d+,1,\d+,\d+,0,0,$/.test(line)), false);
assert.equal(lines.some((line) => /AA,\d+,\d+,1,\d+,\d+,0,0,/.test(line)), false);
assert.equal(lines.some((line) => /AA,\d+,\d+,1,\d+,\d+,0,[^,]/.test(line)), true);

console.info("[PREP LABEL DESIGN CHECK OK]", {
  batchCode,
  ezplBytes: Buffer.byteLength(command, "utf8"),
  firstLines: lines.slice(0, 8),
  lastLines: lines.slice(-8),
});
