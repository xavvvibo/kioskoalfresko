import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { isAcceptedOcrMimeType, runAppccOcr } from "@/lib/ai/ocr";
import { OcrProcessingError, getOpenAiServerConfig } from "@/lib/ai/openai";
import type { OcrExtractorKind } from "@/lib/ai/types";

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

function errorResponse(message: string, status = 500) {
  logOcrError(message);
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(request: Request) {
  try {
    await requireAdminSession();

    const config = getOpenAiServerConfig();
    if (!config) {
      return errorResponse("Missing OPENAI_API_KEY", 500);
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid multipart form data";
      return errorResponse(`File reception error: ${message}`, 400);
    }

    const file = formData.get("file");
    const kindValue = String(formData.get("kind") || "clasificacion");
    const kind = isAllowedKind(kindValue) ? kindValue : "clasificacion";

    if (!(file instanceof File)) {
      return errorResponse("No se ha recibido ningún archivo.", 400);
    }

    console.info("[OCR]\narchivo recibido", {
      name: file.name,
      type: file.type,
      size: file.size,
      kind,
      model: config.model,
    });

    if (!isAcceptedOcrMimeType(file.type)) {
      return errorResponse(`Invalid image format: ${file.type || "unknown"}`, 400);
    }

    const maxSize = 12 * 1024 * 1024;
    if (file.size > maxSize) {
      return errorResponse("El archivo supera el límite de 12 MB.", 400);
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(await file.arrayBuffer());
      console.info("[OCR]\nconversión a buffer completada", { bytes: buffer.byteLength });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Buffer conversion failed";
      return errorResponse(`Buffer conversion error: ${message}`, 500);
    }

    const result = await runAppccOcr({
      kind,
      filename: file.name,
      mimeType: file.type,
      base64: buffer.toString("base64"),
    });

    console.info("[OCR]\nextracción completada", {
      documentName: result.documentName,
      detectedType: result.detectedType,
      status: result.status,
    });
    console.info("[OCR]\nguardado del historial omitido: persistencia no configurada");

    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    if (error instanceof OcrProcessingError) {
      logOcrError(error.message, { stage: error.stage });
      return NextResponse.json({ ok: false, error: error.message }, { status: error.statusCode });
    }

    const message = error instanceof Error ? error.message : "Unexpected OCR server error";
    logOcrError(message, error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
