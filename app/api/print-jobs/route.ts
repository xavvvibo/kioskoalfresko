import { printService } from "@/lib/admin-kiosko/printing/print-service";
import { printJobCreatedResponse } from "@/lib/admin-kiosko/printing/print-job-response";
import { requirePrintApiToken } from "@/lib/admin-kiosko/printing/print-api-auth";
import { createDomainEvent, emitDomainEventSafe } from "@/lib/admin-kiosko/domain";

export async function POST(request: Request) {
  const auth = requirePrintApiToken(request);
  if (!auth.ok) return auth.response;
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return Response.json({ error: "Content-Type debe ser application/json." }, { status: 415 });
  }

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

  const payload = result.data.payload;
  const metadata = payload.metadata && typeof payload.metadata === "object" && !Array.isArray(payload.metadata)
    ? payload.metadata as Record<string, unknown>
    : {};
  await emitDomainEventSafe(createDomainEvent("PrintJobCreated", {
    source: "labels",
    correlationId: typeof metadata.sourceId === "string" ? metadata.sourceId : result.data.id,
    trace: { labelId: result.data.id },
    payload: {
      printJobId: result.data.id,
      printerKey: result.data.printer_key,
      template: typeof payload.template === "string" ? payload.template : undefined,
      sourceType: typeof metadata.sourceType === "string" ? metadata.sourceType : undefined,
      sourceId: typeof metadata.sourceId === "string" ? metadata.sourceId : undefined,
      reason: typeof metadata.reason === "string" ? metadata.reason : undefined,
    },
  }));

  return Response.json(printJobCreatedResponse(result.data), { status: result.idempotent ? 200 : 201 });
}
