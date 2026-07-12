import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";

export const runtime = "nodejs";

type ImportCheck = {
  ok: boolean;
  error: string | null;
  stack: string | null;
};

function importError(error: unknown): Omit<ImportCheck, "ok"> {
  if (error instanceof Error) {
    return {
      error: error.message,
      stack: error.stack || null,
    };
  }

  return {
    error: String(error),
    stack: null,
  };
}

async function checkOpenAIImport(): Promise<ImportCheck> {
  try {
    const openaiModule = await import("openai");
    return { ok: Boolean(openaiModule.default), error: null, stack: null };
  } catch (error) {
    return { ok: false, ...importError(error) };
  }
}

async function checkCanvasImport(): Promise<ImportCheck> {
  try {
    const canvasModule = await import("@napi-rs/canvas");
    return { ok: Boolean(canvasModule.createCanvas), error: null, stack: null };
  } catch (error) {
    return { ok: false, ...importError(error) };
  }
}

export async function GET() {
  await requireAdminPermission("settings:manage");
  const openaiImport = await checkOpenAIImport();
  const canvasImport = await checkCanvasImport();

  return NextResponse.json({
    ok: true,
    hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    nodeVersion: process.version,
    runtime: "nodejs",
    canImportOpenAI: openaiImport.ok,
    openAIImportError: openaiImport.error,
    openAIImportStack: openaiImport.stack,
    canImportPdfCanvas: canvasImport.ok,
    pdfCanvasImportError: canvasImport.error,
    pdfCanvasImportStack: canvasImport.stack,
  });
}
