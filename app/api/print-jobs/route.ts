import { printService } from "@/lib/admin-kiosko/printing/print-service";
import { printJobCreatedResponse } from "@/lib/admin-kiosko/printing/print-job-response";
import { requirePrintApiToken } from "@/lib/admin-kiosko/printing/print-api-auth";

export async function POST(request: Request) {
  const auth = requirePrintApiToken(request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null) as {
    printer_key?: string;
    printerKey?: string;
    template?: string;
    data?: Record<string, unknown>;
    payload?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  } | null;

  if (!body) {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const result = await printService.printLabel({
    printerKey: body.printerKey || body.printer_key || "",
    template: body.template || "",
    data: body.data || body.payload || {},
    metadata: body.metadata,
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  console.info("[PRINT JOB CREATED]", {
    id: result.data.id,
    printerKey: result.data.printer_key,
    status: result.data.status,
  });

  return Response.json(printJobCreatedResponse(result.data), { status: 201 });
}
