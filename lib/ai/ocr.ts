import "server-only";

import type { AiDocumentKind, OcrExtractorKind, OcrResultData, OcrUploadInput, OcrUploadResult } from "./types";
import { extractAlbaran } from "./extractors/albaranes";
import { extractFactura } from "./extractors/facturas";
import { extractEtiqueta } from "./extractors/etiquetas";
import { extractCertificado } from "./extractors/certificados";
import { extractTermometro } from "./extractors/termometros";
import { extractAceite } from "./extractors/aceite";
import { classifyDocument } from "./document-classifier";

export const acceptedOcrMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
];

export function isAcceptedOcrMimeType(mimeType: string) {
  return acceptedOcrMimeTypes.includes(mimeType);
}

function detectedTypeForKind(kind: OcrExtractorKind, result: OcrResultData): AiDocumentKind {
  if (kind === "albaran") return "albaran";
  if (kind === "factura") return "factura";
  if (kind === "etiqueta") return "etiqueta_lote";
  if (kind === "termometro") return "termometro";
  if (kind === "aceite") return "aceite";
  if (kind === "certificado" && "tipo_detectado" in result) return result.tipo_detectado;
  if ("kind" in result) return result.kind;
  return "otro";
}

async function fallbackClassification(input: OcrUploadInput, error: string): Promise<OcrResultData> {
  const fallback = await classifyDocument({ filename: input.filename, mimeType: input.mimeType });

  if (fallback.ok) {
    return fallback.data;
  }

  return {
    kind: "otro",
    confidence: 0,
    summary: error,
  };
}

export async function runAppccOcr(input: OcrUploadInput): Promise<OcrUploadResult> {
  const result =
    input.kind === "albaran"
      ? await extractAlbaran(input)
      : input.kind === "factura"
        ? await extractFactura(input)
        : input.kind === "etiqueta"
          ? await extractEtiqueta(input)
          : input.kind === "certificado"
            ? await extractCertificado(input)
            : input.kind === "termometro"
              ? await extractTermometro(input)
              : input.kind === "aceite"
                ? await extractAceite(input)
                : await classifyDocument({ filename: input.filename, mimeType: input.mimeType });

  const data: OcrResultData = result.ok ? result.data : result.data ?? await fallbackClassification(input, result.error);

  return {
    documentName: input.filename,
    requestedKind: input.kind,
    detectedType: detectedTypeForKind(input.kind, data),
    status: result.ok ? "processed" : "prepared",
    result: data,
    message: result.ok ? "OCR procesado desde servidor." : result.error,
  };
}
