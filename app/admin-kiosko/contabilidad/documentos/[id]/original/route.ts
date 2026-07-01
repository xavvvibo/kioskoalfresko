import { NextResponse } from "next/server";
import { getUploadedDocumentSignedUrl } from "@/lib/admin-kiosko/database";
import { requireOwnerRole } from "@/lib/admin-kiosko/roles";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireOwnerRole();
  const { id } = await params;
  const signed = await getUploadedDocumentSignedUrl(id, 600);

  if (!signed.ok || !signed.data) {
    return new Response(signed.ok ? "Documento original no disponible." : signed.error, {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  return NextResponse.redirect(signed.data.url, {
    headers: { "Cache-Control": "no-store" },
  });
}
