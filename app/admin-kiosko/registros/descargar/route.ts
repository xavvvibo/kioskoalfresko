import { NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { appccRecordsToCsv, getAppccRecords, type AppccRecordFilters } from "@/lib/admin-kiosko/database";

function parseFilters(request: NextRequest): AppccRecordFilters {
  const params = request.nextUrl.searchParams;
  return {
    type: (params.get("type") || "todos") as AppccRecordFilters["type"],
    dateFrom: params.get("dateFrom") || "",
    dateTo: params.get("dateTo") || "",
    equipment: params.get("equipment") || "",
    status: params.get("status") || "",
    responsible: params.get("responsible") || "",
    includeArchivedEquipment: params.get("includeArchivedEquipment") === "1",
  };
}

function getMadridDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function GET(request: NextRequest) {
  await requireAdminSession();

  const records = await getAppccRecords(parseFilters(request));

  if (!records.ok) {
    return new Response(`No se ha podido generar el CSV: ${records.error}`, { status: 500 });
  }

  const csv = appccRecordsToCsv(records.data);
  const filename = `kiosko-alfresko-registros-appcc-${getMadridDate()}.csv`;

  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
