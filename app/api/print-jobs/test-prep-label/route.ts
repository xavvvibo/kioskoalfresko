import { DEFAULT_GODEX_G500_PRINTER_KEY, printService } from "@/lib/admin-kiosko/printing/print-service";
import { printJobCreatedResponse } from "@/lib/admin-kiosko/printing/print-job-response";
import { requirePrintApiToken } from "@/lib/admin-kiosko/printing/print-api-auth";

export async function POST(request: Request) {
  const auth = requirePrintApiToken(request);
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const includeQr = url.searchParams.get("qr") === "1";

  const result = await printService.printLabel({
    printerKey: DEFAULT_GODEX_G500_PRINTER_KEY,
    template: "prep_label_professional",
    data: {
      prepName: "GUACAMOLE",
      productionDateTime: new Date().toISOString(),
      shelfLifeDays: 2,
      batchCode: "GM-TEST",
      responsibleName: "J. Bocanegra",
      storageCondition: "Refrigerado 0-4 C",
      brandName: "KIOSKO ALFRESKO",
      qrValue: "ERP:prep_batch:GM-TEST",
      includeQr,
    },
    metadata: {
      requestedBy: "test",
      module: "printing",
      sourceType: "prep_batch",
      sourceId: "test-prep-label",
      createdFrom: "api",
      reason: "test_prep_label",
    },
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json(printJobCreatedResponse(result.data), { status: 201 });
}
