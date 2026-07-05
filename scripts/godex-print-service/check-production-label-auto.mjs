import assert from "node:assert/strict";
import { buildGodex80x50LabelEzpl, isValidGodex80x50Ezpl } from "../../lib/admin-kiosko/printing/godex-80x50-ezpl.mjs";

const batchId = "batch-test-001";
const batchCode = "KA-TEST-001";
const template = "prep_label_professional";

function productionClosePayload(reason = "auto_print_on_batch_close") {
  return {
    title: "GUACAMOLE",
    line1: "ELAB 05/07/26 12:00",
    line2: "CAD 07/07/26 12:00",
    template,
    data: {
      prepName: "GUACAMOLE",
      productionDateTime: "2026-07-05T12:00:00.000Z",
      expiryDateTime: "2026-07-07T12:00:00.000Z",
      batchCode,
      quantity: 2,
      unit: "kg",
      responsibleName: "admin-kiosko",
      storageCondition: "Refrigerado 0-4 C",
    },
    metadata: {
      requestedBy: "admin-kiosko",
      module: "production",
      sourceType: "production_batch",
      sourceId: batchId,
      createdFrom: reason === "auto_print_on_batch_close" ? "production_close" : "production_batch_detail",
      reason,
      batchCode,
    },
  };
}

function hasAutoCloseLabel(jobs) {
  return jobs.some((job) => {
    const payload = job.payload || {};
    const metadata = payload.metadata || {};
    return payload.template === template
      && metadata.sourceId === batchId
      && metadata.reason === "auto_print_on_batch_close";
  });
}

const autoPayload = productionClosePayload();
const ezpl = buildGodex80x50LabelEzpl({
  template: autoPayload.template,
  title: autoPayload.title,
  line1: autoPayload.line1,
  line2: autoPayload.line2,
  line3: autoPayload.data.responsibleName,
  line4: autoPayload.data.storageCondition,
});

assert.equal(isValidGodex80x50Ezpl(ezpl), true, "raw_command debe ser EZPL GoDEX 80x50 valido");
assert.equal(hasAutoCloseLabel([]), false, "cerrar lote sin job previo debe permitir crear print_job");
assert.equal(hasAutoCloseLabel([{ payload: autoPayload }]), true, "cerrar lote no debe duplicar auto print existente");

const manualPayload = productionClosePayload("manual_reprint_batch_label");
assert.equal(manualPayload.metadata.reason, "manual_reprint_batch_label");
assert.equal(hasAutoCloseLabel([{ payload: manualPayload }]), false, "reimpresion manual no bloquea ni cuenta como auto print");

console.info("[PRODUCTION LABEL AUTO CHECK OK]", {
  batchId,
  batchCode,
  template,
  ezplBytes: Buffer.byteLength(ezpl, "utf8"),
});
