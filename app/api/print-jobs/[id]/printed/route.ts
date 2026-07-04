import { markPrintJobPrinted } from "@/lib/admin-kiosko/database";
import { requirePrintApiToken } from "@/lib/admin-kiosko/printing/print-api-auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = requirePrintApiToken(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const result = await markPrintJobPrinted(id);

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  console.info("[PRINT JOB PRINTED]", {
    id,
    printer_key: result.data.printer_key,
    attempts: result.data.attempts,
    statusPrevious: "printing",
    statusNew: result.data.status,
  });
  return Response.json({ job: result.data });
}
