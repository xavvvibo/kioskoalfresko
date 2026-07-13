import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { listLeaveLedgerEntries } from "@/lib/admin-kiosko/repositories/staff-leave.repository";
import { writeStaffAuditLog } from "@/lib/admin-kiosko/repositories/staff.repository";
import { toCsv } from "@/lib/admin-kiosko/staff/time";

export async function GET() {
  const session = await requireAdminPermission("staff:reports:export");
  const ledger = await listLeaveLedgerEntries();
  const csv = toCsv(["empleado", "tipo", "cantidad", "unidad", "fecha efectiva", "origen", "referencia", "idempotencia"], (ledger.ok ? ledger.data : []).map((entry) => [
    entry.employee_id,
    entry.movement_type,
    entry.amount,
    entry.unit,
    entry.effective_on,
    entry.source,
    entry.reference_id || "",
    entry.idempotency_key,
  ]));
  await writeStaffAuditLog({ actorUserId: session.id, action: "leave_ledger_export", entityType: "staff_leave_balance_ledger", metadata: { rows: ledger.ok ? ledger.data.length : 0 } });
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=rrhh-movimientos-saldo.csv" } });
}
