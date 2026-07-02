import "server-only";

import { getOpenAiServerConfig, OcrProcessingError } from "@/lib/ai/openai";
import { renderPdfToImages } from "@/lib/ai/pdf";
import { runAppccOcr } from "@/lib/ai/ocr";
import type { OcrExtractorKind, OcrProduct, OcrResultData, OcrUploadResult } from "@/lib/ai/types";
import { createDomainEvent, emitDomainEventSafe } from "@/lib/admin-kiosko/domain";
import { normalizeDocumentType } from "@/lib/admin-kiosko/domain/document-types";
import type {
  DocumentClassifiedPayload,
  InboxDocumentClassifiedPayload,
  InboxNeedsReviewPayload,
  InboxOcrCompletedPayload,
  InboxOcrFailedPayload,
  InboxOcrStartedPayload,
} from "@/lib/admin-kiosko/domain/events";
import type { InboxDocumentType } from "@/lib/admin-kiosko/inbox";
import {
  downloadInboxDocumentOriginal,
  listInboxOcrDocumentsByIds,
  listInboxOcrQueue,
  markInboxOcrFailed,
  markInboxOcrStarted,
  saveInboxOcrResult,
} from "@/lib/admin-kiosko/repositories/inbox.repository";
import type { InboxOcrBatchResult, InboxOcrQueueDocument, InboxOcrStructuredResult } from "./contracts";

type DbResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const highConfidence = 0.86;
const mediumConfidence = 0.65;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function mapInboxTypeToOcrKind(type?: InboxDocumentType): OcrExtractorKind {
  const canonical = normalizeDocumentType(type);
  if (canonical === "purchase_invoice" || canonical === "credit_note" || canonical === "accounting_document") return "factura";
  if (canonical === "purchase_delivery_note" || canonical === "receipt") return "albaran";
  if (canonical === "supplier_traceability_label" || canonical === "traceability_label") return "etiqueta";
  if (canonical === "technical_sheet" || canonical === "sanitary_document" || canonical === "appcc_document" || canonical === "maintenance_document" || canonical === "supplier_contract" || canonical === "training_document") return "certificado";
  return "clasificacion";
}

function mapAiTypeToInboxType(type: string): InboxDocumentType {
  const normalized = normalize(type);
  if (normalized === "factura") return "purchase_invoice";
  if (normalized === "albaran") return "purchase_delivery_note";
  if (normalized === "ticket") return "receipt";
  if (normalized === "etiqueta_lote") return "supplier_traceability_label";
  if (normalized === "ficha_tecnica") return "technical_sheet";
  if (normalized === "mantenimiento") return "maintenance_document";
  if (normalized === "contrato_ddd") return "supplier_contract";
  if (normalized === "certificado_manipulador") return "training_document";
  if (["certificado_ddd", "boletin_sanitario", "analisis_agua"].includes(normalized)) return "sanitary_document";
  if (normalized === "memoria_sanitaria" || normalized === "appcc") return "appcc_document";
  return "other";
}

function extractProducts(result: OcrResultData): OcrProduct[] {
  if ("productos" in result && Array.isArray(result.productos)) return result.productos;
  return [];
}

function extractCorrections(result: OcrUploadResult) {
  const data = result.result;
  const products = extractProducts(data);

  if ("proveedor" in data) {
    return {
      supplier: text(data.proveedor),
      supplier_tax_id: "cif" in data ? text(data.cif) : "",
      document_date: "fecha" in data ? text(data.fecha) : "",
      document_number: "numero" in data ? text(data.numero) : "",
      taxable_base: "base_imponible" in data ? text(data.base_imponible) : "",
      vat_amount: "iva" in data ? text(data.iva) : "",
      total_amount: "total" in data ? text(data.total) : "",
      products: products.map((product) => product.nombre).filter(Boolean).join(", "),
      product_lines: products,
      batch_number: products.map((product) => product.lote).filter(Boolean)[0] || "",
      expiry_date: products.map((product) => product.caducidad).filter(Boolean)[0] || "",
      temperature: "temperaturas" in data && Array.isArray(data.temperaturas) ? data.temperaturas.join(", ") : "",
      observations: "observaciones" in data ? text(data.observaciones) : "",
    };
  }

  if ("producto" in data) {
    return {
      product: text(data.producto),
      products: text(data.producto),
      batch_number: "lote" in data ? text(data.lote) : "",
      expiry_date: "caducidad" in data ? text(data.caducidad) : "",
      production_date: "fecha_fabricacion" in data ? text(data.fecha_fabricacion) : "",
    };
  }

  if ("tipo_detectado" in data) {
    return {
      document_type: text(data.tipo_detectado),
      holder: text(data.titular),
      issuer: text(data.entidad),
      document_date: text(data.fecha),
      expiry_date: text(data.caducidad),
      observations: text(data.observaciones),
    };
  }

  if ("kind" in data) {
    return {
      document_type: text(data.kind),
      observations: text(data.summary),
    };
  }

  return {};
}

