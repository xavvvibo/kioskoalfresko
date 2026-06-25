import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { isAcceptedDirectImageMimeType, isAcceptedOcrMimeType, isPdfMimeType, runAppccOcr } from "@/lib/ai/ocr";
import { OcrProcessingError, getOpenAiServerConfig } from "@/lib/ai/openai";
import { assertPdfSize, renderPdfToImages } from "@/lib/ai/pdf";
import type { OcrExtractorKind, OcrProgressEvent } from "@/lib/ai/types";

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

function errorMessage(error: unknown) {
  if (error instanceof OcrProcessingError) return error.message;
  return error instanceof Error ? error.message : "Unexpected OCR server error";
}

export async function POST(request: Request) {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      function send(event: OcrProgressEvent) {
        controller.enqueue(encodeEvent(event));
      }

      try {
        await requireAdminSession();

        const config = getOpenAiServerConfig();
        if (!config) {
          throw new OcrProcessingError("Missing OPENAI_API_KEY", "openai_config", 500);
        }

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

        console.info("[OCR]\narchivo recibido", {
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

        const result = isPdfMimeType(file.type)
          ? await processPdf({ file, buffer, kind, send })
          : await processImage({ file, buffer, kind, send });

        console.info("[OCR]\nextracción completada", {
          documentName: result.documentName,
          detectedType: result.detectedType,
          status: result.status,
        });
        console.info("[OCR]\nguardado del historial omitido: persistencia no configurada");

        send({ type: "progress", message: "Preparando revisión...", progress: 95 });
        send({ type: "done", data: result });
      } catch (error) {
        const message = errorMessage(error);
        logOcrError(message, error instanceof OcrProcessingError ? { stage: error.stage } : error);
        send({ type: "error", error: message });
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
  send,
}: {
  file: File;
  buffer: Buffer;
  kind: OcrExtractorKind;
  send: (event: OcrProgressEvent) => void;
}) {
  if (!isAcceptedDirectImageMimeType(file.type)) {
    throw new OcrProcessingError(`Formato no compatible: ${file.type || "unknown"}`, "file_validation", 400);
  }

  send({ type: "progress", message: "Leyendo imagen...", progress: 35 });
  send({ type: "progress", message: "Extrayendo datos...", progress: 70 });

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
  assertPdfSize(file.size);
  send({ type: "progress", message: "Convirtiendo PDF...", progress: 20 });
  console.info("[OCR]\nconvirtiendo PDF...");

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
