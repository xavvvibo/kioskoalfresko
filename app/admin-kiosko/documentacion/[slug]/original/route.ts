import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getUploadedDocumentSignedUrl } from "@/lib/admin-kiosko/database";
import { getAppccDocumentCatalog } from "@/lib/admin-kiosko/waste-oil-documents";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  await requireAdminSession();
  const { slug } = await params;
  const catalog = await getAppccDocumentCatalog();

  if (!catalog.ok) {
    return new Response(catalog.error, {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const document = catalog.data.find((item) => item.slug === slug);
  if (!document?.uploadedDocumentId) {
    return new Response("Documento original no asociado.", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const signed = await getUploadedDocumentSignedUrl(document.uploadedDocumentId, 600);
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
