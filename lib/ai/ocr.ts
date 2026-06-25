import "server-only";

import type { AiDocumentKind, OcrExtractorKind, OcrResultData, OcrUploadInput, OcrUploadResult } from "./types";
import { extractAlbaran } from "./extractors/albaranes";
import { extractFactura } from "./extractors/facturas";
import { extractEtiqueta } from "./extractors/etiquetas";
import { extractCertificado } from "./extractors/certificados";
import { extractTermometro } from "./extractors/termometros";
import { extractAceite } from "./extractors/aceite";
import { classifyDocument } from "./document-classifier";
import { OcrProcessingError, createOpenAiPageResponseJson } from "./openai";
import { appccPageOcrSystemPrompt, pageOcrPrompt } from "./prompts";
import type { OcrPageSummary } from "./types";

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

export function isPdfMimeType(mimeType: string) {
  return mimeType === "application/pdf";
}

export function isAcceptedDirectImageMimeType(mimeType: string) {
  return ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(mimeType);
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

export async function runAppccOcr(
  input: OcrUploadInput,
  options?: {
    onPageOcrStart?: (pageNumber: number, totalPages: number) => void;
    onDataExtractionStart?: () => void;
  },
): Promise<OcrUploadResult> {
  const pages = input.pages ? await extractTextFromPages(input.pages, options) : undefined;
  const extractedText = pages
    ? pages.map((page) => [`Página ${page.pageNumber} de ${page.totalPages}`, page.text].join("\n")).join("\n\n")
    : input.extractedText;

  options?.onDataExtractionStart?.();

  const result =
    input.kind === "albaran"
      ? await extractAlbaran({ ...input, extractedText })
      : input.kind === "factura"
        ? await extractFactura({ ...input, extractedText })
        : input.kind === "etiqueta"
          ? await extractEtiqueta({ ...input, extractedText })
          : input.kind === "certificado"
            ? await extractCertificado({ ...input, extractedText })
            : input.kind === "termometro"
              ? await extractTermometro({ ...input, extractedText })
              : input.kind === "aceite"
                ? await extractAceite({ ...input, extractedText })
                : await classifyDocument({ filename: input.filename, mimeType: input.mimeType, base64: input.base64, text: extractedText });

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
    pages,
    rawOpenAIText: result.rawOpenAIText,
  };
}

export async function extractTextFromPages(
  pages: OcrUploadInput["pages"],
  options?: {
    onPageOcrStart?: (pageNumber: number, totalPages: number) => void;
  },
): Promise<OcrPageSummary[]> {
  if (!pages?.length) {
    throw new OcrProcessingError("No PDF pages available for OCR", "pdf_ocr", 400);
  }

  const summaries: OcrPageSummary[] = [];

  for (const page of pages) {
    options?.onPageOcrStart?.(page.pageNumber, page.totalPages);
    console.info("[OCR]\nllamando a OpenAI...", {
      page: `${page.pageNumber}/${page.totalPages}`,
      mimeType: page.mimeType,
    });

    const summary = await createOpenAiPageResponseJson<OcrPageSummary>({
      systemPrompt: appccPageOcrSystemPrompt,
      userPrompt: pageOcrPrompt(page.pageNumber, page.totalPages),
      page,
    });

    summaries.push({
      pageNumber: page.pageNumber,
      totalPages: page.totalPages,
      text: summary.data.text || "",
    });
  }

  return summaries;
}
