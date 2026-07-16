"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearAdminSession, createAdminSession, hashAdminPassword, isCorrectAdminPassword, loginAdminUser, requireAdminSession } from "@/lib/admin-kiosko/auth";
import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { createDomainEvent, emitDomainEventSafe } from "@/lib/admin-kiosko/domain";
import { freezerInventory20260708Service } from "@/lib/admin-kiosko/domain/freezer-inventory-20260708.service";
import { goodsReceptionService } from "@/lib/admin-kiosko/domain/goods-reception.service";
import { labelEventService, type LabelEventResult } from "@/lib/admin-kiosko/domain/label-event.service";
import { makroReception202607Service } from "@/lib/admin-kiosko/domain/makro-reception-202607.service";
import { palomitasTraceabilityService, type PalomitasLabelVariant } from "@/lib/admin-kiosko/domain/palomitas-traceability.service";
import { processPendingInboxOcr, reprocessInboxOcr } from "@/lib/admin-kiosko/domain/inbox-ocr/processor";
import { DOCUMENT_TYPES } from "@/lib/admin-kiosko/domain/document-types";
import type { GodexLabelTemplate } from "@/lib/admin-kiosko/printing/godex-ezpl";
import { DEFAULT_GODEX_G500_PRINTER_KEY, printService } from "@/lib/admin-kiosko/printing/print-service";
import { generatePrepBatchCode } from "@/lib/admin-kiosko/printing/prep-label-utils";
import {
  createChecklistRecord,
  createCleaningRecord,
  createAnnualVerification,
  createEquipmentAsset,
  createFryerOilRecord,
  createGoodsReceptionRecord,
  createInspectionRecord,
  createMaintenanceRecord,
  createMonthlySignature,
  createSupplierRecord,
  createWaterRecord,
  createIncidentRecord,
  createTemperatureRecord,
  createAiProcessingLog,
  createAiSupplierDocument,
  createAiTraceabilityItem,
  createAccountingDocument,
  createAccountingDocumentItem,
  createDocumentCorrections,
  createInventoryProduct,
  createInternalRecipe,
  createLabelRecord,
  createProductionBatch,
  createProductionMovement,
  registerBatchConsumption as registerBatchConsumptionRecord,
  generateFinishedProductLabel,
  getInventoryProductById,
  ensureSupplierRecord,
  applyInventoryMovement,
  planProductionBatch,
  registerProductionMovements,
  updateInventoryLotReviewData,
  updateInventoryProduct,
  upsertInventoryFromAiReception,
  updateEquipmentAlertStatus,
  updateAccountingReconciliationStatus,
  updateUploadedDocumentReview,
  archiveInboxDocument,
  bulkUpdateInboxDocuments,
  classifyQueuedInboxDocument,
  confirmInboxDocument,
  createInboxUploadGroupId,
  queueInboxDocument,
  buildReprintPayload,
  enqueuePrintJob,
  getPrintJobById,
  getProductionBatchById,
} from "@/lib/admin-kiosko/database";
import { createAdminUser, updateAdminUser, writeAdminAuditLog, type AdminUserRole, type AdminUserStatus } from "@/lib/admin-kiosko/repositories/admin-users.repository";
import type { InboxDocumentType } from "@/lib/admin-kiosko/inbox";

export async function loginAdminKioskoAction(formData: FormData) {
  const username = text(formData, "username");
  const password = String(formData.get("password") || "");
  const next = safeAdminRedirectTarget(String(formData.get("next") || ""));

  if (username) {
    const result = await loginAdminUser(username, password);
    if (!result.ok) {
      redirect(next ? `/admin-kiosko?error=1&next=${encodeURIComponent(next)}` : "/admin-kiosko?error=1");
    }
    redirect(next || (result.data.role === "employee" ? "/admin-kiosko/empleado" : "/admin-kiosko"));
  }

  if (!isCorrectAdminPassword(password)) {
    await writeAdminAuditLog({
      action: "login_failed",
      entityType: "admin_user",
      entityId: "legacy-owner",
      metadata: { reason: "bad_legacy_password" },
    });
    redirect(next ? `/admin-kiosko?error=1&next=${encodeURIComponent(next)}` : "/admin-kiosko?error=1");
  }

  await createAdminSession();
  await writeAdminAuditLog({
    action: "login",
    entityType: "admin_user",
    entityId: "legacy-owner",
    metadata: { role: "owner", legacy: true },
  });
  redirect(next || "/admin-kiosko");
}