function isPerishableProduct(productName: string) {
  return /(pollo|carne|cerdo|vaca|ternera|huevo|queso|leche|l[aá]ct|nata|creme|pescado|marisco|congel|refriger|tomate|lechuga|verdura|patata|cebolla|fruta|york|bacon|lomo|croqueta)/i.test(productName);
}

function sanitaryWarnings(result: OcrUploadResult, detectedType: InboxDocumentType) {
  const warnings: string[] = [];
  const data = result.result;
  const products = extractProducts(data);
  const hasPerishable = products.some((product) => isPerishableProduct(product.nombre));

  for (const product of products) {
    if (!isPerishableProduct(product.nombre)) continue;
    if (!text(product.lote)) warnings.push(`Producto perecedero sin lote visible: ${product.nombre}`);
    if (!text(product.caducidad)) warnings.push(`Producto perecedero sin caducidad visible: ${product.nombre}`);
  }

  if ((detectedType === "purchase_delivery_note" || detectedType === "receipt") && hasPerishable && "temperaturas" in data && Array.isArray(data.temperaturas) && !data.temperaturas.length) {
    warnings.push("Recepción con productos perecederos sin temperatura visible.");
  }

  if (detectedType === "technical_sheet") {
    const raw = JSON.stringify(data).toLowerCase();
    if (!/(al[eé]rgeno|gluten|huevo|leche|l[aá]cteo|soja|sulfito|fruto seco|pescado|crust[aá]ceo)/i.test(raw)) {
      warnings.push("Ficha técnica sin alérgenos claros.");
    }
  }

  if ((detectedType === "sanitary_document" || detectedType === "appcc_document") && "caducidad" in data) {
    const expiry = text(data.caducidad);
    const expiryDate = expiry ? new Date(expiry) : null;
    if (expiryDate && Number.isFinite(expiryDate.getTime())) {
      const days = Math.ceil((expiryDate.getTime() - Date.now()) / 86_400_000);
      if (days <= 30) warnings.push(`Documento sanitario con vencimiento próximo: ${expiry}`);
    }
  }

  return Array.from(new Set(warnings));
}

function confidenceForResult(result: OcrUploadResult, kind: OcrExtractorKind, warnings: string[]) {
  if ("confidence" in result.result && typeof result.result.confidence === "number") return result.result.confidence;
  if (warnings.length) return 0.72;
  if (kind === "clasificacion") return 0.58;
  return 0.9;
}

function classificationReason(result: OcrUploadResult, warnings: string[]) {
  const base = "OCR OpenAI Vision ejecutado desde bandeja documental.";
  if (warnings.length) return `${base} Requiere revisión APPCC: ${warnings.slice(0, 3).join(" · ")}.`;
  if ("summary" in result.result && text(result.result.summary)) return text(result.result.summary);
  return base;
}

async function renderInputForOcr(document: InboxOcrQueueDocument, buffer: Buffer) {
  if (document.mimeType === "application/pdf") {
    const pages = await renderPdfToImages({ data: buffer });
    return { pages };
  }

  return {
    base64: buffer.toString("base64"),
  };
}

async function runInboxOcr(document: InboxOcrQueueDocument): Promise<InboxOcrStructuredResult> {
  const original = await downloadInboxDocumentOriginal(document);
  if (!original.ok) throw new OcrProcessingError(original.error, "storage_download", 500);

  const requestedType = document.selectedType || document.detectedType || document.confirmedType;
  const kind = mapInboxTypeToOcrKind(requestedType);
  const input = await renderInputForOcr(document, original.data);
  const result = await runAppccOcr({
    kind,
    filename: document.filename,
    mimeType: document.mimeType,
    ...input,
  });
  const detectedType = mapAiTypeToInboxType(result.detectedType);
  const warnings = sanitaryWarnings(result, detectedType);
  const confidence = confidenceForResult(result, kind, warnings);
  const status = confidence >= highConfidence && !warnings.length ? "classified" : "needs_review";
  const model = getOpenAiServerConfig()?.model;

  return {
    uploadedDocumentId: document.uploadedDocumentId,
    detectedType,
    confidence,
    classificationSource: "openai_vision_batch",
    classificationReason: classificationReason(result, warnings),
    corrections: extractCorrections(result),
    ocrJson: {
      documentName: result.documentName,
      requestedKind: result.requestedKind,
      detectedType: result.detectedType,
      result: result.result,
      pages: result.pages,
    },
    warnings,
    status: confidence < mediumConfidence ? "needs_review" : status,
    rawText: result.rawOpenAIText,
    model,
  };
}

type OcrEventPayload =
  | { name: "InboxOcrStarted"; payload: InboxOcrStartedPayload }
  | { name: "InboxOcrCompleted"; payload: InboxOcrCompletedPayload }
  | { name: "InboxOcrFailed"; payload: InboxOcrFailedPayload }
  | { name: "InboxDocumentClassified"; payload: InboxDocumentClassifiedPayload }
  | { name: "InboxNeedsReview"; payload: InboxNeedsReviewPayload }
  | { name: "DocumentClassified"; payload: DocumentClassifiedPayload };

