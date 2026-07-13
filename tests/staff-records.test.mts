import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPrivateDocumentPath,
  buildSignatureContentHash,
  buildSignatureHash,
  isCertificateExpiring,
  safeStorageFileName,
  sha256Hex,
  validateAbsence,
  validateDocumentMetadata,
} from "../lib/admin-kiosko/staff/record-rules.ts";
import {
  buildSensitiveChangeMetadata,
  canEmployeeAccessOwnResource,
  maskDni,
  maskIban,
  maskSocialSecurity,
  sanitizeAuditData,
} from "../lib/admin-kiosko/staff/sensitive.ts";

test("enmascara datos sensibles", () => {
  assert.equal(maskDni("12345678Z"), "12*****8Z");
  assert.equal(maskSocialSecurity("123456789012"), "********9012");
  assert.equal(maskIban("ES9121000418450200051332"), "ES91 **************** 1332");
});

test("empleado solo puede acceder a su propio recurso en su organización", () => {
  assert.equal(canEmployeeAccessOwnResource({
    sessionUserId: "u1",
    employeeAuthUserId: "u1",
    employeeId: "e1",
    resourceEmployeeId: "e1",
    employeeOrganizationId: "o1",
    resourceOrganizationId: "o1",
  }), true);
  assert.equal(canEmployeeAccessOwnResource({
    sessionUserId: "u1",
    employeeAuthUserId: "u1",
    employeeId: "e1",
    resourceEmployeeId: "e2",
    employeeOrganizationId: "o1",
    resourceOrganizationId: "o1",
  }), false);
});

test("bloquea acceso cruzado entre organizaciones", () => {
  assert.equal(canEmployeeAccessOwnResource({
    sessionUserId: "u1",
    employeeAuthUserId: "u1",
    employeeId: "e1",
    resourceEmployeeId: "e1",
    employeeOrganizationId: "o1",
    resourceOrganizationId: "o2",
  }), false);
});

test("valida fechas de ausencia", () => {
  assert.equal(validateAbsence({ startsAt: "2026-07-14T10:00:00.000Z", endsAt: "2026-07-14T09:00:00.000Z" }), "La fecha de fin debe ser posterior a la de inicio.");
});

test("valida documento y MIME permitido", () => {
  assert.equal(validateDocumentMetadata({ employeeId: "e1", mimeType: "application/pdf", sizeBytes: 1200 }), null);
  assert.equal(validateDocumentMetadata({ employeeId: "e1", mimeType: "application/x-msdownload", sizeBytes: 1200 }), "Tipo de archivo no permitido.");
});

test("normaliza nombre y ruta privada sin traversal", () => {
  assert.equal(safeStorageFileName("../../DNI Xavi.pdf"), "dni-xavi.pdf");
  assert.equal(buildPrivateDocumentPath({ organizationId: "o1", employeeId: "e1", documentId: "d1", originalName: "../../DNI Xavi.pdf" }), "o1/e1/d1/dni-xavi.pdf");
});

test("calcula hash documental", async () => {
  assert.equal(await sha256Hex("documento"), "edc5f2cc3c95b2a8ba4f00aa93d4fd3f80474d1b59a708fc080ca4d9b4cad2f8");
});

test("prepara hash de firma vinculado a versión", () => {
  const hashV1 = buildSignatureContentHash({ entityType: "document", entityId: "d1", documentVersion: 1, displayedText: "Contrato" });
  const hashV2 = buildSignatureContentHash({ entityType: "document", entityId: "d1", documentVersion: 2, displayedText: "Contrato" });
  assert.notEqual(hashV1, hashV2);
  assert.equal(buildSignatureHash({ contentHash: hashV1, traceOrImage: "trace", signer: "Empleado" }).length, 64);
});

test("detecta certificado próximo a caducar", () => {
  const soon = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  assert.equal(isCertificateExpiring(soon), true);
});

test("auditoría no conserva valores sensibles", () => {
  assert.deepEqual(sanitizeAuditData({ dni_nie: "12345678Z", display_name: "Demo" }), { dni_nie: "[sensitive_changed]", display_name: "Demo" });
  assert.deepEqual(buildSensitiveChangeMetadata(null, { iban: "ES9121000418450200051332" }), { changedFields: ["iban:sensitive"] });
});
