import {
  createAvailabilityException,
  patchAvailabilityException,
  upsertRecurringAvailability,
  upsertWorkPreference,
} from "../repositories/staff-availability.repository";
import { getStaffEmployeeById, writeStaffAuditLog } from "../repositories/staff.repository";
import { sanitizeOperationalMetadata } from "./availability-rules";

function fail(error: string) {
  return { ok: false as const, error };
}

export async function saveRecurringAvailability(input: {
  actorUserId: string | null;
  employeeId: string;
  weekday: number;
  availabilityType: "available" | "unavailable" | "positive_preference" | "negative_preference";
  startsAt?: string | null;
  endsAt?: string | null;
  fullDay?: boolean;
  notes?: string | null;
  validFrom: string;
  validUntil?: string | null;
  locationId?: string | null;
}) {
  const employee = await getStaffEmployeeById(input.employeeId);
  if (!employee.ok) return employee;
  if (!employee.data?.organization_id) return fail("Empleado sin organización.");
  const saved = await upsertRecurringAvailability({
    organizationId: employee.data.organization_id,
    employeeId: input.employeeId,
    locationId: input.locationId || null,
    weekday: input.weekday,
    availabilityType: input.availabilityType,
    startsAt: input.startsAt || null,
    endsAt: input.endsAt || null,
    fullDay: input.fullDay,
    notes: input.notes || null,
    validFrom: input.validFrom,
    validUntil: input.validUntil || null,
    actorUserId: input.actorUserId,
  });
  if (!saved.ok) return saved;
  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    actorEmployeeId: input.employeeId,
    entityType: "staff_recurring_availability",
    entityId: saved.data.id,
    action: "availability.upsert",
    afterData: { employee_id: input.employeeId, weekday: input.weekday, availability_type: input.availabilityType },
    metadata: sanitizeOperationalMetadata({ source: "phase_3" }),
  });
  return saved;
}

export async function requestAvailabilityException(input: {
  actorUserId: string | null;
  employeeId: string;
  startsAt: string;
  endsAt: string;
  availabilityType: "available" | "unavailable";
  reason?: string | null;
  notes?: string | null;
  locationId?: string | null;
}) {
  if (new Date(input.endsAt).getTime() <= new Date(input.startsAt).getTime()) return fail("La fecha de fin debe ser posterior.");
  const employee = await getStaffEmployeeById(input.employeeId);
  if (!employee.ok) return employee;
  if (!employee.data?.organization_id) return fail("Empleado sin organización.");
  const saved = await createAvailabilityException({
    organizationId: employee.data.organization_id,
    employeeId: input.employeeId,
    locationId: input.locationId || null,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    availabilityType: input.availabilityType,
    reason: input.reason || null,
    notes: input.notes || null,
    actorUserId: input.actorUserId,
  });
  if (!saved.ok) return saved;
  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    actorEmployeeId: input.employeeId,
    entityType: "staff_availability_exception",
    entityId: saved.data.id,
    action: "availability_exception.create",
    afterData: { employee_id: input.employeeId, availability_type: input.availabilityType, starts_at: input.startsAt, ends_at: input.endsAt },
    metadata: sanitizeOperationalMetadata({ hasReason: Boolean(input.reason) }),
  });
  return saved;
}

export async function resolveAvailabilityException(input: {
  actorUserId: string | null;
  exceptionId: string;
  status: "approved" | "rejected" | "cancelled";
  resolutionReason?: string | null;
}) {
  const result = await patchAvailabilityException(input.exceptionId, {
    status: input.status,
    resolved_by: input.actorUserId,
    resolved_at: new Date().toISOString(),
    resolution_reason: input.resolutionReason || null,
  });
  if (!result.ok) return result;
  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    entityType: "staff_availability_exception",
    entityId: input.exceptionId,
    action: `availability_exception.${input.status}`,
    afterData: { status: input.status },
    metadata: sanitizeOperationalMetadata({ resolutionReason: input.resolutionReason || null }),
  });
  return result;
}

export async function saveWorkPreferences(input: {
  actorUserId: string | null;
  employeeId: string;
  preferredShiftParts: string[];
  preferredFreeWeekdays: number[];
  preferredLocationId?: string | null;
  preferredRoles: string[];
  avoidSplitShifts: boolean;
  preferredMaxConsecutiveDays?: number | null;
  acceptsAdditionalHours: boolean;
  acceptsUrgentCoverage: boolean;
  notes?: string | null;
}) {
  const employee = await getStaffEmployeeById(input.employeeId);
  if (!employee.ok) return employee;
  if (!employee.data?.organization_id) return fail("Empleado sin organización.");
  const saved = await upsertWorkPreference({
    employee_id: input.employeeId,
    organization_id: employee.data.organization_id,
    preferred_shift_parts: input.preferredShiftParts,
    preferred_free_weekdays: input.preferredFreeWeekdays,
    preferred_location_id: input.preferredLocationId || null,
    preferred_roles: input.preferredRoles,
    avoid_split_shifts: input.avoidSplitShifts,
    preferred_max_consecutive_days: input.preferredMaxConsecutiveDays || null,
    accepts_additional_hours: input.acceptsAdditionalHours,
    accepts_urgent_coverage: input.acceptsUrgentCoverage,
    notes: input.notes || null,
    updated_by: input.actorUserId,
  });
  if (!saved.ok) return saved;
  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    actorEmployeeId: input.employeeId,
    entityType: "staff_work_preferences",
    entityId: input.employeeId,
    action: "work_preferences.upsert",
    afterData: { employee_id: input.employeeId },
    metadata: sanitizeOperationalMetadata({ preferredShiftParts: input.preferredShiftParts }),
  });
  return saved;
}