async function emitOcrEvent(document: InboxOcrQueueDocument, event: OcrEventPayload) {
  const base = {
    source: "inbox" as const,
    correlationId: document.uploadedDocumentId,
    trace: { documentId: document.uploadedDocumentId },
  };

  if (event.name === "InboxOcrStarted") await emitDomainEventSafe(createDomainEvent("InboxOcrStarted", { ...base, payload: event.payload }));
  if (event.name === "InboxOcrCompleted") await emitDomainEventSafe(createDomainEvent("InboxOcrCompleted", { ...base, payload: event.payload }));
  if (event.name === "InboxOcrFailed") await emitDomainEventSafe(createDomainEvent("InboxOcrFailed", { ...base, payload: event.payload }));
  if (event.name === "InboxDocumentClassified") await emitDomainEventSafe(createDomainEvent("InboxDocumentClassified", { ...base, payload: event.payload }));
  if (event.name === "InboxNeedsReview") await emitDomainEventSafe(createDomainEvent("InboxNeedsReview", { ...base, payload: event.payload }));
  if (event.name === "DocumentClassified") await emitDomainEventSafe(createDomainEvent("DocumentClassified", { ...base, payload: event.payload }));
}

async function processOneInboxOcrDocument(document: InboxOcrQueueDocument): Promise<InboxOcrBatchResult["results"][number]> {
  if (document.importedAt && !document.status.includes("processing")) {
    return {
      uploadedDocumentId: document.uploadedDocumentId,
      status: "skipped",
      message: "Documento ya importado. No se reprocesa sin acción explícita.",
    };
  }

  const attempt = (document.ocrAttempts || 0) + 1;
  const started = await markInboxOcrStarted(document);
  if (!started.ok) {
    return { uploadedDocumentId: document.uploadedDocumentId, status: "failed", message: started.error };
  }
  await emitOcrEvent(document, {
    name: "InboxOcrStarted",
    payload: {
      uploadedDocumentId: document.uploadedDocumentId,
      attempt,
      mimeType: document.mimeType,
    },
  });

  try {
    const result = await runInboxOcr(document);
    const saved = await saveInboxOcrResult(result);
    if (!saved.ok) throw new OcrProcessingError(saved.error, "ocr_save", 500);

    await emitOcrEvent(document, {
      name: "InboxOcrCompleted",
      payload: {
        uploadedDocumentId: document.uploadedDocumentId,
        detectedType: result.detectedType,
        confidence: result.confidence,
        status: result.status,
        warnings: result.warnings,
      },
    });
    await emitOcrEvent(document, {
      name: "InboxDocumentClassified",
      payload: {
        uploadedDocumentId: document.uploadedDocumentId,
        detectedType: result.detectedType,
        selectedType: result.status === "classified" ? result.detectedType : undefined,
        confidence: result.confidence,
        reason: result.classificationReason,
      },
    });
    await emitOcrEvent(document, {
      name: "DocumentClassified",
      payload: {
        uploadedDocumentId: document.uploadedDocumentId,
        detectedType: result.detectedType,
        confidence: result.confidence,
        model: result.model || "openai_vision_batch",
      },
    });
    if (result.status === "needs_review") {
      await emitOcrEvent(document, {
        name: "InboxNeedsReview",
        payload: {
          uploadedDocumentId: document.uploadedDocumentId,
          reasons: result.warnings.length ? result.warnings : ["Confianza OCR media o baja. Revisión humana obligatoria."],
        },
      });
    }

    return {
      uploadedDocumentId: document.uploadedDocumentId,
      status: result.status,
      message: result.status === "classified" ? "OCR completado con confianza alta." : "OCR completado y pendiente de revisión.",
      warnings: result.warnings,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se ha podido procesar el OCR.";
    await markInboxOcrFailed(document, message);
    await emitOcrEvent(document, {
      name: "InboxOcrFailed",
      payload: {
        uploadedDocumentId: document.uploadedDocumentId,
        error: message,
        attempt,
      },
    });
    return {
      uploadedDocumentId: document.uploadedDocumentId,
      status: "failed",
      message,
    };
  }
}

async function processInboxOcrDocuments(documents: InboxOcrQueueDocument[]): Promise<DbResult<InboxOcrBatchResult>> {
  const results: InboxOcrBatchResult["results"] = [];

  for (const document of documents) {
    results.push(await processOneInboxOcrDocument(document));
  }

  return {
    ok: true,
    data: {
      processed: results.length,
      completed: results.filter((result) => result.status === "classified" || result.status === "needs_review").length,
      failed: results.filter((result) => result.status === "failed").length,
      skipped: results.filter((result) => result.status === "skipped").length,
      results,
    },
  };
}

export async function processPendingInboxOcr(limit = 10): Promise<DbResult<InboxOcrBatchResult>> {
  const queue = await listInboxOcrQueue(limit);
  if (!queue.ok) return queue;
  return processInboxOcrDocuments(queue.data);
}

export async function reprocessInboxOcr(uploadedDocumentIds: string[]): Promise<DbResult<InboxOcrBatchResult>> {
  const documents = await listInboxOcrDocumentsByIds(uploadedDocumentIds);
  if (!documents.ok) return documents;
  return processInboxOcrDocuments(documents.data.filter((document) => document.status !== "imported" && !document.importedAt));
}
