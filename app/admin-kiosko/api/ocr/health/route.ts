import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";

export const runtime = "nodejs";

async function canImport(moduleName: string) {
  try {
    await import(moduleName);
    return true;
  } catch {
    return false;
  }
}

async function canImportPdfCanvas() {
  const [pdfjs, canvas] = await Promise.all([
    canImport("pdfjs-dist/legacy/build/pdf.mjs"),
    canImport("@napi-rs/canvas"),
  ]);

  return pdfjs && canvas;
}

export async function GET() {
  await requireAdminSession();

  return NextResponse.json({
    ok: true,
    hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    nodeVersion: process.version,
    runtime: "nodejs",
    canImportOpenAI: await canImport("openai"),
    canImportPdfCanvas: await canImportPdfCanvas(),
  });
}