export async function logoutAdminKioskoAction() {
  const session = await requireAdminSession();
  await writeAdminAuditLog({
    actorUserId: session.id,
    action: "logout",
    entityType: "admin_user",
    entityId: session.id || "legacy-owner",
    metadata: { username: session.username, role: session.role, legacy: session.legacy },
  });
  await clearAdminSession();
  redirect("/admin-kiosko");
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function safeAdminRedirectTarget(value: string) {
  const target = value.trim();
  if (!target || target.includes("\n") || target.includes("\r")) return "";
  if (!target.startsWith("/admin-kiosko")) return "";
  if (target.startsWith("//")) return "";
  return target;
}

function optionalNumber(formData: FormData, key: string) {
  const value = text(formData, key).replace(",", ".");
  return value ? Number(value) : undefined;
}

function requiredNumber(formData: FormData, key: string) {
  const value = Number(text(formData, key).replace(",", "."));
  return Number.isFinite(value) ? value : 0;
}

function checkbox(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function checkboxValue(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function adminRole(value: string): AdminUserRole {
  return value === "owner" ? "owner" : "employee";
}

function adminStatus(value: string): AdminUserStatus {
  return value === "disabled" ? "disabled" : "active";
}

function auditSessionMetadata(session: Awaited<ReturnType<typeof requireAdminSession>>) {
  return {
    actorDisplayName: session.displayName,
    actorRole: session.role,
    actorUsername: session.username,
    legacy: session.legacy,
  };
}

async function auditAdminAction(
  session: Awaited<ReturnType<typeof requireAdminSession>>,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, unknown> = {},
) {
  await writeAdminAuditLog({
    actorUserId: session.id,
    action,
    entityType,
    entityId,
    metadata: { ...auditSessionMetadata(session), ...metadata },
  });
}

export async function createAdminUserAction(formData: FormData) {
  const session = await requireAdminPermission("users:manage");
  const password = String(formData.get("password") || "");
  const role = adminRole(text(formData, "role"));

  if (role === "owner" && session.role !== "owner") redirect("/admin-kiosko/403");
  if (!password || password.length < 8) redirect("/admin-kiosko/usuarios?error=password");

  const result = await createAdminUser({
    displayName: text(formData, "display_name"),
    username: text(formData, "username"),
    email: text(formData, "email") || null,
    role,
    status: "active",
    passwordHash: hashAdminPassword(password),
    createdBy: session.id,
  });

  if (!result.ok) redirect(`/admin-kiosko/usuarios?error=${encodeURIComponent(result.error.slice(0, 160))}`);

  await writeAdminAuditLog({
    actorUserId: session.id,
    action: "admin_user_created",
    entityType: "admin_user",
    entityId: result.data.id,
    metadata: { ...auditSessionMetadata(session), username: result.data.username, role: result.data.role },
  });
  revalidatePath("/admin-kiosko/usuarios");
  redirect("/admin-kiosko/usuarios?saved=created");
}

export async function updateAdminUserAction(formData: FormData) {
  const session = await requireAdminPermission("users:manage");
  const id = text(formData, "id");
  const role = adminRole(text(formData, "role"));
  const status = adminStatus(text(formData, "status"));
  const password = String(formData.get("password") || "");

  const result = await updateAdminUser({
    id,
    displayName: text(formData, "display_name"),
    username: text(formData, "username"),
    email: text(formData, "email") || null,
    role,
    status,
    ...(password ? { passwordHash: hashAdminPassword(password) } : {}),
  });

  if (!result.ok) redirect(`/admin-kiosko/usuarios?error=${encodeURIComponent(result.error.slice(0, 160))}`);

  await writeAdminAuditLog({
    actorUserId: session.id,
    action: "admin_user_updated",
    entityType: "admin_user",
    entityId: id,
    metadata: { ...auditSessionMetadata(session), username: result.data.username, role, status, passwordReset: Boolean(password) },
  });
  revalidatePath("/admin-kiosko/usuarios");
  redirect("/admin-kiosko/usuarios?saved=updated");
}

const inboxDocumentTypes = new Set<InboxDocumentType>(DOCUMENT_TYPES);

function todayMadrid() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function timeMadrid() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function optionalDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const match = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!match) return "";

  const [, day, month, year] = match;
  const fullYear = year.length === 2 ? `20${year}` : year;
  return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function optionalMoney(value: string) {
  const normalized = value.replace(",", ".").replace(/[^\d.-]/g, "");
  const number = normalized ? Number(normalized) : undefined;
  return Number.isFinite(number) ? number : undefined;
}

function optionalQuantity(value: string) {
  const normalized = value.replace(",", ".").replace(/[^\d.-]/g, "");
  const number = normalized ? Number(normalized) : undefined;
  return Number.isFinite(number) ? number : undefined;
}

function temperatureFromText(value: string) {
  const match = value.replace(",", ".").match(/-?\d+(\.\d+)?/);
  const number = match ? Number(match[0]) : undefined;
  return Number.isFinite(number) ? number : undefined;
}

function hasCriticalObservation(value: string) {
  return /rechaz|incidencia|cr[ií]tic|mal estado|temperatura alta|caducad[ao]|no conforme/i.test(value);
}

function optionalInboxDocumentType(value: string): InboxDocumentType | undefined {
  return inboxDocumentTypes.has(value as InboxDocumentType) ? value as InboxDocumentType : undefined;
}

function godexTemplateFromModel(model: string): GodexLabelTemplate {
  if (model === "Congelación") return "congelacion";
  if (model === "Descongelación") return "descongelacion";
  if (model === "Recepción") return "recepcion";
  if (model === "Lote" || model === "Caducidad") return "trazabilidad";
  return "produccion";
}

type ProductionLabelQueueResult = LabelEventResult | { ok: false; error: string };

function isLabelEventResult(value: unknown): value is LabelEventResult {
  return value !== null
    && typeof value === "object"
    && "ok" in value
    && "decision" in value;
}

async function queueProductionCloseLabel(input: {
  prepName: string;
  productionDate: string;
  productionTime: string;
  expiryDate: string;
  batchCode: string;
  productionBatchId: string;
  responsibleName: string;
  storageState: string;
  quantity?: number;
  unit?: string;
}): Promise<ProductionLabelQueueResult> {
  const printResult = await emitProductionBatchClosedEvent({
    ...input,
    createdFrom: "production_close",
    reason: "auto_print_on_batch_close",
    correlationId: input.productionBatchId,
  });

  if (printResult.ok) {
    console.info("[PRODUCTION LABEL AUTO QUEUED]", {
      batchId: input.productionBatchId,
      batchCode: input.batchCode,
      printerKey: DEFAULT_GODEX_G500_PRINTER_KEY,
      template: "prep_label_professional",
      jobId: printResult.data.id,
    });
  }

  return printResult;
}

async function queueProductionBatchManualReprint(input: {
  prepName: string;
  productionDate: string;
  productionTime: string;
  expiryDate: string;
  batchCode: string;
  productionBatchId: string;
  responsibleName: string;
    storageState: string;
    quantity?: number;
    unit?: string;
    reprintReason?: string;
}) {
  const printResult = await labelEventService.requestProductionBatchManualLabel({
    ...input,
    createdFrom: "production_batch_detail",
    reason: "manual_reprint_batch_label",
    reprintReason: input.reprintReason,
  });

  if (printResult.ok) {
    console.info("[PRODUCTION LABEL REPRINT QUEUED]", {
      batchId: input.productionBatchId,
      batchCode: input.batchCode,
      printerKey: DEFAULT_GODEX_G500_PRINTER_KEY,
      template: "prep_label_professional",
      jobId: printResult.data.id,
    });
  }

  return printResult;
}

async function emitPrintJobCreatedEvent(input: {
  printJobId: string;
  printerKey: string;
  template?: string;
  sourceType?: string;
  sourceId?: string;
  reason?: string;
  correlationId?: string;
}) {
  await emitDomainEventSafe(createDomainEvent("PrintJobCreated", {
    source: "labels",
    correlationId: input.correlationId || input.printJobId,
    trace: { labelId: input.printJobId },
    payload: {
      printJobId: input.printJobId,
      printerKey: input.printerKey,
      template: input.template,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      reason: input.reason,
    },
  }));
}

async function emitProductionBatchClosedEvent(input: {
  prepName: string;
  productionDate: string;
  productionTime: string;
  expiryDate: string;
  batchCode: string;
  productionBatchId: string;
  responsibleName: string;
  storageState: string;
  quantity?: number;
  unit?: string;
  createdFrom: string;
  reason: string;
  correlationId?: string;
}): Promise<ProductionLabelQueueResult> {
  const result = await emitDomainEventSafe(createDomainEvent("ProductionBatchClosed", {
    source: "production",
    correlationId: input.correlationId || input.productionBatchId,
    trace: { productionBatchId: input.productionBatchId },
    payload: {
      prepName: input.prepName,
      productionDate: input.productionDate,
      productionTime: input.productionTime,
      expiryDate: input.expiryDate,
      batchCode: input.batchCode,
      productionBatchId: input.productionBatchId,
      responsibleName: input.responsibleName,
      storageState: input.storageState,
      quantity: input.quantity,
      unit: input.unit,
      createdFrom: input.createdFrom,
      reason: input.reason,
    },
  }));
  const labelResult = result?.handlerResults.find((entry) => entry.handlerName === "LabelHandler")?.result;
  if (isLabelEventResult(labelResult)) return labelResult;
  return { ok: false, error: "No se pudo confirmar la creación de la etiqueta del lote." };
}

async function resolveSupplierFromForm(formData: FormData, fieldPrefix = "supplier") {
  const selectedId = text(formData, `${fieldPrefix}_id`);
  const selectedName = text(formData, `${fieldPrefix}_name`) || text(formData, fieldPrefix);
  const newName = text(formData, `new_${fieldPrefix}_name`);
  const creatingNew = selectedId === "__new__" || selectedName === "__new__" || Boolean(newName);

  if (!creatingNew) {
    return selectedName;
  }

  const supplierName = newName || (selectedName === "__new__" ? "" : selectedName);
  if (!supplierName) return "";

  const ensured = await ensureSupplierRecord({
    supplier: supplierName,
    cif: text(formData, `new_${fieldPrefix}_tax_id`),
    phone: text(formData, `new_${fieldPrefix}_phone`),
    email: text(formData, `new_${fieldPrefix}_email`),
    contact: text(formData, `new_${fieldPrefix}_contact`),
    responsible_person: text(formData, `new_${fieldPrefix}_contact`),
    category: "Proveedor APPCC",
    status: "pendiente_datos_administrativos",
    observations: text(formData, `new_${fieldPrefix}_observations`) || "Proveedor registrado. Información administrativa pendiente de completar.",
  });

  return ensured.ok && ensured.data?.supplier ? ensured.data.supplier : supplierName;
}

function redirectAfterSave(path: string, result: { ok: true } | { ok: false; error: string }): never {
  revalidatePath(path);
  if (result.ok) {
    redirect(`${path}?saved=1`);
  }

  const error = encodeURIComponent(result.error.slice(0, 240));
  redirect(`${path}?error=${error}`);
}

async function redirectAfterSaveWithEvent(
  path: string,
  result: { ok: true } | { ok: false; error: string },
  onSuccess: () => Promise<unknown>,
): Promise<never> {
  revalidatePath(path);
  if (result.ok) {
    await onSuccess();
    redirect(`${path}?saved=1`);
  }

  const error = encodeURIComponent(result.error.slice(0, 240));
  redirect(`${path}?error=${error}`);
}

export async function uploadInboxDocumentsAction(formData: FormData) {
  await requireAdminPermission("settings:manage");

  const selectedType = optionalInboxDocumentType(text(formData, "selected_type"));
  const responsible = text(formData, "responsible") || "F. Javier Bocanegra Sanjuan";
  const uploadGroupId = text(formData, "upload_group_id") || createInboxUploadGroupId();
  const files = [...formData.getAll("files"), ...formData.getAll("file")]
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (!files.length) {
    return {
      ok: false as const,
      error: "No se ha recibido ningún documento para subir.",
      uploadGroupId,
      documents: [],
    };
  }

  const documents = [];
  const errors = [];

  for (const [index, file] of files.entries()) {
    const queued = await queueInboxDocument({
      file,
      selectedType,
      responsible,
      uploadGroupId,
      uploadSequence: index + 1,
    });

    if (!queued.ok) {
      errors.push(`${file.name}: ${queued.error}`);
      continue;
    }

    documents.push(queued.data);
    await emitDomainEventSafe(createDomainEvent("InboxDocumentUploaded", {
      source: "inbox",
      correlationId: uploadGroupId,
      trace: { documentId: queued.data.uploadedDocumentId },
      payload: {
        uploadedDocumentId: queued.data.uploadedDocumentId,
        filename: queued.data.filename,
        mimeType: queued.data.mimeType,
        fileSize: queued.data.fileSize,
        storageBucket: queued.data.storageBucket,
        storagePath: queued.data.storagePath,
        uploadGroupId,
        queueStatus: "uploaded",
      },
    }));
    await emitDomainEventSafe(createDomainEvent("DocumentUploaded", {
      source: "inbox",
      correlationId: uploadGroupId,
      trace: { documentId: queued.data.uploadedDocumentId },
      payload: {
        uploadedDocumentId: queued.data.uploadedDocumentId,
        filename: queued.data.filename,
        mimeType: queued.data.mimeType,
        fileSize: queued.data.fileSize,
        storageBucket: queued.data.storageBucket,
        storagePath: queued.data.storagePath,
        uploadGroupId,
      },
    }));

    const classified = await classifyQueuedInboxDocument(queued.data.uploadedDocumentId);
    if (classified.ok) {
      await emitDomainEventSafe(createDomainEvent("InboxDocumentClassified", {
        source: "inbox",
        correlationId: uploadGroupId,
        trace: { documentId: classified.data.uploadedDocumentId },
        payload: {
          uploadedDocumentId: classified.data.uploadedDocumentId,
          detectedType: classified.data.detectedType || "other",
          selectedType: classified.data.selectedType,
          confidence: classified.data.classificationConfidence,
          reason: classified.data.classificationReason,
        },
      }));
      await emitDomainEventSafe(createDomainEvent("DocumentClassified", {
        source: "inbox",
        correlationId: uploadGroupId,
        trace: { documentId: classified.data.uploadedDocumentId },
        payload: {
          uploadedDocumentId: classified.data.uploadedDocumentId,
          detectedType: classified.data.detectedType || "other",
          confidence: classified.data.classificationConfidence,
          model: classified.data.classificationSource,
        },
      }));
    } else {
      errors.push(`${file.name}: ${classified.error}`);
    }
  }

  revalidatePath("/admin-kiosko/inbox");
  revalidatePath("/admin-kiosko/compras");
  revalidatePath("/admin-kiosko/contabilidad");
  revalidatePath("/admin-kiosko/ia");

  if (errors.length && !documents.length) {
    return {
      ok: false as const,
      error: errors.join(" · ").slice(0, 500),
      uploadGroupId,
      documents,
    };
  }

  return {
    ok: true as const,
    uploadGroupId,
    documents,
    errors,
  };
}

export async function confirmInboxReviewAction(formData: FormData) {
  await requireAdminPermission("settings:manage");

  const uploadedDocumentId = text(formData, "uploaded_document_id");
  const confirmedType = optionalInboxDocumentType(text(formData, "confirmed_type")) || "other";
  const corrections = {
    supplier: text(formData, "supplier"),
    document_number: text(formData, "document_number"),
    document_date: text(formData, "document_date"),
    total_amount: text(formData, "total_amount"),
    products: text(formData, "products"),
    batch_number: text(formData, "batch_number"),
    expiry_date: text(formData, "expiry_date"),
    temperature: text(formData, "temperature"),
    location: text(formData, "location"),
    category: text(formData, "category"),
    traceability: text(formData, "traceability"),
    appcc: text(formData, "appcc"),
  };

  const result = await confirmInboxDocument({
    uploadedDocumentId,
    confirmedType,
    corrections,
    responsible: text(formData, "responsible") || "F. Javier Bocanegra Sanjuan",
  });

  revalidatePath("/admin-kiosko/inbox");
  if (result.ok) {
    await emitDomainEventSafe(createDomainEvent("InboxReviewCompleted", {
      source: "inbox",
      correlationId: uploadedDocumentId,
      trace: { documentId: uploadedDocumentId },
      payload: {
        uploadedDocumentId,
        confirmedType,
        corrections,
      },
    }));
    await emitDomainEventSafe(createDomainEvent("InboxImportConfirmed", {
      source: "inbox",
      correlationId: uploadedDocumentId,
      trace: { documentId: uploadedDocumentId },
      payload: {
        uploadedDocumentId,
        confirmedType,
        targets: ["accounting", "purchasing", "goods_reception", "inventory", "traceability", "labels"],
      },
    }));
    redirect("/admin-kiosko/inbox?saved=1");
  }

  redirect(`/admin-kiosko/inbox?error=${encodeURIComponent(result.error.slice(0, 240))}`);
}

export async function archiveInboxDocumentAction(formData: FormData) {
  await requireAdminPermission("settings:manage");

  const result = await archiveInboxDocument(
    text(formData, "uploaded_document_id"),
    text(formData, "responsible") || "F. Javier Bocanegra Sanjuan",
  );

  redirectAfterSave("/admin-kiosko/inbox", result);
}

export async function bulkInboxDocumentsAction(formData: FormData) {
  await requireAdminPermission("settings:manage");

  const action = text(formData, "bulk_action") as "confirm" | "archive" | "change_type" | "reprocess_ocr" | "mark_duplicate";
  const uploadedDocumentIds = formData.getAll("document_ids").map(String).filter(Boolean);
  const confirmedType = optionalInboxDocumentType(text(formData, "bulk_confirmed_type"));
  const result = await bulkUpdateInboxDocuments({
    uploadedDocumentIds,
    action,
    confirmedType,
    duplicateOf: text(formData, "duplicate_of"),
    responsible: text(formData, "responsible") || "F. Javier Bocanegra Sanjuan",
  });

  revalidatePath("/admin-kiosko/inbox");
  if (result.ok) {
    if (action === "reprocess_ocr") {
      const ocrResult = await reprocessInboxOcr(uploadedDocumentIds);
      revalidatePath("/admin-kiosko/inbox");
      if (!ocrResult.ok) {
        redirect(`/admin-kiosko/inbox?error=${encodeURIComponent(ocrResult.error.slice(0, 240))}`);
      }
      const failed = ocrResult.data.failed;
      const completed = ocrResult.data.completed;
      redirect(`/admin-kiosko/inbox?saved=1&ocr=${completed}&ocr_failed=${failed}`);
    }

    await Promise.all(uploadedDocumentIds.map((uploadedDocumentId) => emitDomainEventSafe(createDomainEvent(
      action === "confirm" ? "InboxImportConfirmed" : "InboxReviewCompleted",
      {
        source: "inbox",
        correlationId: uploadedDocumentId,
        trace: { documentId: uploadedDocumentId },
        payload: action === "confirm"
          ? {
              uploadedDocumentId,
              confirmedType: confirmedType || "other",
              targets: ["accounting", "purchasing", "goods_reception", "inventory", "traceability", "labels"],
            }
          : {
              uploadedDocumentId,
              confirmedType: confirmedType || "other",
              corrections: { bulk_action: action },
            },
      },
    ))));
    redirect("/admin-kiosko/inbox?saved=1");
  }

  redirect(`/admin-kiosko/inbox?error=${encodeURIComponent(result.error.slice(0, 240))}`);
}

export async function processInboxPendingOcrAction(formData: FormData) {
  await requireAdminPermission("settings:manage");

  const limit = Math.max(1, Math.min(50, Number(text(formData, "limit")) || 10));
  const result = await processPendingInboxOcr(limit);

  revalidatePath("/admin-kiosko/inbox");
  if (result.ok) {
    redirect(`/admin-kiosko/inbox?saved=1&ocr=${result.data.completed}&ocr_failed=${result.data.failed}`);
  }

  redirect(`/admin-kiosko/inbox?error=${encodeURIComponent(result.error.slice(0, 240))}`);
}

export async function saveTemperatureRecordAction(formData: FormData) {
  const session = await requireAdminPermission("temperatures:create");

  const result = await createTemperatureRecord({
    record_date: text(formData, "record_date"),
    record_time: text(formData, "record_time"),
    equipment: text(formData, "equipment"),
    temperature: Number(text(formData, "temperature").replace(",", ".")),
    status: text(formData, "status"),
    observations: text(formData, "observations"),
    responsible: text(formData, "responsible"),
  });
  if (result.ok) {
    await auditAdminAction(session, "temperature_recorded", "temperature_record", null, {
      equipment: text(formData, "equipment"),
      temperature: Number(text(formData, "temperature").replace(",", ".")),
      status: text(formData, "status"),
    });
  }

  await redirectAfterSaveWithEvent("/admin-kiosko/temperaturas", result, () => emitDomainEventSafe(createDomainEvent("TemperatureRecorded", {
    source: "appcc",
    payload: {
      equipment: text(formData, "equipment"),
      temperature: Number(text(formData, "temperature").replace(",", ".")),
      status: text(formData, "status"),
    },
  })));
}

export async function updateEquipmentAlertStatusAction(formData: FormData) {
  await requireAdminPermission("appcc:manage");

  const status = text(formData, "status");
  const result = await updateEquipmentAlertStatus({
    id: text(formData, "id"),
    status: status === "solventado" ? "solventado" : status === "en_proceso" ? "en_proceso" : "pendiente",
    corrective_action: text(formData, "corrective_action"),
    resolved_by: text(formData, "resolved_by"),
  });

  redirectAfterSave("/admin-kiosko/temperaturas", result);
}

export async function saveCleaningRecordAction(formData: FormData) {
  const session = await requireAdminPermission("cleaning:create");
  const cleaningObservations = [
    text(formData, "observations"),
    text(formData, "cleaning_method") ? `Método aplicado: ${text(formData, "cleaning_method")}` : "",
    text(formData, "verification") ? `Verificación: ${text(formData, "verification")}` : "",
  ].filter(Boolean).join("\n");

  const result = await createCleaningRecord({
    record_date: text(formData, "record_date"),
    record_time: text(formData, "record_time"),
    area: text(formData, "area"),
    shift: text(formData, "shift"),
    cleaning_done: checkbox(formData, "cleaning_done"),
    products_used: text(formData, "products_used"),
    status: text(formData, "status"),
    observations: cleaningObservations,
    responsible: text(formData, "responsible"),
  });
  if (result.ok) {
    await auditAdminAction(session, "cleaning_recorded", "cleaning_record", null, {
      area: text(formData, "area"),
      status: text(formData, "status"),
    });
  }

  await redirectAfterSaveWithEvent("/admin-kiosko/limpieza", result, () => emitDomainEventSafe(createDomainEvent("CleaningRecorded", {
    source: "appcc",
    payload: {
      area: text(formData, "area"),
      status: text(formData, "status"),
    },
  })));
}

export async function saveFryerOilRecordAction(formData: FormData) {
  const session = await requireAdminPermission("appcc:manage");
  const oilObservations = [
    text(formData, "observations"),
    checkbox(formData, "oil_filtered") ? "Aceite filtrado." : "",
    checkbox(formData, "waste_oil_removed") ? "Retirada de aceite usado registrada." : "",
    text(formData, "waste_oil_manager") ? `Gestor autorizado: ${text(formData, "waste_oil_manager")}` : "",
    text(formData, "waste_oil_contract") ? `Contrato/referencia gestor: ${text(formData, "waste_oil_contract")}` : "",
    text(formData, "waste_oil_contact") ? `Contacto gestor: ${text(formData, "waste_oil_contact")}` : "",
    text(formData, "waste_oil_pickup_date") ? `Fecha retirada aceite usado: ${text(formData, "waste_oil_pickup_date")}` : "",
    text(formData, "waste_oil_document") ? `Justificante/documento asociado: ${text(formData, "waste_oil_document")}` : "",
  ].filter(Boolean).join("\n");

  const result = await createFryerOilRecord({
    record_date: text(formData, "record_date"),
    record_time: text(formData, "record_time"),
    fryer: text(formData, "fryer"),
    oil_status: text(formData, "oil_status"),
    oil_changed: checkbox(formData, "oil_changed"),
    polar_compounds: text(formData, "polar_compounds"),
    color_smell_check: text(formData, "color_smell_check"),
    status: text(formData, "status"),
    observations: oilObservations,
    responsible: text(formData, "responsible"),
  });
  if (result.ok) {
    await auditAdminAction(session, "fryer_oil_recorded", "fryer_oil_record", null, {
      fryer: text(formData, "fryer"),
      status: text(formData, "status"),
      oilChanged: checkbox(formData, "oil_changed"),
    });
  }

  redirectAfterSave("/admin-kiosko/aceite-freidora", result);
}

export async function saveGoodsReceptionRecordAction(formData: FormData) {
  const session = await requireAdminPermission("goods_reception:basic_create");
  const supplier = await resolveSupplierFromForm(formData);

  const result = await createGoodsReceptionRecord({
    record_date: text(formData, "record_date"),
    record_time: text(formData, "record_time"),
    supplier,
    product: text(formData, "product"),
    delivery_temperature: optionalNumber(formData, "delivery_temperature"),
    accepted: checkbox(formData, "accepted"),
    batch_number: text(formData, "batch_number"),
    expiry_date: text(formData, "expiry_date"),
    status: text(formData, "status"),
    observations: text(formData, "observations"),
    responsible: text(formData, "responsible"),
  });
  if (result.ok) {
    await auditAdminAction(session, "goods_reception_recorded", "goods_reception_record", null, {
      supplier,
      product: text(formData, "product"),
      accepted: checkbox(formData, "accepted"),
      status: text(formData, "status"),
    });
  }

  await redirectAfterSaveWithEvent("/admin-kiosko/recepcion-mercancia", result, () => emitDomainEventSafe(createDomainEvent("GoodsReceived", {
    source: "appcc",
    payload: {
      supplierName: supplier,
      items: [{
        productName: text(formData, "product"),
        batchNumber: text(formData, "batch_number"),
        quantity: undefined,
        expiryDate: text(formData, "expiry_date"),
      }],
    },
  })));
}

export async function registerManualGoodsReceptionAction(formData: FormData) {
  const session = await requireAdminPermission("goods_reception:advanced_create");

  const result = await goodsReceptionService.registerManualReception({
    supplierId: text(formData, "supplier_id"),
    supplierName: text(formData, "supplier_name"),
    productId: text(formData, "product_id"),
    batchCode: text(formData, "batch_code"),
    quantity: requiredNumber(formData, "quantity"),
    unit: text(formData, "unit"),
    receivedDate: text(formData, "received_date") || todayMadrid(),
    receivedTime: text(formData, "received_time") || timeMadrid(),
    expiryDate: text(formData, "expiry_date"),
    storageCondition: text(formData, "storage_condition"),
    receivedBy: text(formData, "received_by") || "F. Javier Bocanegra Sanjuan",
    observations: text(formData, "observations"),
  });

  revalidatePath("/admin-kiosko/compras");
  revalidatePath("/admin-kiosko/inventario");
  revalidatePath("/admin-kiosko/recepcion-mercancia");
  revalidatePath("/admin-kiosko/impresiones");
  revalidatePath("/admin-kiosko/trazabilidad");

  if (!result.ok) {
    redirect(`/admin-kiosko/compras?receipt_error=${encodeURIComponent(result.error.slice(0, 240))}`);
  }

  const params = new URLSearchParams({
    receipt: result.data.receiptId,
    batch: result.data.batchCode,
  });
  if (result.data.skippedExistingReception) {
    params.set("receipt_existing", result.data.receiptId);
  }
  const printResult = result.data.printResult;
  if (printResult?.ok) {
    params.set(printResult.skipped ? "print_existing" : "print_job", printResult.data.id);
  } else if (printResult?.error && printResult.error !== "skipped_existing_reception") {
    params.set("print_error", printResult.error.slice(0, 240));
  }
  await auditAdminAction(session, "goods_reception_advanced_registered", "goods_reception", result.data.receiptId, {
    supplier: text(formData, "supplier_name"),
    batchCode: result.data.batchCode,
  });

  redirect(`/admin-kiosko/compras?${params.toString()}`);
}

export async function saveAiReceptionAction(formData: FormData) {
  await requireAdminPermission("goods_reception:advanced_create");

  const ocrJson = parseJson<Record<string, unknown>>(text(formData, "ocr_json"), {});
  const productCount = Number(text(formData, "product_count")) || 0;
  const supplier = await resolveSupplierFromForm(formData) || "Proveedor no identificado";
  const documentDate = optionalDate(text(formData, "document_date")) || todayMadrid();
  const recordTime = timeMadrid();
  const observations = text(formData, "observations");
  const temperature = temperatureFromText(text(formData, "temperature"));
  const products = Array.from({ length: productCount }, (_, index) => ({
    name: text(formData, `product_${index}_name`),
    quantity: text(formData, `product_${index}_quantity`),
    batch: text(formData, `product_${index}_batch`),
    expiry: optionalDate(text(formData, `product_${index}_expiry`)),
    price: optionalMoney(text(formData, `product_${index}_price`)),
    location: text(formData, `product_${index}_location`) || "Almacén",
    accepted: formData.get(`product_${index}_accepted`) !== "false",
  })).filter((product) => product.name || product.batch || product.expiry);
  const missingBatchOrExpiry = products.some((product) => !product.batch || !product.expiry);
  const missingTemperature = !Number.isFinite(temperature);
  const status = missingBatchOrExpiry || missingTemperature ? "revisar" : "correcto";
  const productSummary = `Recepción IA · ${products.length || 1} productos`;
  const cleanSummary = [
    `Documento: ${text(formData, "document_type") || "OCR IA"} ${text(formData, "document_number") || ""}`.trim(),
    `Proveedor: ${supplier}`,
    products.length ? `Productos: ${products.map((product) => product.name || "Sin nombre").join(", ")}` : "",
    missingBatchOrExpiry ? "Revisar lotes/caducidades no visibles cuando aplique." : "",
    missingTemperature ? "Temperatura no visible en el documento. Revisar si aplica." : "",
    observations,
  ].filter(Boolean).join("\n");

  const supplierDocument = await createAiSupplierDocument({
    document_type: text(formData, "document_type"),
    document_number: text(formData, "document_number"),
    document_date: documentDate,
    supplier_name: supplier,
    supplier_tax_id: text(formData, "supplier_tax_id"),
    total_amount: optionalMoney(text(formData, "total_amount")),
    original_filename: text(formData, "original_filename"),
    ocr_status: status,
    ocr_json: ocrJson,
    reviewed_by: "F. Javier Bocanegra Sanjuan",
  });

  if (!supplierDocument.ok) {
    await createAiProcessingLog({
      document_name: text(formData, "original_filename"),
      detected_type: text(formData, "detected_type"),
      status: "error",
      summary: "No se pudo guardar el documento OCR revisado.",
      raw_json: ocrJson,
      error_message: supplierDocument.error,
    });
    redirect(`/admin-kiosko/ia?error=${encodeURIComponent(supplierDocument.error.slice(0, 240))}`);
  }

  const uploadedDocumentId = text(formData, "uploaded_document_id");
  await updateUploadedDocumentReview(uploadedDocumentId, {
    review_status: "revisado",
    related_record_type: "admin_ai_supplier_documents",
    related_record_id: supplierDocument.data?.id,
    corrections: {
      supplier,
      supplier_tax_id: text(formData, "supplier_tax_id"),
      document_type: text(formData, "document_type"),
      document_number: text(formData, "document_number"),
      document_date: documentDate,
      taxable_base: text(formData, "taxable_base"),
      vat_amount: text(formData, "vat_amount"),
      total_amount: text(formData, "total_amount"),
      reception_temperature: text(formData, "reception_temperature"),
      observations,
      products,
    },
  });
  await emitDomainEventSafe(createDomainEvent("DocumentConfirmed", {
    source: "ocr",
    trace: { documentId: uploadedDocumentId, supplierDocumentId: supplierDocument.data?.id },
    payload: {
      uploadedDocumentId,
      confirmedType: text(formData, "document_type") || text(formData, "detected_type") || "other",
      corrections: {
        supplier,
        document_number: text(formData, "document_number"),
        document_date: documentDate,
        products,
      },
    },
  }));

  const accountingDocument = await createAccountingDocument({
    uploaded_document_id: uploadedDocumentId,
    supplier_name: supplier,
    supplier_tax_id: text(formData, "supplier_tax_id"),
    document_type: text(formData, "document_type"),
    document_number: text(formData, "document_number"),
    document_date: documentDate,
    taxable_base: optionalMoney(text(formData, "taxable_base")),
    vat_amount: optionalMoney(text(formData, "vat_amount")),
    total_amount: optionalMoney(text(formData, "total_amount")),
    reconciliation_status: "pendiente_conciliar",
    review_status: "revisado",
    observations: observations,
  });
  const accountingDocumentId = accountingDocument.ok ? accountingDocument.data?.id : undefined;
  if (accountingDocument.ok && accountingDocumentId) {
    await emitDomainEventSafe(createDomainEvent("AccountingDocumentCreated", {
      source: "accounting",
      trace: { documentId: uploadedDocumentId, accountingDocumentId },
      payload: {
        accountingDocumentId,
        uploadedDocumentId,
        documentType: text(formData, "document_type"),
        supplierName: supplier,
        totalAmount: optionalMoney(text(formData, "total_amount")),
      },
    }));
  }

  await createDocumentCorrections({
    document_id: uploadedDocumentId,
    accounting_document_id: accountingDocumentId,
    responsible: "F. Javier Bocanegra Sanjuan",
    corrections: [
      { field: "proveedor", ocrValue: ocrJson.proveedor || ocrJson.supplier || ocrJson.supplier_name, finalValue: supplier },
      { field: "cif", ocrValue: ocrJson.cif || ocrJson.supplier_tax_id, finalValue: text(formData, "supplier_tax_id") },
      { field: "fecha_documento", ocrValue: ocrJson.fecha || ocrJson.document_date, finalValue: documentDate },
      { field: "numero_documento", ocrValue: ocrJson.numero || ocrJson.document_number, finalValue: text(formData, "document_number") },
      { field: "base_imponible", ocrValue: ocrJson.base_imponible || ocrJson.taxable_base, finalValue: text(formData, "taxable_base") },
      { field: "iva", ocrValue: ocrJson.iva || ocrJson.vat_amount, finalValue: text(formData, "vat_amount") },
      { field: "total", ocrValue: ocrJson.total || ocrJson.total_amount, finalValue: text(formData, "total_amount") },
      { field: "temperatura_recepcion", ocrValue: ocrJson.temperatura, finalValue: text(formData, "temperature") },
    ],
  });

  await ensureSupplierRecord({
    supplier,
    cif: text(formData, "supplier_tax_id"),
    category: "Proveedor IA",
    status: "pendiente_datos_administrativos",
    observations: "Proveedor registrado desde recepción IA OCR. Información administrativa pendiente de completar.",
  });
  await emitDomainEventSafe(createDomainEvent("SupplierCreated", {
    source: "ocr",
    trace: { documentId: uploadedDocumentId },
    payload: {
      name: supplier,
      taxId: text(formData, "supplier_tax_id"),
      status: "pendiente_datos_administrativos",
    },
  }));

  for (const product of products) {
    const traceability = await createAiTraceabilityItem({
      supplier_document_id: supplierDocument.data.id,
      product_name: product.name,
      quantity: product.quantity,
      batch_number: product.batch,
      expiry_date: product.expiry,
      accepted: product.accepted,
      observations: !product.batch || !product.expiry ? "Dato no visible en el documento. Revisar si aplica." : "",
    });

    if (!traceability.ok) {
      redirect(`/admin-kiosko/ia?error=${encodeURIComponent(traceability.error.slice(0, 240))}`);
    }

    const inventory = await upsertInventoryFromAiReception({
      name: product.name,
      quantity: product.quantity,
      supplier,
      batch: product.batch,
      expiry: product.expiry,
      purchasePrice: product.price,
      location: product.location,
      entryDate: documentDate,
      documentId: supplierDocument.data.id,
      uploadedDocumentId,
    });
    if (inventory.ok) {
      await emitDomainEventSafe(createDomainEvent("InventoryLotCreated", {
        source: "inventory",
        trace: { documentId: uploadedDocumentId, productId: inventory.data?.id },
        payload: {
          productId: inventory.data?.id,
          productName: product.name,
          batchNumber: product.batch,
          quantity: optionalQuantity(product.quantity),
          unit: "ud",
          expiryDate: product.expiry,
        },
      }));
    }

    await createAccountingDocumentItem({
      accounting_document_id: accountingDocumentId,
      product_name: product.name,
      quantity: optionalQuantity(product.quantity),
      unit: "ud",
      unit_price: product.price,
      total_amount: product.price && optionalQuantity(product.quantity) ? Number((product.price * Number(optionalQuantity(product.quantity))).toFixed(2)) : product.price,
      batch_number: product.batch,
      expiry_date: product.expiry,
      inventory_product_id: inventory.ok ? inventory.data?.id : undefined,
    });
  }

  const goodsReception = await createGoodsReceptionRecord({
    record_date: documentDate,
    record_time: recordTime,
    supplier,
    product: productSummary,
    delivery_temperature: temperature,
    accepted: products.every((product) => product.accepted),
    batch_number: products.map((product) => product.batch).filter(Boolean).join(", "),
    expiry_date: products.find((product) => product.expiry)?.expiry || "",
    status,
    observations: cleanSummary,
    responsible: "F. Javier Bocanegra Sanjuan",
    created_by: "F. Javier Bocanegra Sanjuan",
    uploaded_document_id: uploadedDocumentId,
    supplier_document_id: supplierDocument.data.id,
  });

  if (!goodsReception.ok) {
    await createAiProcessingLog({
      document_name: text(formData, "original_filename"),
      detected_type: text(formData, "detected_type"),
      status: "error",
      summary: "Documento OCR guardado, pero falló el registro de recepción APPCC.",
      raw_json: ocrJson,
      error_message: goodsReception.error,
    });
    redirect(`/admin-kiosko/ia?error=${encodeURIComponent(goodsReception.error.slice(0, 240))}`);
  }
  await emitDomainEventSafe(createDomainEvent("GoodsReceived", {
    source: "ocr",
    trace: { documentId: uploadedDocumentId, supplierDocumentId: supplierDocument.data.id, accountingDocumentId },
    payload: {
      supplierName: supplier,
      uploadedDocumentId,
      items: products.map((product) => ({
        productName: product.name,
        batchNumber: product.batch,
        quantity: optionalQuantity(product.quantity),
        unit: "ud",
        expiryDate: product.expiry,
      })),
    },
  }));

  const expiredProducts = products.filter((product) => product.expiry && product.expiry < todayMadrid());
  const rejectedProducts = products.filter((product) => !product.accepted);
  const needsIncident = (Number.isFinite(temperature) && Number(temperature) > 8)
    || expiredProducts.length > 0
    || rejectedProducts.length > 0
    || hasCriticalObservation(observations);

  if (needsIncident) {
    const incident = await createIncidentRecord({
      record_date: documentDate,
      record_time: recordTime,
      incident_type: "recepción mercancía",
      severity: rejectedProducts.length || hasCriticalObservation(observations) ? "incidencia" : "revisar",
      corrective_action: "pendiente",
      resolved: false,
      status: "pendiente",
      observations: [
        Number.isFinite(temperature) && Number(temperature) > 8 ? `Temperatura recepción superior a 8 ºC: ${temperature} ºC.` : "",
        expiredProducts.length ? `Caducidad pasada: ${expiredProducts.map((product) => product.name || product.expiry).join(", ")}.` : "",
        rejectedProducts.length ? `Producto rechazado: ${rejectedProducts.map((product) => product.name || "Sin nombre").join(", ")}.` : "",
        hasCriticalObservation(observations) ? observations : "",
      ].filter(Boolean).join("\n"),
      responsible: "F. Javier Bocanegra Sanjuan",
      created_by: "F. Javier Bocanegra Sanjuan",
    });
    if (incident.ok) {
      await emitDomainEventSafe(createDomainEvent("IncidentCreated", {
        source: "appcc",
        trace: { documentId: uploadedDocumentId, supplierDocumentId: supplierDocument.data.id },
        payload: {
          incidentType: "recepción mercancía",
          severity: rejectedProducts.length || hasCriticalObservation(observations) ? "incidencia" : "revisar",
        },
      }));
    }
  }

  await createAiProcessingLog({
    document_name: text(formData, "original_filename"),
    detected_type: text(formData, "detected_type"),
    status,
    summary: `${supplier} · ${productSummary}`,
    raw_json: ocrJson,
  });

  ["/admin-kiosko/ia", "/admin-kiosko/recepcion-mercancia", "/admin-kiosko/registros", "/admin-kiosko/cronologia", "/admin-kiosko/inventario", "/admin-kiosko/trazabilidad"].forEach((path) => revalidatePath(path));
  const labelProduct = products.find((product) => product.name && product.batch) || products[0];
  if (labelProduct) {
    const label = await createLabelRecord({
      model: "Recepción",
      product: labelProduct.name,
      batch: labelProduct.batch,
      supplier,
      opening_date: documentDate,
      best_before_date: labelProduct.expiry,
      responsible: "F. Javier Bocanegra Sanjuan",
      print_format: "termica",
      copies: 1,
      template: "recepcion",
      zpl_version: "ZPL II",
    });
    if (label.ok) {
      await emitDomainEventSafe(createDomainEvent("LabelPrinted", {
        source: "labels",
        trace: { documentId: uploadedDocumentId, supplierDocumentId: supplierDocument.data.id },
        payload: {
          template: "recepcion",
          copies: 1,
          printer: "Zebra ZD421",
        },
      }));
    }
    const labelParams = new URLSearchParams({
      model: "Recepción",
      product: labelProduct.name,
      batch: labelProduct.batch,
      best_before_date: labelProduct.expiry,
      responsible: "F. Javier Bocanegra Sanjuan",
      supplier,
      opening_date: documentDate,
      print_format: "termica",
      copies: "1",
    });
    redirect(`/admin-kiosko/etiquetas?${labelParams.toString()}`);
  }

  redirect("/admin-kiosko/ia?saved=1");
}

export async function updateAccountingReconciliationAction(formData: FormData) {
  await requireAdminPermission("reports:view");

  const result = await updateAccountingReconciliationStatus({
    id: text(formData, "document_id"),
    status: text(formData, "reconciliation_status"),
    observations: text(formData, "observations"),
  });

  await redirectAfterSaveWithEvent("/admin-kiosko/contabilidad", result, () => emitDomainEventSafe(createDomainEvent("AccountingDocumentReconciled", {
    source: "accounting",
    trace: { accountingDocumentId: text(formData, "document_id") },
    payload: {
      accountingDocumentId: text(formData, "document_id"),
      status: text(formData, "reconciliation_status"),
    },
  })));
}

export async function saveIncidentRecordAction(formData: FormData) {
  const session = await requireAdminPermission("incidents:create");

  const result = await createIncidentRecord({
    record_date: text(formData, "record_date"),
    record_time: text(formData, "record_time"),
    incident_type: text(formData, "incident_type"),
    severity: text(formData, "severity"),
    corrective_action: text(formData, "corrective_action"),
    resolved: checkbox(formData, "resolved"),
    status: text(formData, "status"),
    observations: text(formData, "observations"),
    responsible: text(formData, "responsible"),
  });
  if (result.ok) {
    await auditAdminAction(session, "incident_created", "incident_record", null, {
      incidentType: text(formData, "incident_type"),
      severity: text(formData, "severity"),
      status: text(formData, "status"),
    });
  }

  await redirectAfterSaveWithEvent("/admin-kiosko/incidencias", result, () => emitDomainEventSafe(createDomainEvent("IncidentCreated", {
    source: "appcc",
    payload: {
      incidentType: text(formData, "incident_type"),
      severity: text(formData, "severity"),
    },
  })));
}

export async function saveProductionBatchAction(formData: FormData) {
  await requireAdminPermission("traceability:manage");
  const material = parseJson<{
    lot_id?: string;
    product_id?: string;
    product?: string;
    supplier?: string | null;
    batch?: string | null;
    unit?: string | null;
    expiry_date?: string | null;
    source_document_id?: string | null;
  }>(text(formData, "source_material"), {});
  const recipeShelfLifeDays = Math.ceil((optionalNumber(formData, "shelf_life_refrigerated_hours") || 0) / 24);
  const productionDate = text(formData, "production_date") || todayMadrid();
  const calculatedExpiry = recipeShelfLifeDays
    ? new Date(`${productionDate}T00:00:00.000Z`)
    : null;
  if (calculatedExpiry) calculatedExpiry.setUTCDate(calculatedExpiry.getUTCDate() + recipeShelfLifeDays);
  const expiryDate = text(formData, "expiry_date") || (calculatedExpiry ? calculatedExpiry.toISOString().slice(0, 10) : "");
  const recipeId = text(formData, "recipe_id");
  const productionTime = text(formData, "production_time") || timeMadrid();
  const responsible = text(formData, "responsible") || "F. Javier Bocanegra Sanjuan";
  const storageState = text(formData, "storage_state") || "refrigerado";

  if (recipeId) {
    const plan = await planProductionBatch({
      recipeId,
      targetQuantity: optionalNumber(formData, "output_quantity"),
      targetUnit: text(formData, "output_unit"),
      productionDate,
      productionTime,
      responsible,
      storageState,
      observations: text(formData, "observations"),
    });

    if (!plan.ok) {
      redirect(`/admin-kiosko/produccion?error=${encodeURIComponent(plan.error.slice(0, 240))}`);
    }

    const executed = await registerProductionMovements({
      ...plan.data,
      expiryDate: expiryDate || plan.data.expiryDate,
    });

    ["/admin-kiosko/produccion", "/admin-kiosko/inventario", "/admin-kiosko/trazabilidad", "/admin-kiosko/etiquetas", "/admin-kiosko"].forEach((path) => revalidatePath(path));

    if (!executed.ok) {
      redirect(`/admin-kiosko/produccion?error=${encodeURIComponent(executed.error.slice(0, 240))}`);
    }

    const label = generateFinishedProductLabel(executed.data);
    const correlationId = executed.data.productionBatchId;

    await emitDomainEventSafe(createDomainEvent("ProductionBatchCreated", {
      source: "production",
      correlationId,
      trace: { productionBatchId: executed.data.productionBatchId, inventoryLotId: executed.data.outputInventoryLotId },
      payload: {
        productionBatchId: executed.data.productionBatchId,
        batchCode: executed.data.batchCode,
        outputProduct: executed.data.outputProduct,
        outputQuantity: executed.data.outputQuantity,
        outputUnit: executed.data.outputUnit,
      },
    }));

    await Promise.all(executed.data.consumedLots.map((lot) => emitDomainEventSafe(createDomainEvent("InventoryLotConsumed", {
      source: "production",
      correlationId,
      trace: { inventoryLotId: lot.lotId, productionBatchId: executed.data.productionBatchId, productId: lot.productId },
      payload: {
        inventoryLotId: lot.lotId,
        productId: lot.productId,
        quantity: lot.quantity,
        unit: lot.unit,
        reason: `Producción ${executed.data.batchCode}`,
      },
    }))));

    await emitDomainEventSafe(createDomainEvent("FinishedProductLotCreated", {
      source: "production",
      correlationId,
      trace: { productionBatchId: executed.data.productionBatchId, inventoryLotId: executed.data.outputInventoryLotId, productId: executed.data.outputProductId },
      payload: {
        productionBatchId: executed.data.productionBatchId,
        inventoryLotId: executed.data.outputInventoryLotId,
        productId: executed.data.outputProductId,
        productName: executed.data.outputProduct,
        batchNumber: executed.data.batchCode,
        quantity: executed.data.outputQuantity,
        unit: executed.data.outputUnit,
        expiryDate: executed.data.expiryDate || undefined,
      },
    }));

    await emitDomainEventSafe(createDomainEvent("LabelPrepared", {
      source: "labels",
      correlationId,
      trace: { productionBatchId: executed.data.productionBatchId, inventoryLotId: executed.data.outputInventoryLotId },
      payload: {
        productionBatchId: executed.data.productionBatchId,
        inventoryLotId: executed.data.outputInventoryLotId,
        productName: label.product,
        batchNumber: label.batch,
        template: "elaboracion",
        expiryDate: label.bestBeforeDate || undefined,
      },
    }));

    const params = new URLSearchParams({
      saved: "1",
      batch_code: executed.data.batchCode,
    });
    const printResult = await queueProductionCloseLabel({
      prepName: executed.data.outputProduct,
      productionDate,
      productionTime,
      expiryDate: executed.data.expiryDate || label.bestBeforeDate || expiryDate,
      batchCode: executed.data.batchCode,
      productionBatchId: executed.data.productionBatchId,
      responsibleName: responsible,
      storageState,
      quantity: executed.data.outputQuantity,
      unit: executed.data.outputUnit,
    });
    if (printResult.ok) {
      params.set(printResult.skipped ? "print_existing" : "print_job", printResult.data.id);
      await emitPrintJobCreatedEvent({
        printJobId: printResult.data.id,
        printerKey: printResult.data.printer_key,
        template: typeof printResult.data.payload.template === "string" ? printResult.data.payload.template : undefined,
        sourceType: "production_batch",
        sourceId: executed.data.productionBatchId,
        reason: printResult.skipped ? "auto_print_on_batch_close_existing" : "auto_print_on_batch_close",
        correlationId,
      });
    } else {
      params.set("print_error", printResult.error.slice(0, 240));
    }
    redirect(`/admin-kiosko/produccion?${params.toString()}#lotes`);
  }

  const result = await createProductionBatch({
    production_date: productionDate,
    production_time: productionTime,
    responsible,
    source_lot_id: material.lot_id,
    source_product_id: material.product_id,
    source_supplier: material.supplier || "",
    source_product: material.product || "",
    source_batch_number: material.batch || "",
    input_quantity: optionalNumber(formData, "input_quantity"),
    input_unit: text(formData, "input_unit") || material.unit || "",
    output_product: text(formData, "output_product"),
    output_quantity: optionalNumber(formData, "output_quantity"),
    output_unit: text(formData, "output_unit"),
    unit_weight: optionalNumber(formData, "unit_weight"),
    storage_state: storageState,
    expiry_date: expiryDate,
    observations: text(formData, "observations"),
    source_document_id: material.source_document_id || "",
  });

  revalidatePath("/admin-kiosko/produccion");
  revalidatePath("/admin-kiosko/inventario");
  revalidatePath("/admin-kiosko/trazabilidad");
  revalidatePath("/admin-kiosko/etiquetas");

  if (result.ok) {
    await emitDomainEventSafe(createDomainEvent("ProductionBatchCreated", {
      source: "production",
      trace: { productionBatchId: result.data.id, inventoryLotId: material.lot_id },
      payload: {
        productionBatchId: result.data.id,
        batchCode: result.data.batch_code,
        outputProduct: text(formData, "output_product"),
        outputQuantity: optionalNumber(formData, "output_quantity"),
        outputUnit: text(formData, "output_unit"),
        sourceInventoryLotId: material.lot_id,
      },
    }));
    const params = new URLSearchParams({
      saved: "1",
      batch_code: result.data.batch_code,
    });
    if (result.data.warnings.length) params.set("warning", result.data.warnings.join(" · ").slice(0, 240));
    const printResult = await queueProductionCloseLabel({
      prepName: text(formData, "output_product"),
      productionDate,
      productionTime,
      expiryDate,
      batchCode: result.data.batch_code,
      productionBatchId: result.data.id,
      responsibleName: responsible,
      storageState,
      quantity: optionalNumber(formData, "output_quantity"),
      unit: text(formData, "output_unit"),
    });
    if (printResult.ok) {
      params.set(printResult.skipped ? "print_existing" : "print_job", printResult.data.id);
      await emitPrintJobCreatedEvent({
        printJobId: printResult.data.id,
        printerKey: printResult.data.printer_key,
        template: typeof printResult.data.payload.template === "string" ? printResult.data.payload.template : undefined,
        sourceType: "production_batch",
        sourceId: result.data.id,
        reason: printResult.skipped ? "auto_print_on_batch_close_existing" : "auto_print_on_batch_close",
        correlationId: result.data.id,
      });
    } else {
      params.set("print_error", printResult.error.slice(0, 240));
    }
    redirect(`/admin-kiosko/produccion?${params.toString()}#lotes`);
  }

  redirect(`/admin-kiosko/produccion?error=${encodeURIComponent(result.error.slice(0, 240))}`);
}

export async function saveProductionMovementAction(formData: FormData) {
  await requireAdminPermission("traceability:manage");

  const movementType = text(formData, "movement_type") as Parameters<typeof createProductionMovement>[0]["movement_type"];
  const result = await createProductionMovement({
    batch_id: text(formData, "batch_id"),
    movement_date: text(formData, "movement_date") || todayMadrid(),
    movement_time: text(formData, "movement_time") || timeMadrid(),
    movement_type: movementType,
    quantity: optionalNumber(formData, "quantity"),
    unit: text(formData, "unit"),
    from_state: text(formData, "from_state"),
    to_state: text(formData, "to_state"),
    reason: text(formData, "reason"),
    responsible: text(formData, "responsible"),
    observations: text(formData, "observations"),
    expiry_date: text(formData, "expiry_date"),
  });

  redirectAfterSave("/admin-kiosko/produccion", result);
}

export async function registerBatchConsumption(formData: FormData) {
  await requireAdminPermission("traceability:manage");

  const batchId = text(formData, "batch_id");
  const result = await registerBatchConsumptionRecord({
    batchId,
    recipeId: text(formData, "recipe_id"),
    recipeName: text(formData, "recipe_name"),
    quantity: requiredNumber(formData, "quantity"),
    unit: text(formData, "unit"),
    consumedAt: `${text(formData, "consumed_date") || todayMadrid()} ${text(formData, "consumed_time") || timeMadrid()}`,
    consumedBy: text(formData, "consumed_by") || "F. Javier Bocanegra Sanjuan",
    notes: text(formData, "notes"),
  });

  revalidatePath(`/admin-kiosko/produccion/lotes/${batchId}`);
  revalidatePath("/admin-kiosko/produccion");
  revalidatePath("/admin-kiosko/trazabilidad");

  if (!result.ok) {
    redirect(`/admin-kiosko/produccion/lotes/${batchId}?error=${encodeURIComponent(result.error.slice(0, 240))}`);
  }

  await emitDomainEventSafe(createDomainEvent("ProductionBatchConsumed", {
    source: "production",
    correlationId: result.data.id,
    trace: { productionBatchId: result.data.batchId },
    payload: {
      batchId: result.data.batchId,
      batchCode: result.data.batchCode,
      recipeId: result.data.recipeId || undefined,
      recipeName: result.data.recipeName,
      quantity: result.data.quantity,
      unit: result.data.unit,
      stockMutation: false,
    },
  }));

  redirect(`/admin-kiosko/produccion/lotes/${batchId}?saved=consumption`);
}

export async function reprintProductionBatchLabelAction(formData: FormData) {
  await requireAdminPermission("print:manage");

  const batchId = text(formData, "batch_id");
  const reprintReason = text(formData, "reprint_reason");
  if (!batchId) {
    redirect("/admin-kiosko/produccion?error=Falta%20lote");
  }
  if (reprintReason.length < 6) {
    redirect(`/admin-kiosko/produccion/lotes/${batchId}?print_error=${encodeURIComponent("Indica un motivo de reimpresion.")}`);
  }

  const batchResult = await getProductionBatchById(batchId);
  if (!batchResult.ok) {
    redirect(`/admin-kiosko/produccion/lotes/${batchId}?print_error=${encodeURIComponent(batchResult.error.slice(0, 240))}`);
  }

  if (!batchResult.data) {
    redirect("/admin-kiosko/produccion?error=Lote%20no%20encontrado");
  }

  const batch = batchResult.data;
  const printResult = await queueProductionBatchManualReprint({
    prepName: batch.output_product || "Preparacion",
    productionDate: batch.production_date || todayMadrid(),
    productionTime: batch.production_time || timeMadrid(),
    expiryDate: batch.expiry_date || "",
    batchCode: batch.batch_code || "",
    productionBatchId: batch.id,
    responsibleName: batch.responsible || "admin-kiosko",
    storageState: batch.storage_state || "refrigerado",
    quantity: batch.output_quantity || undefined,
    unit: batch.output_unit || undefined,
    reprintReason,
  });

  revalidatePath(`/admin-kiosko/produccion/lotes/${batchId}`);
  revalidatePath("/admin-kiosko/impresiones");

  if (!printResult.ok) {
    redirect(`/admin-kiosko/produccion/lotes/${batchId}?print_error=${encodeURIComponent(printResult.error.slice(0, 240))}`);
  }

  await emitPrintJobCreatedEvent({
    printJobId: printResult.data.id,
    printerKey: printResult.data.printer_key,
    template: typeof printResult.data.payload.template === "string" ? printResult.data.payload.template : undefined,
    sourceType: "production_batch",
    sourceId: batchId,
    reason: "manual_reprint_batch_label",
    correlationId: batchId,
  });

  redirect(`/admin-kiosko/produccion/lotes/${batchId}?print_job=${encodeURIComponent(printResult.data.id)}`);
}

export async function saveInternalRecipeAction(formData: FormData) {
  await requireAdminPermission("traceability:manage");
  const inputProduct = parseJson<{ id?: string; name?: string; unit?: string }>(text(formData, "recipe_input_product"), {});

  const result = await createInternalRecipe({
    id: text(formData, "id"),
    recipe_name: text(formData, "recipe_name"),
    output_product: text(formData, "output_product"),
    expected_yield: optionalNumber(formData, "expected_yield"),
    output_unit: text(formData, "output_unit"),
    unit_weight: optionalNumber(formData, "unit_weight"),
    expected_waste: optionalNumber(formData, "expected_waste"),
    final_weight: optionalNumber(formData, "final_weight"),
    prep_time_minutes: optionalNumber(formData, "prep_time_minutes"),
    shelf_life_refrigerated_hours: optionalNumber(formData, "shelf_life_refrigerated_hours"),
    shelf_life_frozen_days: optionalNumber(formData, "shelf_life_frozen_days"),
    conservation_type: text(formData, "conservation_type"),
    status: text(formData, "status"),
    instructions: text(formData, "instructions"),
    input_product_id: inputProduct.id || text(formData, "input_product_id"),
    input_product: inputProduct.name || text(formData, "input_product"),
    input_quantity: optionalNumber(formData, "input_quantity"),
    input_unit: text(formData, "input_unit") || inputProduct.unit || "",
    active: true,
  });

  redirectAfterSave("/admin-kiosko/produccion", result);
}

export async function saveChecklistRecordAction(formData: FormData) {
  const session = await requireAdminPermission("cleaning:create");

  const items = ["item_1", "item_2", "item_3", "item_4"]
    .map((key) => text(formData, key))
    .filter(Boolean);

  const result = await createChecklistRecord({
    record_date: text(formData, "record_date"),
    record_time: text(formData, "record_time"),
    checklist_type: text(formData, "checklist_type"),
    items,
    completed: checkbox(formData, "completed"),
    status: text(formData, "status"),
    observations: text(formData, "observations"),
    responsible: text(formData, "responsible"),
  });
  if (result.ok) {
    await auditAdminAction(session, "checklist_completed", "checklist_record", null, {
      checklistType: text(formData, "checklist_type"),
      completed: checkbox(formData, "completed"),
      status: text(formData, "status"),
    });
  }

  redirectAfterSave("/admin-kiosko/checklists", result);
}

export async function signMonthlyAppccReportAction(formData: FormData) {
  await requireAdminPermission("appcc:manage");

  const year = Number(text(formData, "year"));
  const month = Number(text(formData, "month"));
  const result = await createMonthlySignature({
    year,
    month,
    signed_by: text(formData, "signed_by"),
    signature_note: text(formData, "signature_note"),
  });

  revalidatePath("/admin-kiosko/registros/informe");
  if (result.ok) {
    redirect(`/admin-kiosko/registros/informe?year=${year}&month=${String(month).padStart(2, "0")}&saved=1`);
  }

  const error = encodeURIComponent(result.error.slice(0, 240));
  redirect(`/admin-kiosko/registros/informe?year=${year}&month=${String(month).padStart(2, "0")}&error=${error}`);
}

export async function saveChecklistOpeningAction(formData: FormData) {
  const session = await requireAdminPermission("cleaning:create");

  const checks = [
    "Arcón frío correcto",
    "Arcón congelador correcto",
    "Lavamanos operativo",
    "Productos etiquetados",
    "Limpieza realizada",
    "Termómetros revisados",
    "Sin incidencias",
  ];
  const items = checks.filter((_, index) => checkboxValue(formData, `check_${index}`));
  const result = await createChecklistRecord({
    record_date: text(formData, "record_date"),
    record_time: text(formData, "record_time"),
    checklist_type: "Apertura APPCC",
    items,
    completed: items.length === checks.length,
    status: items.length === checks.length ? "correcto" : "revisar",
    observations: text(formData, "observations"),
    responsible: text(formData, "responsible"),
  });
  if (result.ok) {
    await auditAdminAction(session, "checklist_opening_completed", "checklist_record", null, {
      completed: items.length === checks.length,
      status: items.length === checks.length ? "correcto" : "revisar",
    });
  }

  redirectAfterSave("/admin-kiosko/checklists/apertura", result);
}

export async function saveChecklistClosingAction(formData: FormData) {
  const session = await requireAdminPermission("cleaning:create");

  const checks = [
    "Basura retirada",
    "Superficies desinfectadas",
    "Arcón frío cerrado",
    "Freidoras apagadas",
    "Productos almacenados",
    "Incidencias registradas",
  ];
  const items = checks.filter((_, index) => checkboxValue(formData, `check_${index}`));
  const result = await createChecklistRecord({
    record_date: text(formData, "record_date"),
    record_time: text(formData, "record_time"),
    checklist_type: "Cierre APPCC",
    items,
    completed: items.length === checks.length,
    status: items.length === checks.length ? "correcto" : "revisar",
    observations: text(formData, "observations"),
    responsible: text(formData, "responsible"),
  });
  if (result.ok) {
    await auditAdminAction(session, "checklist_closing_completed", "checklist_record", null, {
      completed: items.length === checks.length,
      status: items.length === checks.length ? "correcto" : "revisar",
    });
  }

  redirectAfterSave("/admin-kiosko/checklists/cierre", result);
}

export async function saveInspectionRecordAction(formData: FormData) {
  await requireAdminPermission("appcc:manage");

  const result = await createInspectionRecord({
    inspection_date: text(formData, "inspection_date"),
    inspector: text(formData, "inspector"),
    organization: text(formData, "organization"),
    result: text(formData, "result"),
    observations: text(formData, "observations"),
    requirements: text(formData, "requirements"),
    deadline: text(formData, "deadline"),
    status: text(formData, "status"),
    actions_done: text(formData, "actions_done"),
    responsible: text(formData, "responsible"),
    documentation: text(formData, "documentation"),
  });

  await redirectAfterSaveWithEvent("/admin-kiosko/inspecciones", result, () => emitDomainEventSafe(createDomainEvent("InspectionRecordCreated", {
    source: "inspection",
    payload: {
      inspectionDate: text(formData, "inspection_date"),
      result: text(formData, "result"),
    },
  })));
}

export async function saveSupplierRecordAction(formData: FormData) {
  await requireAdminPermission("settings:manage");

  const result = await createSupplierRecord({
    supplier: text(formData, "supplier"),
    cif: text(formData, "cif"),
    status: text(formData, "status") || "pendiente_datos_administrativos",
    contact: text(formData, "contact"),
    phone: text(formData, "phone"),
    email: text(formData, "email"),
    responsible_person: text(formData, "responsible_person"),
    schedule: text(formData, "schedule"),
    usual_products: text(formData, "usual_products"),
    category: text(formData, "category"),
    certificates: text(formData, "certificates"),
    health_register: text(formData, "health_register"),
    appcc: text(formData, "appcc"),
    invoices: text(formData, "invoices"),
    delivery_notes: text(formData, "delivery_notes"),
    ocr_documents: text(formData, "ocr_documents"),
    receptions: text(formData, "receptions"),
    incidents: text(formData, "incidents"),
    reception_temperatures: text(formData, "reception_temperatures"),
    ai_history: text(formData, "ai_history"),
    observations: text(formData, "observations"),
  });

  await redirectAfterSaveWithEvent("/admin-kiosko/proveedores", result, () => emitDomainEventSafe(createDomainEvent("SupplierCreated", {
    source: "appcc",
    payload: {
      name: text(formData, "supplier"),
      taxId: text(formData, "cif"),
      status: text(formData, "status") || "pendiente_datos_administrativos",
    },
  })));
}

export async function saveInventoryProductAction(formData: FormData) {
  await requireAdminPermission("inventory:manage");

  const id = text(formData, "id");
  const payload = {
    id,
    name: text(formData, "name"),
    category: text(formData, "category"),
    usual_supplier: text(formData, "usual_supplier"),
    unit: text(formData, "unit") || "ud",
    current_stock: requiredNumber(formData, "current_stock"),
    minimum_stock: requiredNumber(formData, "minimum_stock"),
    recommended_stock: requiredNumber(formData, "recommended_stock"),
    last_purchase_price: requiredNumber(formData, "last_purchase_price"),
    average_purchase_price: requiredNumber(formData, "last_purchase_price"),
    location: text(formData, "location"),
    current_batch: text(formData, "current_batch"),
    expiry_date: text(formData, "expiry_date"),
    observations: text(formData, "observations"),
    active: formData.get("active") !== "false",
  };
  const result = id ? await updateInventoryProduct(payload) : await createInventoryProduct(payload);

  ["/admin-kiosko/inventario", "/admin-kiosko", "/admin-kiosko/inspeccion-express"].forEach((path) => revalidatePath(path));
  redirectAfterSave("/admin-kiosko/inventario", result);
}

export type IngredientPrintState = {
  ok: boolean;
  message: string;
  jobId?: string;
  status?: string;
} | null;

function printIngredientErrorMessage(error: string) {
  if (/no puede superar|necesita|obligatorio|Template no soportado/i.test(error)) {
    return error;
  }

  if (/Supabase|configur|No se pudo crear/i.test(error)) {
    return "No se pudo crear el trabajo de impresión. Revisa la configuración de impresión del servidor.";
  }

  return "No se pudo enviar la etiqueta a impresión. Revisa el producto y vuelve a intentarlo.";
}

export async function printIngredientLabelAction(_previousState: IngredientPrintState, formData: FormData): Promise<IngredientPrintState> {
  await requireAdminPermission("labels:basic_print");

  const productId = text(formData, "product_id");
  if (!productId) {
    return { ok: false, message: "Falta el ingrediente/materia prima." };
  }

  const productResult = await getInventoryProductById(productId);
  if (!productResult.ok) {
    console.error("[INGREDIENT LABEL PRODUCT ERROR]", {
      productId,
      error: productResult.error,
    });
    return { ok: false, message: "No se pudo cargar el ingrediente para imprimir." };
  }

  if (!productResult.data) {
    return { ok: false, message: "Ingrediente no encontrado." };
  }

  const product = productResult.data;
  if (!product.name?.trim()) {
    return { ok: false, message: "El producto no tiene nombre imprimible." };
  }

  const printResult = await printService.printLabel({
    printerKey: DEFAULT_GODEX_G500_PRINTER_KEY,
    template: "ingredient_label_basic",
    data: {
      ingredientName: product.name,
      supplierName: product.usual_supplier || undefined,
      lot: product.current_batch || undefined,
      expiryDate: product.expiry_date || undefined,
    },
    metadata: {
      requestedBy: text(formData, "requested_by") || "admin-kiosko",
      module: "ingredients",
      sourceType: "ingredient",
      sourceId: product.id,
      createdFrom: "erp_ui",
      reason: "print_ingredient_label",
    },
  });

  if (!printResult.ok) {
    return { ok: false, message: printIngredientErrorMessage(printResult.error) };
  }

  revalidatePath("/admin-kiosko/inventario");
  return {
    ok: true,
    message: "Etiqueta enviada a GoDEX.",
    jobId: printResult.data.id,
    status: printResult.data.status,
  };
}

export type PrepPrintState = {
  ok: boolean;
  message: string;
  jobId?: string;
  status?: string;
} | null;

function printPrepErrorMessage(error: string) {
  if (/no puede superar|necesita|obligatorio|Template no soportado|fecha|caducidad|elaboracion|shelfLifeDays/i.test(error)) {
    return error;
  }

  if (/Supabase|configur|No se pudo crear/i.test(error)) {
    return "No se pudo crear el trabajo de impresion. Revisa la configuracion de impresion del servidor.";
  }

  return "No se pudo enviar la etiqueta de preparacion. Revisa los datos y vuelve a intentarlo.";
}

export async function printPrepLabelAction(_previousState: PrepPrintState, formData: FormData): Promise<PrepPrintState> {
  await requireAdminPermission("labels:basic_print");

  const prepName = text(formData, "prepName");
  const productionDateTime = text(formData, "productionDateTime");
  const expiryDateTime = text(formData, "expiryDateTime");
  const shelfLifeDays = optionalNumber(formData, "shelfLifeDays");
  const template = text(formData, "template") === "prep_label_basic" ? "prep_label_basic" : "prep_label_professional";
  const batchCode = text(formData, "batchCode") || generatePrepBatchCode(prepName);
  const responsibleName = text(formData, "responsibleName");
  const storageCondition = text(formData, "storageCondition") || "Refrigerado 0-4 C";
  const copies = Math.max(1, Math.min(8, Math.round(requiredNumber(formData, "copies") || 1)));

  if (!prepName) {
    return { ok: false, message: "Indica el nombre de la preparacion." };
  }

  const printResult = await labelEventService.requestPrepManualLabel({
    template,
    prepName,
    productionDateTime: productionDateTime || undefined,
    expiryDateTime: expiryDateTime || undefined,
    shelfLifeDays,
    batchCode,
    responsibleName: responsibleName || undefined,
    storageCondition,
    requestedBy: text(formData, "requestedBy") || "admin-kiosko",
    reason: template === "prep_label_basic" ? "print_prep_label_basic" : "print_prep_label",
    copies,
  });

  if (!printResult.ok) {
    return { ok: false, message: printPrepErrorMessage(printResult.error) };
  }

  await emitPrintJobCreatedEvent({
    printJobId: printResult.data.id,
    printerKey: printResult.data.printer_key,
    template: typeof printResult.data.payload.template === "string" ? printResult.data.payload.template : undefined,
    sourceType: "prep_batch",
    sourceId: batchCode,
    reason: "print_prep_label",
    correlationId: batchCode,
  });

  revalidatePath("/admin-kiosko/etiquetas-prep");
  return {
    ok: true,
    message: "Etiqueta enviada a la cola de impresión.",
    jobId: printResult.data.id,
    status: printResult.data.status,
  };
}

export type ReprintPrintJobState = {
  ok: boolean;
  message: string;
  jobId?: string;
  status?: string;
} | null;

function printJobPayloadRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function printJobPayloadText(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "string" ? value.trim() : "";
}

function isReprintCompatiblePayload(payload: Record<string, unknown>) {
  return Boolean(
    printJobPayloadText(payload, "title")
    && typeof payload.line1 === "string"
    && typeof payload.line2 === "string"
    && printJobPayloadText(payload, "template")
    && payload.data
    && typeof payload.data === "object"
    && !Array.isArray(payload.data)
    && payload.metadata
    && typeof payload.metadata === "object"
    && !Array.isArray(payload.metadata),
  );
}

export async function reprintPrintJobAction(_previousState: ReprintPrintJobState, formData: FormData): Promise<ReprintPrintJobState> {
  await requireAdminPermission("print:manage");

  const jobId = text(formData, "job_id");
  const reprintReason = text(formData, "reprint_reason");
  if (!jobId) {
    return { ok: false, message: "Falta el job original." };
  }
  if (reprintReason.length < 6) {
    return { ok: false, message: "Indica un motivo de reimpresión claro." };
  }

  const original = await getPrintJobById(jobId);
  if (!original.ok) {
    console.error("[PRINT JOB REPRINT LOAD ERROR]", { jobId, error: original.error });
    return { ok: false, message: "No se pudo cargar el job original." };
  }

  if (!original.data) {
    return { ok: false, message: "Job original no encontrado." };
  }

  const payload = printJobPayloadRecord(original.data.payload);
  if (!isReprintCompatiblePayload(payload)) {
    return { ok: false, message: "Este job no tiene payload compatible para reimprimir." };
  }

  const reprintRequestId = text(formData, "reprint_request_id") || crypto.randomUUID();
  const reprintPayload = buildReprintPayload(payload, original.data.id, reprintReason, reprintRequestId);
  if (!reprintPayload) {
    return { ok: false, message: "Indica un motivo de reimpresión claro." };
  }

  const result = await enqueuePrintJob({
    printerKey: original.data.printer_key,
    payload: reprintPayload,
  });

  if (!result.ok) {
    console.error("[PRINT JOB REPRINT ERROR]", { jobId, error: result.error });
    return { ok: false, message: "No se pudo crear la reimpresión." };
  }

  revalidatePath("/admin-kiosko/impresiones");
  return {
    ok: true,
    message: "Reimpresión encolada. El bridge la enviará a la impresora local.",
    jobId: result.data.id,
    status: result.data.status,
  };
}

export async function saveInventoryMovementAction(formData: FormData) {
  await requireAdminPermission("inventory:manage");

  const movement = text(formData, "movement_type");
  const movementType = ["entrada", "consumo", "merma", "regularizacion", "baja"].includes(movement)
    ? movement as "entrada" | "consumo" | "merma" | "regularizacion" | "baja"
    : "consumo";
  const result = await applyInventoryMovement({
    product_id: text(formData, "product_id"),
    lot_id: text(formData, "lot_id"),
    movement_type: movementType,
    quantity: requiredNumber(formData, "quantity"),
    unit: text(formData, "unit"),
    supplier: text(formData, "supplier"),
    batch_number: text(formData, "batch_number"),
    expiry_date: text(formData, "expiry_date"),
    observations: text(formData, "observations"),
  });

  ["/admin-kiosko/inventario", "/admin-kiosko/trazabilidad", "/admin-kiosko", "/admin-kiosko/inspeccion-express"].forEach((path) => revalidatePath(path));
  await redirectAfterSaveWithEvent("/admin-kiosko/inventario", result, () => emitDomainEventSafe(createDomainEvent(
    movementType === "entrada" ? "InventoryLotCreated" : "InventoryLotConsumed",
    {
      source: "inventory",
      trace: { productId: text(formData, "product_id"), inventoryLotId: text(formData, "lot_id") },
      payload: movementType === "entrada"
        ? {
            inventoryLotId: text(formData, "lot_id") || undefined,
            productId: text(formData, "product_id"),
            productName: text(formData, "product_name") || text(formData, "product_id"),
            batchNumber: text(formData, "batch_number"),
            quantity: requiredNumber(formData, "quantity"),
            unit: text(formData, "unit"),
            expiryDate: text(formData, "expiry_date"),
          }
        : {
            inventoryLotId: text(formData, "lot_id") || undefined,
            productId: text(formData, "product_id"),
            quantity: requiredNumber(formData, "quantity"),
            unit: text(formData, "unit"),
            reason: movementType,
          },
    },
  )));
}

export async function saveInventoryLotReviewAction(formData: FormData) {
  await requireAdminPermission("inventory:manage");

  const expirySource = text(formData, "expiry_source");
  const safeExpirySource = ["real_documentada", "estimada_por_regla", "revisada_manual"].includes(expirySource)
    ? expirySource as "real_documentada" | "estimada_por_regla" | "revisada_manual"
    : "revisada_manual";
  const status = text(formData, "appcc_review_status");
  const safeStatus = ["pendiente_revision", "revisado", "requiere_documentacion"].includes(status)
    ? status as "pendiente_revision" | "revisado" | "requiere_documentacion"
    : "revisado";

  const result = await updateInventoryLotReviewData({
    lotId: text(formData, "lot_id"),
    expiryDate: text(formData, "expiry_date"),
    expirySource: safeExpirySource,
    reviewedBy: text(formData, "reviewed_by") || "F. Javier Bocanegra Sanjuan",
    reviewNotes: text(formData, "review_notes"),
    appccReviewStatus: safeStatus,
  });

  ["/admin-kiosko/inventario", "/admin-kiosko/trazabilidad", "/admin-kiosko", "/admin-kiosko/inspeccion-express"].forEach((path) => revalidatePath(path));
  redirectAfterSave("/admin-kiosko/inventario#lotes-pendientes-revision", result);
}

export async function saveLabelRecordAction(formData: FormData) {
  await requireAdminPermission("labels:basic_print");
  const supplier = await resolveSupplierFromForm(formData);

  const result = await createLabelRecord({
    model: text(formData, "model"),
    product: text(formData, "product"),
    batch: text(formData, "batch"),
    supplier,
    elaboration_date: text(formData, "elaboration_date"),
    opening_date: text(formData, "opening_date"),
    freezing_date: text(formData, "freezing_date"),
    defrosting_date: text(formData, "defrosting_date"),
    best_before_date: text(formData, "best_before_date"),
    responsible: text(formData, "responsible"),
    print_format: text(formData, "print_format"),
    copies: Math.max(1, Math.min(48, Math.round(requiredNumber(formData, "copies") || 8))),
    inventory_lot_id: text(formData, "inventory_lot_id"),
    product_id: text(formData, "product_id"),
    accounting_document_id: text(formData, "accounting_document_id"),
    supplier_document_id: text(formData, "supplier_document_id"),
    uploaded_document_id: text(formData, "uploaded_document_id"),
    label_type: text(formData, "label_type"),
    expiry_source: text(formData, "expiry_source"),
    appcc_review_status: text(formData, "appcc_review_status"),
    review_warning: text(formData, "review_warning"),
  });

  revalidatePath("/admin-kiosko/etiquetas");
  await redirectAfterSaveWithEvent("/admin-kiosko/etiquetas", result, () => emitDomainEventSafe(createDomainEvent("LabelPrinted", {
    source: "labels",
    payload: {
      template: text(formData, "model") || text(formData, "template") || "etiqueta",
      copies: Math.max(1, Math.min(48, Math.round(requiredNumber(formData, "copies") || 8))),
      printer: text(formData, "printer") || "Zebra ZD421",
    },
  })));
}

export async function printGodexLabelAction(_previousState: { ok: boolean; message: string } | null, formData: FormData) {
  await requireAdminPermission("labels:basic_print");

  const copies = Math.max(1, Math.min(8, Math.round(requiredNumber(formData, "copies") || 1)));
  const model = text(formData, "model") || "Etiqueta APPCC";
  const product = text(formData, "product");
  const batch = text(formData, "batch");
  const supplier = text(formData, "supplier_name") || text(formData, "supplier");
  const responsible = text(formData, "responsible") || "F. Javier Bocanegra Sanjuan";
  const productionDateTime = text(formData, "elaboration_date")
    || text(formData, "opening_date")
    || text(formData, "freezing_date")
    || text(formData, "defrosting_date");
  const expiryDateTime = text(formData, "best_before_date");
  const sourceId = text(formData, "inventory_lot_id") || text(formData, "product_id") || batch;
  const sourceType = text(formData, "label_type") || "godex_appcc";

  if (!product || !batch) {
    return { ok: false, message: "La etiqueta necesita producto y lote antes de imprimir en Godex." };
  }

  const printResult = await labelEventService.requestManualGodexLabel({
    product,
    batch,
    model,
    supplier: supplier || text(formData, "storage_temperature") || undefined,
    responsible,
    productionDateTime: productionDateTime || undefined,
    expiryDateTime: expiryDateTime || undefined,
    sourceId,
    sourceType,
    copies,
    requestId: text(formData, "request_id") || crypto.randomUUID(),
  });

  if (!printResult.ok) {
    return { ok: false, message: printResult.error };
  }

  await emitPrintJobCreatedEvent({
    printJobId: printResult.data.id,
    printerKey: printResult.data.printer_key,
    template: typeof printResult.data.payload.template === "string" ? printResult.data.payload.template : undefined,
    sourceType,
    sourceId,
    reason: printResult.decision.reason,
    correlationId: sourceId,
  });

  const queuedTemplate = typeof printResult.data.payload.template === "string"
    ? printResult.data.payload.template
    : godexTemplateFromModel(model);
  const labelResult = await createLabelRecord({
    model,
    product,
    batch,
    supplier,
    elaboration_date: text(formData, "elaboration_date"),
    opening_date: text(formData, "opening_date"),
    freezing_date: text(formData, "freezing_date"),
    defrosting_date: text(formData, "defrosting_date"),
    best_before_date: text(formData, "best_before_date"),
    responsible,
    print_format: "termica",
    copies,
    printer: "Godex G500",
    template: queuedTemplate,
    zpl_version: "EZPL",
    inventory_lot_id: text(formData, "inventory_lot_id"),
    product_id: text(formData, "product_id"),
    accounting_document_id: text(formData, "accounting_document_id"),
    supplier_document_id: text(formData, "supplier_document_id"),
    uploaded_document_id: text(formData, "uploaded_document_id"),
    label_type: text(formData, "label_type") || "godex_appcc",
    expiry_source: text(formData, "expiry_source"),
    appcc_review_status: text(formData, "appcc_review_status"),
    review_warning: text(formData, "review_warning"),
  });
  if (!labelResult.ok) {
    console.error("[GODEX PRINT HISTORY ERROR]", labelResult.error);
  }

  await emitDomainEventSafe(createDomainEvent("LabelPrinted", {
    source: "labels",
    trace: {
      inventoryLotId: text(formData, "inventory_lot_id"),
      documentId: text(formData, "uploaded_document_id"),
    },
    payload: {
      template: model,
      copies,
      printer: "Godex G500",
      inventoryLotId: text(formData, "inventory_lot_id"),
    },
  }));

  revalidatePath("/admin-kiosko/etiquetas");
  return {
    ok: true,
    message: `Etiqueta encolada para GoDEX · trabajo ${printResult.data.id}. No confirma salida física del papel.`,
  };
}

export async function registerPalomitasTraceabilitySplitAction(formData: FormData) {
  await requireAdminPermission("traceability:manage");

  const lotId = text(formData, "parent_lot_id");
  const result = await palomitasTraceabilityService.registerSplit({
    parentLotId: lotId,
    responsible: text(formData, "responsible") || "F. Javier Bocanegra Sanjuan",
    registerDate: text(formData, "register_date"),
  });

  [
    "/admin-kiosko/trazabilidad/palomitas-017843",
    "/admin-kiosko/trazabilidad",
    "/admin-kiosko/inventario",
    "/admin-kiosko/etiquetas",
  ].forEach((path) => revalidatePath(path));

  if (!result.ok) {
    redirect(`/admin-kiosko/trazabilidad/palomitas-017843?lot=${encodeURIComponent(lotId)}&error=${encodeURIComponent(result.error.slice(0, 240))}`);
  }

  redirect(`/admin-kiosko/trazabilidad/palomitas-017843?lot=${encodeURIComponent(result.data.parentLot.id)}&split=ok`);
}

export async function printPalomitasTraceabilityLabelAction(_previousState: { ok: boolean; message: string } | null, formData: FormData) {
  await requireAdminPermission("print:manage");

  const variant = text(formData, "variant") as PalomitasLabelVariant;
  if (variant !== "defrosting" && variant !== "frozen") {
    return { ok: false, message: "Tipo de etiqueta no valido." };
  }

  const result = await palomitasTraceabilityService.queueLabel({
    parentLotId: text(formData, "parent_lot_id"),
    variant,
    responsible: text(formData, "responsible") || "F. Javier Bocanegra Sanjuan",
    requestId: text(formData, "request_id") || crypto.randomUUID(),
  });
  if (!result.ok) return { ok: false, message: result.error };

  await emitPrintJobCreatedEvent({
    printJobId: result.data.printJob.id,
    printerKey: result.data.printJob.printer_key,
    template: "appcc_traceability_80x50",
    sourceType: "palomitas_traceability_split",
    sourceId: result.data.label.inventoryLotId,
    reason: result.data.label.variant === "defrosting" ? "print_defrosting_use_label" : "print_frozen_reserve_label",
    correlationId: result.data.label.parentLotId,
  });

  await emitDomainEventSafe(createDomainEvent("LabelPrinted", {
    source: "labels",
    trace: {
      inventoryLotId: result.data.label.inventoryLotId,
      productId: result.data.label.productId,
    },
    payload: {
      template: "appcc_traceability_80x50",
      copies: 1,
      printer: "Godex G500",
      inventoryLotId: result.data.label.inventoryLotId,
    },
  }));

  revalidatePath("/admin-kiosko/trazabilidad/palomitas-017843");
  revalidatePath("/admin-kiosko/impresiones");
  revalidatePath("/admin-kiosko/etiquetas");

  return {
    ok: true,
    message: `Etiqueta ${variant === "defrosting" ? "A" : "B"} encolada para GoDEX · trabajo ${result.data.printJob.id}.`,
  };
}

export async function printFreezerInventory20260708LabelsAction(_previousState: { ok: boolean; message: string } | null, formData: FormData) {
  await requireAdminPermission("print:manage");

  const scope = text(formData, "scope");
  if (scope !== "apt" && scope !== "review_or_quarantine") {
    return { ok: false, message: "Grupo de etiquetas no valido." };
  }

  const result = await freezerInventory20260708Service.queueLabels({
    scope,
    requestId: text(formData, "request_id") || crypto.randomUUID(),
  });
  if (!result.ok) return { ok: false, message: result.error };

  for (const job of result.data.queued) {
    await emitPrintJobCreatedEvent({
      printJobId: job.id,
      printerKey: job.printer_key,
      template: "freezer_inventory_80x50",
      sourceType: "freezer_inventory_20260708",
      sourceId: typeof job.payload?.metadata === "object" && job.payload.metadata && "sourceId" in job.payload.metadata ? String(job.payload.metadata.sourceId || "") : undefined,
      reason: scope === "apt" ? "print_freezer_accepted_labels" : "print_freezer_review_quarantine_labels",
      correlationId: "FRZ-20260708",
    });
  }

  await emitDomainEventSafe(createDomainEvent("LabelPrinted", {
    source: "labels",
    trace: { caseId: "FRZ-20260708" },
    payload: {
      template: "freezer_inventory_80x50",
      copies: result.data.queued.length,
      printer: "Godex G500",
    },
  }));

  revalidatePath("/admin-kiosko/trazabilidad/inventario-congelado-20260708");
  revalidatePath("/admin-kiosko/impresiones");
  revalidatePath("/admin-kiosko/etiquetas");

  return {
    ok: true,
    message: `${result.data.queued.length} etiquetas encoladas para GoDEX (${scope === "apt" ? "aptas" : "revision/cuarentena"}).`,
  };
}

const MAKRO_RECEPTION_202607_PATH = "/admin-kiosko/recepcion/makro-20260704-20260706";

function revalidateMakroReception202607Paths() {
  [
    MAKRO_RECEPTION_202607_PATH,
    "/admin-kiosko/compras",
    "/admin-kiosko/inventario",
    "/admin-kiosko/trazabilidad",
    "/admin-kiosko/etiquetas",
    "/admin-kiosko/impresiones",
  ].forEach((path) => revalidatePath(path));
}

export async function registerMakroReception202607Action(formData: FormData) {
  void formData;
  await requireAdminPermission("goods_reception:advanced_create");

  const result = await makroReception202607Service.registerReception();
  revalidateMakroReception202607Paths();

  if (!result.ok) {
    redirect(`${MAKRO_RECEPTION_202607_PATH}?error=${encodeURIComponent(result.error.slice(0, 240))}`);
  }

  await emitDomainEventSafe(createDomainEvent("GoodsReceived", {
    source: "appcc",
    correlationId: "makro-20260704-20260706",
    trace: { caseId: "makro-20260704-20260706" },
    payload: {
      supplierName: "Makro",
      receivedBy: "F. Javier Bocanegra Sanjuan",
      idempotencyKey: "makro-20260704-20260706",
      items: makroReception202607Service.receptionItems.map((item) => ({
        productName: item.productName,
        batchNumber: item.supplierLot,
        quantity: item.quantity,
        unit: item.unit,
      })),
    },
  }));

  redirect(`${MAKRO_RECEPTION_202607_PATH}?reception=ok&created=${result.data.createdLots}&existing=${result.data.existingLots}`);
}

export async function registerMakroOpenings202607Action(formData: FormData) {
  await requireAdminPermission("traceability:manage");

  const result = await makroReception202607Service.registerOpenings({
    operativeDate: text(formData, "operative_date") || todayMadrid(),
    operativeTime: text(formData, "operative_time") || timeMadrid(),
    responsible: text(formData, "responsible") || "F. Javier Bocanegra Sanjuan",
  });
  revalidateMakroReception202607Paths();

  if (!result.ok) {
    redirect(`${MAKRO_RECEPTION_202607_PATH}?error=${encodeURIComponent(result.error.slice(0, 240))}`);
  }

  await emitDomainEventSafe(createDomainEvent("LabelPrepared", {
    source: "labels",
    correlationId: "makro-openings-20260708",
    trace: { caseId: "makro-20260704-20260706" },
    payload: {
      productName: "Aperturas Makro 04/07 y 06/07",
      batchNumber: "makro-openings-20260708",
      template: "makro_opening_80x50",
    },
  }));

  redirect(`${MAKRO_RECEPTION_202607_PATH}?openings=ok`);
}

export async function registerMakroChickenMarinade202607Action(formData: FormData) {
  await requireAdminPermission("traceability:manage");

  const operativeDate = text(formData, "operative_date") || todayMadrid();
  const result = await makroReception202607Service.registerChickenTransformation({
    operativeDate,
    operativeTime: text(formData, "operative_time") || timeMadrid(),
    responsible: text(formData, "responsible") || "F. Javier Bocanegra Sanjuan",
    quantity: optionalNumber(formData, "quantity") || 1.846,
  });
  revalidateMakroReception202607Paths();

  if (!result.ok) {
    redirect(`${MAKRO_RECEPTION_202607_PATH}?error=${encodeURIComponent(result.error.slice(0, 240))}`);
  }

  await emitDomainEventSafe(createDomainEvent("ProductionBatchCreated", {
    source: "production",
    correlationId: "makro-pollo-marinado-26002392",
    trace: { caseId: "makro-20260704-20260706" },
    payload: {
      productionBatchId: "MAK-003314013-POLLO-MARINADO",
      batchCode: "MAK-003314013-POLLO-MARINADO",
      outputProduct: "POLLO CONTRAMUSLO MARINADO",
      outputQuantity: optionalNumber(formData, "quantity") || 1.846,
      outputUnit: "kg",
    },
  }));

  redirect(`${MAKRO_RECEPTION_202607_PATH}?marinade=ok`);
}

export async function printMakroReception202607LabelsAction(_previousState: { ok: boolean; message: string } | null, formData: FormData) {
  await requireAdminPermission("print:manage");

  const keys = formData.getAll("label_key").map(String).filter(Boolean);
  if (!keys.length) return { ok: false, message: "Selecciona al menos una etiqueta." };

  const result = await makroReception202607Service.queueLabels({
    keys,
    operativeDate: text(formData, "operative_date") || todayMadrid(),
    operativeTime: text(formData, "operative_time") || timeMadrid(),
    responsible: text(formData, "responsible") || "F. Javier Bocanegra Sanjuan",
    requestId: text(formData, "request_id") || crypto.randomUUID(),
  });
  if (!result.ok) return { ok: false, message: result.error };

  for (const job of result.data.queued) {
    await emitPrintJobCreatedEvent({
      printJobId: job.id,
      printerKey: job.printer_key,
      template: "makro_goods_reception_80x50",
      sourceType: "makro_reception_202607",
      sourceId: typeof job.payload?.metadata === "object" && job.payload.metadata && "sourceId" in job.payload.metadata ? String(job.payload.metadata.sourceId || "") : undefined,
      reason: "manual_print_makro_label",
      correlationId: "makro-20260704-20260706",
    });
  }

  await emitDomainEventSafe(createDomainEvent("LabelPrinted", {
    source: "labels",
    trace: { caseId: "makro-20260704-20260706" },
    payload: {
      template: "makro_goods_reception_80x50",
      copies: result.data.queued.length,
      printer: "Godex G500",
    },
  }));

  revalidateMakroReception202607Paths();

  return {
    ok: true,
    message: `${result.data.queued.length} etiqueta(s) Makro encolada(s) para GoDEX. No confirma salida física del papel.`,
  };
}

export async function saveEquipmentAssetAction(formData: FormData) {
  await requireAdminPermission("settings:manage");

  const result = await createEquipmentAsset({
    name: text(formData, "name"),
    brand: text(formData, "brand"),
    model: text(formData, "model"),
    serial_number: text(formData, "serial_number"),
    purchase_date: text(formData, "purchase_date"),
    installation_date: text(formData, "installation_date"),
    location: text(formData, "location"),
    last_maintenance: text(formData, "last_maintenance"),
    next_maintenance: text(formData, "next_maintenance"),
    fault_history: text(formData, "fault_history"),
    status: text(formData, "status"),
  });

  redirectAfterSave("/admin-kiosko/equipos", result);
}

export async function saveMaintenanceRecordAction(formData: FormData) {
  await requireAdminPermission("appcc:manage");

  const result = await createMaintenanceRecord({
    record_date: text(formData, "record_date"),
    equipment: text(formData, "equipment"),
    intervention: text(formData, "intervention"),
    company: text(formData, "company"),
    invoice: text(formData, "invoice"),
    observations: text(formData, "observations"),
    responsible: text(formData, "responsible"),
  });

  redirectAfterSave("/admin-kiosko/mantenimiento", result);
}

export async function saveWaterRecordAction(formData: FormData) {
  await requireAdminPermission("appcc:manage");

  const result = await createWaterRecord({
    record_date: text(formData, "record_date"),
    color: text(formData, "color"),
    smell: text(formData, "smell"),
    taste: text(formData, "taste"),
    chlorine: text(formData, "chlorine"),
    observations: text(formData, "observations"),
    responsible: text(formData, "responsible"),
  });

  await redirectAfterSaveWithEvent("/admin-kiosko/agua", result, () => emitDomainEventSafe(createDomainEvent("WaterControlRecorded", {
    source: "appcc",
    payload: {
      recordDate: text(formData, "record_date"),
      status: text(formData, "status") || text(formData, "chlorine") || "registrado",
    },
  })));
}

export async function saveAnnualVerificationAction(formData: FormData) {
  await requireAdminPermission("appcc:manage");

  const result = await createAnnualVerification({
    record_date: text(formData, "record_date"),
    appcc_reviewed: checkboxValue(formData, "appcc_reviewed"),
    health_memory_reviewed: checkboxValue(formData, "health_memory_reviewed"),
    allergens_reviewed: checkboxValue(formData, "allergens_reviewed"),
    suppliers_reviewed: checkboxValue(formData, "suppliers_reviewed"),
    cleaning_products_reviewed: checkboxValue(formData, "cleaning_products_reviewed"),
    equipment_reviewed: checkboxValue(formData, "equipment_reviewed"),
    handler_training: checkboxValue(formData, "handler_training"),
    documentation_complete: checkboxValue(formData, "documentation_complete"),
    observations: text(formData, "observations"),
    responsible: text(formData, "responsible"),
  });

  redirectAfterSave("/admin-kiosko/verificacion-anual", result);
}
