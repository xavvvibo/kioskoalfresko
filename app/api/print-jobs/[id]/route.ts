import { getPrintJobById } from "@/lib/admin-kiosko/database";
import { requirePrintApiToken } from "@/lib/admin-kiosko/printing/print-api-auth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = requirePrintApiToken(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const result = await getPrintJobById(id);

  if (!result.ok) {
    console.error("[PRINT JOB STATUS ERROR]", {
      id,
      error: result.error,
    });
    return Response.json({ error: "No se pudo consultar el trabajo de impresión." }, { status: 500 });
  }

  if (!result.data) {
    return Response.json({ error: "Trabajo de impresión no encontrado." }, { status: 404 });
  }

  const job = result.data;
  return Response.json({
    id: job.id,
    printer_key: job.printer_key,
    status: job.status,
    attempts: job.attempts,
    claimed_at: job.claimed_at,
    printed_at: job.printed_at,
    error: job.error,
    created_at: job.created_at,
    updated_at: job.updated_at,
  });
}
