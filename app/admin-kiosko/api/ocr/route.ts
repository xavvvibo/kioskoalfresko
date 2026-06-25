import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { isAcceptedOcrMimeType, runAppccOcr } from "@/lib/ai/ocr";
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

export async function POST(request: Request) {
  await requireAdminSession();

  const formData = await request.formData();
  const file = formData.get("file");
  const kindValue = String(formData.get("kind") || "clasificacion");
  const kind = isAllowedKind(kindValue) ? kindValue : "clasificacion";

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "No se ha recibido ningún archivo." }, { status: 400 });
  }

  if (!isAcceptedOcrMimeType(file.type)) {
    return NextResponse.json({ ok: false, error: "Formato no admitido. Sube imagen JPG, PNG, WEBP, HEIC o PDF." }, { status: 400 });
  }

  const maxSize = 12 * 1024 * 1024;
  if (file.size > maxSize) {
    return NextResponse.json({ ok: false, error: "El archivo supera el límite de 12 MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await runAppccOcr({
    kind,
    filename: file.name,
    mimeType: file.type,
    base64: buffer.toString("base64"),
  });

  return NextResponse.json({ ok: true, data: result });
}
