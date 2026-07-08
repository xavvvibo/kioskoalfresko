import { DEFAULT_GODEX_G500_PRINTER_KEY } from "@/lib/admin-kiosko/printing/print-service";
import { requirePrintApiToken } from "@/lib/admin-kiosko/printing/print-api-auth";

export async function GET(request: Request) {
  const auth = requirePrintApiToken(request);
  if (!auth.ok) return auth.response;

  return Response.json({
    ok: true,
    service: "print-jobs",
    printerKey: process.env.PRINTER_KEY || DEFAULT_GODEX_G500_PRINTER_KEY,
    statuses: ["queued", "claimed", "sending", "sent_unconfirmed", "printed", "error", "cancelled"],
  });
}
