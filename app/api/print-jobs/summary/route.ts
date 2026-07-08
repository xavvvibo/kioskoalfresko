import { getPrintJobQueueSummary } from "@/lib/admin-kiosko/database";
import { requirePrintApiToken } from "@/lib/admin-kiosko/printing/print-api-auth";

export async function GET(request: Request) {
  const auth = requirePrintApiToken(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const printerKey = url.searchParams.get("printer_key") || "";
  const result = await getPrintJobQueueSummary(printerKey);

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  return Response.json({ summary: result.data });
}
