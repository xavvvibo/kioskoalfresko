import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { storeOriginalOcrDocument, updateUploadedDocumentReview } from "@/lib/admin-kiosko/database";
import { isAcceptedDirectImageMimeType, isAcceptedOcrMimeType, isPdfMimeType, runAppccOcr } from "@/lib/ai/ocr";
import { OcrProcessingError, getOpenAiServerConfig } from "@/lib/ai/openai";
import type { AiDocumentKind, OcrExtractorKind, OcrProgressEvent, OcrUploadResult } from "@/lib/ai/types";

export const runtime = "nodejs";

const allowedKinds: OcrExtractorKind[] = [
  "albaran",
  "factura",
  "etiqueta",
  "certificado",
  "termometro",
  "aceite",
  "clasificacion",
];

function isAllowedKind(value: string): value is OcrExtractorKind {
  return allowedKinds.includes(value as OcrExtractorKind);
}

function logOcrError(message: string, detail?: unknown) {
  if (detail) {
    console.error("[OCR ERROR]\n" + message, detail);
    return;
  }

  console.error("[OCR ERROR]\n" + message);
}

function encodeEvent(event: OcrProgressEvent) {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`);
}

function ndjsonError(error: string, status: number) {
  logOcrError(error);
  return new Response(encodeEvent({ type: "error", error }), {
    status,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function errorMessage(error: unknown) {
  if (error instanceof OcrProcessingError) return error.message;
  return error instanceof Error ? error.message : "Unexpected OCR server error";
}

function rawOpenAIText(error: unknown) {
  return error instanceof OcrProcessingError ? error.rawOpenAIText : undefined;
}

function fallbackDetectedType(kind: OcrExtractorKind): AiDocumentKind {
  if (kind === "factura") return "factura";
  if (kind === "albaran") return "albaran";
  if (kind === "etiqueta") return "etiqueta_lote";
  if (kind === "termometro") return "termometro";
  if (kind === "aceite") return "aceite";
  return "otro";
}

function isPdfManualFallbackError(error: unknown) {
  if (error instanceof OcrProcessingError) {
    return error.stage === "pdf_worker" || error.stage === "pdf_dependency" || /leer automáticamente este PDF|fake worker|pdf\.worker|Cannot find module/i.test(error.message);
  }

  const message = error instanceof Error ? error.message : String(error || "");
  return /fake worker|pdf\.worker|Cannot find module|Setting up fake worker/i.test(message);
}

function createPdfManualReviewResult(file: File, kind: OcrExtractorKind): OcrUploadResult {
  const detectedType = fallbackDetectedType(kind);
  return {
    documentName: file.name,
    requestedKind: kind,
    detectedType,
    status: "prepared",
    message: "No se ha podido leer automáticamente este PDF en servidor. El documento original se ha guardado y puede revisarse manualmente.",
    result: {
      kind: detectedType,
      confidence: 0,
      summary: "PDF guardado en el repositorio documental privado. Revisión manual requerida antes de registrar contabilidad, inventario o APPCC.",
      suggestedRoute: "/admin-kiosko/contabilidad",
    },
  };
}

export async function POST(request: Request) {
  console.info("[OCR REQUEST]");
  await requireAdminSession();

  const config = getOpenAiServerConfig();
  console.info("[OCR ENV]", {
    hasOpenAIKey: Boolean(config?.apiKey),
    model: config?.model || process.env.OPENAI_MODEL || "gpt-4.1-mini",
    nodeVersion: process.version,
  });

  if (!config) {
    return ndjsonError("Missing OPENAI_API_KEY", 500);
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      function send(event: OcrProgressEvent) {
        controller.enqueue(encodeEvent(event));
      }

      try {
        send({ type: "progress", message: "Subiendo...", progress: 5 });

        let formData: FormData;
        try {
          formData = await request.formData();
        } catch (error) {
          const message = error instanceof Error ? error.message : "Invalid multipart form data";
          throw new OcrProcessingError(`File reception error: ${message}`, "file_reception", 400);
        }

        const file = formData.get("file");
        const kindValue = String(formData.get("kind") || "clasificacion");
        const kind = isAllowedKind(kindValue) ? kindValue : "clasificacion";

        if (!(file instanceof File)) {
          throw new OcrProcessingError("No se ha recibido ningún archivo.", "file_reception", 400);
        }

        console.info("[OCR FILE]", {
          name: file.name,
          type: file.type,
          size: file.size,
          kind,
          model: config.model,
        });

        if (!isAcceptedOcrMimeType(file.type)) {
          throw new OcrProcessingError(`Formato no compatible: ${file.type || "unknown"}`, "file_validation", 400);
        }

        const maxSize = isPdfMimeType(file.type) ? 18 * 1024 * 1024 : 12 * 1024 * 1024;
        if (file.size > maxSize) {
          throw new OcrProcessingError(isPdfMimeType(file.type) ? "PDF demasiado grande" : "El archivo supera el límite de 12 MB.", "file_validation", 400);
        }

        let buffer: Buffer;
        try {
          buffer = Buffer.from(await file.arrayBuffer());
          console.info("[OCR]\nconversión a buffer completada", { bytes: buffer.byteLength });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Buffer conversion failed";
          throw new OcrProcessingError(`Buffer conversion error: ${message}`, "buffer_conversion", 500);
        }

        const originalDocument = await storeOriginalOcrDocument({
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          detectedType: kind,
          buffer,
        });
        if (isPdfMimeType(file.type)) {
          console.info("[PDF STORAGE SAVED]", {
            id: originalDocument.data.id,
            bucket: originalDocument.data.storage_bucket,
            path: originalDocument.data.storage_path,
            status: originalDocument.data.storage_status,
          });
        }

        let result: OcrUploadResult;
        if (isPdfMimeType(file.type)) {
          try {
            result = await processPdf({ file, buffer, kind, send });
          } catch (error) {
            if (!isPdfManualFallbackError(error)) throw error;
            console.error("[PDF OCR ERROR]", error);
            console.info("[PDF FALLBACK MANUAL REVIEW]", {
              filename: file.name,
              storageDocumentId: originalDocument.data.id,
            });
            result = createPdfManualReviewResult(file, kind);
          }
        } else {
          result = await processImage({ file, buffer, kind, model: config.model, send });
        }

        console.info("[OCR]\nextracción completada", {
          documentName: result.documentName,
          detectedType: result.detectedType,
          status: result.status,
        });

        if (originalDocument.data.id) {
          await updateUploadedDocumentReview(originalDocument.data.id, {
            detected_type: result.detectedType,
            ocr_json: result,
            review_status: "pendiente_revision",
          });
        }

        send({ type: "progress", message: "Preparando revisión...", progress: 95 });
        send({ type: "done", data: { ...result, originalDocument: originalDocument.data } });
      } catch (error) {
        const message = errorMessage(error);
        logOcrError(message, error instanceof OcrProcessingError ? { stage: error.stage } : error);
        send({ type: "error", error: message, rawOpenAIText: rawOpenAIText(error) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function processImage({
  file,
  buffer,
  kind,
  model,
  send,
}: {
  file: File;
  buffer: Buffer;
  kind: OcrExtractorKind;
  model: string;
  send: (event: OcrProgressEvent) => void;
}) {
  if (!isAcceptedDirectImageMimeType(file.type)) {
    throw new OcrProcessingError(`Formato no compatible: ${file.type || "unknown"}`, "file_validation", 400);
  }

  send({ type: "progress", message: "Leyendo imagen...", progress: 35 });
  send({ type: "progress", message: "Extrayendo datos...", progress: 70 });
  console.info("[OCR OPENAI REQUEST]", {
    model,
    imageSize: file.size,
    mime: file.type,
    bytes: buffer.byteLength,
    extractor: kind,
  });

  return runAppccOcr({
    kind,
    filename: file.name,
    mimeType: file.type,
    base64: buffer.toString("base64"),
  });
}

async function processPdf({
  file,
  buffer,
  kind,
  send,
}: {
  file: File;
  buffer: Buffer;
  kind: OcrExtractorKind;
  send: (event: OcrProgressEvent) => void;
}) {
  let pdf;
  try {
    pdf = await import("@/lib/ai/pdf");
  } catch (error) {
    console.error("[PDF OCR ERROR]", error);
    throw new OcrProcessingError("No se ha podido leer automáticamente este PDF en servidor. El documento original se ha guardado y puede revisarse manualmente.", "pdf_dependency", 503);
  }

  const { assertPdfSize, renderPdfToImages } = pdf;
  assertPdfSize(file.size);
  send({ type: "progress", message: "Convirtiendo PDF...", progress: 20 });
  console.info("[PDF OCR]", { message: "Convirtiendo PDF", filename: file.name, bytes: buffer.byteLength });

  const pages = await renderPdfToImages({
    data: buffer,
    onPageStart: (pageNumber, totalPages) => {
      const progress = 20 + Math.round((pageNumber / totalPages) * 25);
      send({
        type: "progress",
        message: `Convirtiendo PDF... Página ${pageNumber} de ${totalPages}`,
        progress,
        pageNumber,
        totalPages,
      });
    },
  });

  return runAppccOcr(
    {
      kind,
      filename: file.name,
      mimeType: file.type,
      pages,
    },
    {
      onPageOcrStart: (pageNumber, totalPages) => {
        const progress = 45 + Math.round((pageNumber / totalPages) * 30);
        send({
          type: "progress",
          message: `Leyendo página ${pageNumber}/${totalPages}...`,
          progress,
          pageNumber,
          totalPages,
        });
      },
      onDataExtractionStart: () => {
        send({ type: "progress", message: "Extrayendo datos...", progress: 82 });
      },
    },
  );
}
