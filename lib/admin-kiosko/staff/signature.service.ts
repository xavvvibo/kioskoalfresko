import { createStaffSignature, createTimelineEvent, getStaffDocumentById, patchStaffDocument } from "../repositories/staff-records.repository";
import { getStaffEmployeeById, writeStaffAuditLog } from "../repositories/staff.repository";
import { buildSignatureContentHash, buildSignatureHash } from "./record-rules";

export async function registerHandwrittenSignature(input: {
  actorUserId: string | null;
  employeeId: string;
  signerName: string;
  signedEntityType: string;
  signedEntityId: string;
  documentId?: string | null;
  documentVersion: number;
  signatureImageDataUrl?: string | null;
  signatureTrace?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  consentText: string;
  displayedText: string;
}) {
  if (!input.signatureImageDataUrl && !input.signatureTrace) return { ok: false as const, error: "La firma no puede estar vacía." };
  if (!input.documentId && input.signedEntityType === "document") return { ok: false as const, error: "No se puede firmar sin documento." };
  const employee = await getStaffEmployeeById(input.employeeId);
  if (!employee.ok) return employee;
  if (!employee.data?.organization_id) return { ok: false as const, error: "Empleado sin organización." };
  const document = input.documentId ? await getStaffDocumentById(input.documentId) : null;
  if (document && (!document.ok || !document.data)) return { ok: false as const, error: "Documento no encontrado." };
  const documentData = document?.ok ? document.data : null;
  if (documentData && documentData.employee_id !== input.employeeId) return { ok: false as const, error: "El documento no pertenece al empleado." };

  const contentHash = buildSignatureContentHash({
    entityType: input.signedEntityType,
    entityId: input.signedEntityId,
    documentVersion: input.documentVersion,
    displayedText: input.displayedText,
  });
  const signatureHash = buildSignatureHash({
    contentHash,
    traceOrImage: input.signatureImageDataUrl || JSON.stringify(input.signatureTrace),
    signer: input.signerName,
  });
  const created = await createStaffSignature({
    organization_id: employee.data.organization_id,
    employee_id: input.employeeId,
    signer_name: input.signerName,
    signed_entity_type: input.signedEntityType,
    signed_entity_id: input.signedEntityId,
    document_id: input.documentId || null,
    document_version: input.documentVersion,
    signature_image_path: null,
    signature_trace: input.signatureTrace || { imageDataUrlHash: signatureHash },
    ip_address: input.ipAddress || null,
    user_agent: input.userAgent || null,
    content_hash: contentHash,
    signature_hash: signatureHash,
    consent_text: input.consentText,
    displayed_text: input.displayedText,
    actor_user_id: input.actorUserId,
    evidence: { version: input.documentVersion, internalEvidenceOnly: true },
  });
  if (!created.ok) return created;
  if (input.documentId) await patchStaffDocument(input.documentId, { signature_status: "signed" });
  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    actorEmployeeId: input.employeeId,
    entityType: "staff_signature",
    entityId: created.data.id,
    action: "signature_create",
    afterData: {
      id: created.data.id,
      employee_id: created.data.employee_id,
      signed_entity_type: created.data.signed_entity_type,
      signed_entity_id: created.data.signed_entity_id,
      document_version: created.data.document_version,
    },
    metadata: { contentHashPrefix: contentHash.slice(0, 12), signatureHashPrefix: signatureHash.slice(0, 12) },
  });
  await createTimelineEvent({
    organization_id: employee.data.organization_id,
    employee_id: input.employeeId,
    location_id: employee.data.primary_location_id,
    event_type: "signature",
    title: "Firma manuscrita registrada",
    description: "Evidencia interna de firma manuscrita.",
    effective_at: new Date().toISOString(),
    actor_user_id: input.actorUserId,
    source: "staff_hr",
    entity_type: "staff_signature",
    entity_id: created.data.id,
    metadata: { documentVersion: input.documentVersion },
    visible_to_employee: true,
    severity: "positive",
  });
  return created;
}
