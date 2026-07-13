import { createHash } from "node:crypto";

export const allowedDocumentMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
]);

export const maxStaffDocumentBytes = 10 * 1024 * 1024;

export function validateDateRange(startsAt: string, endsAt: string) {
  if (!startsAt || !endsAt) return "Faltan fechas.";
  if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) return "La fecha de fin debe ser posterior a la de inicio.";
  return null;
}

export function validateDocumentMetadata(input: {
  employeeId?: string | null;
  mimeType: string;
  sizeBytes: number;
  documentDate?: string | null;
  expiresAt?: string | null;
}) {
  if (!input.employeeId) return "El documento debe estar asociado a un empleado.";
  if (!allowedDocumentMimeTypes.has(input.mimeType)) return "Tipo de archivo no permitido.";
  if (input.sizeBytes <= 0 || input.sizeBytes > maxStaffDocumentBytes) return "El archivo excede el tamaño permitido.";
  if (input.documentDate && input.expiresAt && input.expiresAt < input.documentDate) return "La caducidad no puede ser anterior a la fecha del documento.";
  return null;
}

export function validateAbsence(input: { startsAt: string; endsAt: string }) {
  return validateDateRange(input.startsAt, input.endsAt);
}

export function validateTrainingCertificate(input: { completedAt?: string | null; expiresAt?: string | null }) {
  if (input.completedAt && input.expiresAt && input.expiresAt < input.completedAt) return "La caducidad no puede ser anterior a la realización.";
  return null;
}

export function assertStatusTransition<T extends string>(current: T, next: T, allowed: Record<T, T[]>) {
  return current === next || allowed[current]?.includes(next) || false;
}

export function safeStorageFileName(name: string) {
  const base = name.normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .toLowerCase();
  return base || "documento";
}

export function buildPrivateDocumentPath(input: { organizationId: string; employeeId: string; documentId: string; originalName: string }) {
  return [
    input.organizationId,
    input.employeeId,
    input.documentId,
    safeStorageFileName(input.originalName),
  ].join("/");
}

export async function sha256Hex(input: ArrayBuffer | string) {
  if (typeof input === "string") return createHash("sha256").update(input).digest("hex");
  return createHash("sha256").update(Buffer.from(input)).digest("hex");
}

export function isCertificateExpiring(expiresAt: string | null | undefined, days = 30) {
  if (!expiresAt) return false;
  const expires = new Date(`${expiresAt}T00:00:00.000Z`).getTime();
  const now = Date.now();
  return expires >= now && expires <= now + days * 24 * 60 * 60 * 1000;
}

export function isExpired(expiresAt: string | null | undefined) {
  if (!expiresAt) return false;
  return new Date(`${expiresAt}T23:59:59.999Z`).getTime() < Date.now();
}

export function buildSignatureContentHash(input: { entityType: string; entityId: string; documentVersion: number; displayedText: string }) {
  return createHash("sha256")
    .update(`${input.entityType}:${input.entityId}:${input.documentVersion}:${input.displayedText}`)
    .digest("hex");
}

export function buildSignatureHash(input: { contentHash: string; traceOrImage: string; signer: string }) {
  return createHash("sha256")
    .update(`${input.contentHash}:${input.signer}:${input.traceOrImage}`)
    .digest("hex");
}
