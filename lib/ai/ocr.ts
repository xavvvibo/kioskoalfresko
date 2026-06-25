import "server-only";

import type { AiDocumentKind, OcrExtractorKind, OcrResultData, OcrUploadInput, OcrUploadResult } from "./types";
import { extractAlbaran } from "./extractors/albaranes";
import { extractFactura } from "./extractors/facturas";
import { extractEtiqueta } from "./extractors/etiquetas";
import { extractCertificado } from "./extractors/certificados";
import { extractTermometro } from "./extractors/termometros";
import { extractAceite } from "./extractors/aceite";
import { classifyDocument } from "./document-classifier";
import { OcrProcessingError } from "./openai";

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
                : await classifyDocument({ filename: input.filename, mimeType: input.mimeType, base64: input.base64 });

  if (!result.ok) {
    throw new OcrProcessingError(result.error, "ocr_extraction", 500);
  }

  const data: OcrResultData = result.data;

  return {
    documentName: input.filename,
    requestedKind: input.kind,
    detectedType: detectedTypeForKind(input.kind, data),
    status: "processed",
    result: data,
    message: "OCR procesado desde servidor.",
  };
}
