import { createPeriodLock, type PeriodLock } from "../repositories/staff-leave.repository";
import { writeStaffAuditLog } from "../repositories/staff.repository";
import { validateDateRange } from "./record-rules";

export async function createPeriodLockService(input: {
  actorUserId: string | null;
  organizationId: string;
  locationId?: string | null;
  periodType: PeriodLock["period_type"];
  startsOn: string;
  endsOn: string;
  status: PeriodLock["status"];
  reason: string;
}) {
  const validation = validateDateRange(`${input.startsOn}T00:00:00.000Z`, `${input.endsOn}T23:59:59.999Z`);
  if (validation) return { ok: false as const, error: validation };
  const created = await createPeriodLock({
    organization_id: input.organizationId,
    location_id: input.locationId || null,
    period_type: input.periodType,
    starts_on: input.startsOn,
    ends_on: input.endsOn,
    status: input.status,
    locked_by: input.actorUserId,
    locked_at: input.status === "open" ? null : new Date().toISOString(),
    reason: input.reason,
  });
  if (!created.ok) return created;
  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    entityType: "staff_period_lock",
    entityId: created.data.id,
    action: "period_lock_create",
    afterData: { periodType: created.data.period_type, status: created.data.status, startsOn: created.data.starts_on, endsOn: created.data.ends_on },
  });
  return created;
}
