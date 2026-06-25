import "server-only";

import {
  getDocument,
  InvalidPDFException,
} from "pdfjs-dist/legacy/build/pdf.mjs";
import { OcrProcessingError } from "./openai";
import type { OcrPageInput } from "./types";

const maxPdfPages = 10;
const pdfScale = 2.4;

function mapPdfError(error: unknown): never {
  if (error instanceof Error && (error.name === "PasswordException" || error.message.toLowerCase().includes("password"))) {
    throw new OcrProcessingError("PDF protegido", "pdf_load", 400);
  }

  if (error instanceof InvalidPDFException) {
    throw new OcrProcessingError("PDF corrupto", "pdf_load", 400);
  }

  const message = error instanceof Error ? error.message : "PDF corrupto";
  throw new OcrProcessingError(message.includes("password") ? "PDF protegido" : `PDF corrupto: ${message}`, "pdf_load", 400);
}

export function assertPdfSize(size: number) {
  const maxPdfSize = 18 * 1024 * 1024;

  if (size > maxPdfSize) {
    throw new OcrProcessingError("PDF demasiado grande", "file_validation", 400);
  }
}

export async function renderPdfToImages({
  data,
  onPageStart,
}: {
  data: Buffer;
  onPageStart?: (pageNumber: number, totalPages: number) => void;
}): Promise<OcrPageInput[]> {
  const bytes = new Uint8Array(data);
  const loadingTask = getDocument({
    data: bytes,
    useSystemFonts: true,
  });

  let document;
  try {
    document = await loadingTask.promise;
  } catch (error) {
    mapPdfError(error);
  }

  const totalPages = document.numPages;

  if (totalPages > maxPdfPages) {
    throw new OcrProcessingError(`PDF demasiado grande: máximo ${maxPdfPages} páginas`, "pdf_load", 400);
  }

  const pages: OcrPageInput[] = [];

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    onPageStart?.(pageNumber, totalPages);
    const { createCanvas } = await import("@napi-rs/canvas");
    const page = await document.getPage(pageNumber);
    const viewport = page.getViewport({ scale: pdfScale });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const context = canvas.getContext("2d");

    await page.render({
      canvasContext: context as unknown as CanvasRenderingContext2D,
      viewport,
      canvas: canvas as unknown as HTMLCanvasElement,
    }).promise;

    pages.push({
      pageNumber,
      totalPages,
      mimeType: "image/png",
      base64: canvas.toBuffer("image/png").toString("base64"),
    });

    page.cleanup();
  }

  await loadingTask.destroy();

  return pages;
}
