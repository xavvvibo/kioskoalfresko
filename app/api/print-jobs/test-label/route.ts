import { DEFAULT_GODEX_G500_PRINTER_KEY, printService } from "@/lib/admin-kiosko/printing/print-service";
import { printJobCreatedResponse } from "@/lib/admin-kiosko/printing/print-job-response";
import { requirePrintApiToken } from "@/lib/admin-kiosko/printing/print-api-auth";

function madridNowLabel() {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date());
}

export async function POST(request: Request) {
  const auth = requirePrintApiToken(request);
  if (!auth.ok) return auth.response;

  const result = await printService.printLabel({
    printerKey: DEFAULT_GODEX_G500_PRINTER_KEY,
    template: "test_label",
    data: {
      title: "ERP OK",
      line1: "PRINT SERVICE",
      line2: madridNowLabel(),
    },
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json(printJobCreatedResponse(result.data), { status: 201 });
}
