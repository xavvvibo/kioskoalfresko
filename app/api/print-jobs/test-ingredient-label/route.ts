import { DEFAULT_GODEX_G500_PRINTER_KEY, printService } from "@/lib/admin-kiosko/printing/print-service";
import { printJobCreatedResponse } from "@/lib/admin-kiosko/printing/print-job-response";
import { requirePrintApiToken } from "@/lib/admin-kiosko/printing/print-api-auth";

function madridDatePlusDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export async function POST(request: Request) {
  const auth = requirePrintApiToken(request);
  if (!auth.ok) return auth.response;

  const result = await printService.printLabel({
    printerKey: DEFAULT_GODEX_G500_PRINTER_KEY,
    template: "ingredient_label_basic",
    data: {
      ingredientName: "TOMATE RAF",
      supplierName: "PROVEEDOR TEST",
      internalCode: "MP-TOM-RAF",
      lot: "LOTE TEST",
      expiryDate: madridDatePlusDays(7),
    },
    metadata: {
      requestedBy: "test",
      module: "printing",
      sourceType: "ingredient",
      sourceId: "test-ingredient-label",
      createdFrom: "api",
      reason: "test_ingredient_label",
    },
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json(printJobCreatedResponse(result.data), { status: 201 });
}
