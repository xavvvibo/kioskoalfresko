import { getAccountingDocuments } from "@/lib/admin-kiosko/database";
import { requireOwnerRole } from "@/lib/admin-kiosko/roles";

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export async function GET() {
  await requireOwnerRole();
  const result = await getAccountingDocuments();
  const rows = result.ok ? result.data : [];
  const header = ["fecha", "proveedor", "cif", "documento", "base", "iva", "total", "estado_conciliacion", "estado_revision"];
  const body = rows.map((row) => [
    row.document_date,
    row.supplier_name,
    row.supplier_tax_id,
    [row.document_type, row.document_number].filter(Boolean).join(" "),
    row.taxable_base,
    row.vat_amount,
    row.total_amount,
    row.reconciliation_status,
    row.review_status,
  ].map(csvCell).join(","));

  return new Response([header.join(","), ...body].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=contabilidad-appcc.csv",
      "Cache-Control": "no-store",
    },
  });
}
