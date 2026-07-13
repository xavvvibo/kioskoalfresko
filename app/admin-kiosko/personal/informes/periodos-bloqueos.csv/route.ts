import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { listPeriodLocks } from "@/lib/admin-kiosko/repositories/staff-leave.repository";
import { writeStaffAuditLog } from "@/lib/admin-kiosko/repositories/staff.repository";
import { toCsv } from "@/lib/admin-kiosko/staff/time";

export async function GET() {
  const session = await requireAdminPermission("staff:reports:export");
  const locks = await listPeriodLocks();
  const csv = toCsv(["tipo", "inicio", "fin", "estado", "motivo", "bloqueado"], (locks.ok ? locks.data : []).map((lock) => [
    lock.period_type,
    lock.starts_on,
    lock.ends_on,
    lock.status,
    lock.reason || "",
    lock.locked_at || "",
  ]));
  await writeStaffAuditLog({ actorUserId: session.id, action: "period_locks_export", entityType: "staff_period_lock", metadata: { rows: locks.ok ? locks.data.length : 0 } });
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=rrhh-bloqueos-periodo.csv" } });
}
