import { randomUUID } from "node:crypto";
import {
  createStaffDocument,
  getStaffDocumentById,
  patchStaffDocument,
  type StaffDocument,
} from "../repositories/staff-records.repository";
import { getStaffEmployeeById, writeStaffAuditLog } from "../repositories/staff.repository";
import {
  buildPrivateDocumentPath,
  sha256Hex,
  validateDocumentMetadata,
} from "./record-rules";
import { sanitizeAuditData } from "./sensitive";

type ServiceResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export const staffDocumentsBucket = "staff-private-documents";

function getSupabaseConfig() {
  return {
    url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  };
}

function assertSupabaseConfig() {
  const config = getSupabaseConfig();
  if (!config.url || !config.serviceRoleKey) return { ok: false as const, error: "Supabase no está configurado." };
  return { ok: true as const, config };
}

async function storageRequest<T>(path: string, init: RequestInit): Promise<ServiceResult<T>> {
  const configResult = assertSupabaseConfig();
  if (!configResult.ok) return configResult;
  const response = await fetch(`${configResult.config.url}/storage/v1/${path}`, {
    ...init,
    headers: {
      apikey: configResult.config.serviceRoleKey,
      Authorization: `Bearer ${configResult.config.serviceRoleKey}`,
      ...init.headers,
    },
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) return { ok: false, error: text || `HTTP ${response.status}` };
  if (!text) return { ok: true, data: undefined as T };
  return { ok: true, data: JSON.parse(text) as T };
}

export async function uploadEmployeeDocument(input: {
  actorUserId: string | null;
  employeeId: string;
  file: File;
  category: string;
  visibleName: string;
  documentDate?: string | null;
  expiresAt?: string | null;
  notes?: string | null;
  visibleToEmployee?: boolean;
  requiresSignature?: boolean;
  replacesDocumentId?: string | null;
}) {
  const employee = await getStaffEmployeeById(input.employeeId);
  if (!employee.ok) return employee;
  if (!employee.data) return { ok: false as const, error: "Empleado no encontrado." };
  if (!employee.data.organization_id) return { ok: false as const, error: "El empleado no tiene organización asignada." };

  const validation = validateDocumentMetadata({
    employeeId: input.employeeId,
    mimeType: input.file.type,
    sizeBytes: input.file.size,
    documentDate: input.documentDate,
    expiresAt: input.expiresAt,
  });
  if (validation) return { ok: false as const, error: validation };

  const documentId = randomUUID();
  const bytes = await input.file.arrayBuffer();
  const fileHash = await sha256Hex(bytes);
  const privatePath = buildPrivateDocumentPath({
    organizationId: employee.data.organization_id,
    employeeId: input.employeeId,
    documentId,
    originalName: input.file.name,
  });

  const uploaded = await storageRequest(`object/${staffDocumentsBucket}/${privatePath}`, {
    method: "POST",
    body: Buffer.from(bytes),
    headers: {
      "Content-Type": input.file.type,
      "x-upsert": "false",
    },
  });
  if (!uploaded.ok) return uploaded;

  const created = await createStaffDocument({
    id: documentId,
    organization_id: employee.data.organization_id,
    employee_id: input.employeeId,
    category: input.category,
    visible_name: input.visibleName,
    original_name: input.file.name,
    private_path: privatePath,
    mime_type: input.file.type,
    size_bytes: input.file.size,
    document_date: input.documentDate || null,
    expires_at: input.expiresAt || null,
    notes: input.notes || null,
    uploaded_by: input.actorUserId,
    file_hash: fileHash,
    version: 1,
    replaces_document_id: input.replacesDocumentId || null,
    visible_to_employee: Boolean(input.visibleToEmployee),
    requires_signature: Boolean(input.requiresSignature),
  });
  if (!created.ok) return created;

  if (input.replacesDocumentId) {
    await patchStaffDocument(input.replacesDocumentId, { status: "replaced", signature_status: "invalidated" });
  }

  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    entityType: "staff_document",
    entityId: created.data.id,
    action: input.replacesDocumentId ? "document_replace" : "document_upload",
    afterData: sanitizeAuditData({
      id: created.data.id,
      employee_id: created.data.employee_id,
      category: created.data.category,
      mime_type: created.data.mime_type,
      size_bytes: created.data.size_bytes,
      version: created.data.version,
      visible_to_employee: created.data.visible_to_employee,
      requires_signature: created.data.requires_signature,
    }),
    metadata: { fileHashPrefix: fileHash.slice(0, 12) },
  });

  return created;
}

export async function archiveEmployeeDocument(input: { actorUserId: string | null; documentId: string }) {
  const current = await getStaffDocumentById(input.documentId);
  if (!current.ok) return current;
  if (!current.data) return { ok: false as const, error: "Documento no encontrado." };
  const patched = await patchStaffDocument(input.documentId, { status: "archived" });
  if (!patched.ok) return patched;
  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    entityType: "staff_document",
    entityId: input.documentId,
    action: "document_archive",
    beforeData: sanitizeAuditData({ status: current.data.status }),
    afterData: sanitizeAuditData({ status: patched.data.status }),
  });
  return patched;
}

export async function createSignedDocumentUrl(input: {
  actorUserId?: string | null;
  document: StaffDocument;
  expiresIn?: number;
}) {
  const result = await storageRequest<{ signedURL: string }>(`object/sign/${staffDocumentsBucket}/${input.document.private_path}`, {
    method: "POST",
    body: JSON.stringify({ expiresIn: input.expiresIn || 120 }),
    headers: { "Content-Type": "application/json" },
  });
  if (!result.ok) return result;
  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    entityType: "staff_document",
    entityId: input.document.id,
    action: "document_signed_url",
    metadata: { category: input.document.category, expiresIn: input.expiresIn || 120 },
  });
  const config = getSupabaseConfig();
  return { ok: true as const, data: `${config.url}/storage/v1${result.data.signedURL}` };
}
