import { markPrintJobSentUnconfirmed } from "@/lib/admin-kiosko/database";
import { requirePrintApiToken } from "@/lib/admin-kiosko/printing/print-api-auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = requirePrintApiToken(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => ({})) as {
    bytes?: number;
    transport?: string;
    host?: string;
    port?: number;
    note?: string;
  };
  const result = await markPrintJobSentUnconfirmed(id, body);

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  console.warn("[PRINT JOB SENT UNCONFIRMED]", {
    id,
    printer_key: result.data.printer_key,
    attempts: result.data.attempts,
    statusPrevious: "sending",
    statusNew: result.data.status,
  });
  return Response.json({ job: result.data });
}
