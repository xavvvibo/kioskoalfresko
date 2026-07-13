import { createSchedulePublication, createSchedulePublicationChange } from "../repositories/staff-schedule.repository";
import { writeStaffAuditLog } from "../repositories/staff.repository";
import { diffScheduleVersions, type ScheduleShiftSnapshot } from "./schedule-publication-rules";
import { sanitizeOperationalMetadata } from "./availability-rules";
import { notifyEmployee } from "./notification.service";

export async function publishScheduleVersion(input: {
  actorUserId: string | null;
  organizationId: string;
  locationId?: string | null;
  periodStartsOn: string;
  periodEndsOn: string;
  version: number;
  previousPublicationId?: string | null;
  previousShifts: ScheduleShiftSnapshot[];
  nextShifts: ScheduleShiftSnapshot[];
}) {
  const changes = diffScheduleVersions(input.previousShifts, input.nextShifts);
  const affectedEmployeeIds = Array.from(new Set(input.nextShifts.map((shift) => shift.employeeId).filter(Boolean) as string[]));
  const publication = await createSchedulePublication({
    organizationId: input.organizationId,
    locationId: input.locationId || null,
    periodStartsOn: input.periodStartsOn,
    periodEndsOn: input.periodEndsOn,
    version: input.version,
    shiftIds: input.nextShifts.map((shift) => shift.id),
    affectedEmployeeIds,
    changeSummary: { changes: changes.length },
    previousPublicationId: input.previousPublicationId || null,
    actorUserId: input.actorUserId,
    publish: true,
  });
  if (!publication.ok) return publication;
  for (const change of changes) {
    await createSchedulePublicationChange({
      publicationId: publication.data.id,
      organizationId: input.organizationId,
      shiftId: change.shiftId,
      changeType: change.changeType,
      beforeData: change.before,
      afterData: change.after,
      actorUserId: input.actorUserId,
      reason: "Publicación de cuadrante",
    });
  }
  for (const employeeId of affectedEmployeeIds) {
    await notifyEmployee({
      actorUserId: input.actorUserId,
      organizationId: input.organizationId,
      recipientEmployeeId: employeeId,
      type: changes.length ? "shift_changed" : "shift_published",
      title: "Cuadrante publicado",
      message: "Hay una nueva versión del cuadrante disponible.",
      entityType: "schedule_publication",
      entityId: publication.data.id,
      version: input.version,
      metadata: { changeCount: changes.length },
    });
  }
  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    entityType: "staff_schedule_publication",
    entityId: publication.data.id,
    action: "schedule.publish",
    afterData: { version: input.version, changes: changes.length, employees: affectedEmployeeIds.length },
    metadata: sanitizeOperationalMetadata({ periodStartsOn: input.periodStartsOn, periodEndsOn: input.periodEndsOn }),
  });
  return publication;
}
