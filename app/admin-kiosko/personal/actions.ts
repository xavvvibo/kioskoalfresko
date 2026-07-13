"use server";

import { revalidatePath } from "next/cache";
import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import {
  createStaffContract,
  createStaffEmployee,
  createStaffShift,
  writeStaffAuditLog,
} from "@/lib/admin-kiosko/repositories/staff.repository";
import {
  approveTimeCorrection,
  duplicateScheduleWeek,
  publishSchedule,
  rejectTimeCorrection,
} from "@/lib/admin-kiosko/staff/service";

function madridDateTimeToIso(date: string, time: string) {
  const safeTime = time || "00:00";
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = safeTime.split(":").map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offset = getMadridOffsetMs(utcGuess);
  return new Date(utcGuess.getTime() - offset).toISOString();
}

function getMadridOffsetMs(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const madridAsUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
  return madridAsUtc - date.getTime();
}

export async function createStaffEmployeeAction(formData: FormData) {
  const session = await requireAdminPermission("staff:hr");
  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const displayName = String(formData.get("displayName") || `${firstName} ${lastName}`).trim();
  const employeeCode = String(formData.get("employeeCode") || "").trim();
  if (!employeeCode || !firstName || !lastName || !displayName) return;

  const result = await createStaffEmployee({
    employeeCode,
    firstName,
    lastName,
    displayName,
    email: String(formData.get("email") || "") || null,
    phone: String(formData.get("phone") || "") || null,
    status: "active",
    hireDate: String(formData.get("hireDate") || "") || null,
    primaryLocationId: String(formData.get("primaryLocationId") || "") || null,
    authUserId: String(formData.get("authUserId") || "") || null,
  });
  if (result.ok) {
    await writeStaffAuditLog({
      actorUserId: session.id,
      entityType: "staff_employee",
      entityId: result.data.id,
      action: "employee_create",
      afterData: result.data,
    });
  }
  revalidatePath("/admin-kiosko/personal/empleados");
}

export async function createStaffContractAction(formData: FormData) {
  const session = await requireAdminPermission("staff:contracts:manage");
  const employeeId = String(formData.get("employeeId") || "");
  if (!employeeId) return;
  const result = await createStaffContract({
    employeeId,
    contractType: String(formData.get("contractType") || "indefinido"),
    startDate: String(formData.get("startDate") || new Date().toISOString().slice(0, 10)),
    endDate: String(formData.get("endDate") || "") || null,
    weeklyMinutes: Number(formData.get("weeklyMinutes") || 0),
    jobTitle: String(formData.get("jobTitle") || "") || null,
    collectiveAgreement: String(formData.get("collectiveAgreement") || "") || null,
    salaryReference: String(formData.get("salaryReference") || "") || null,
  });
  if (result.ok) {
    await writeStaffAuditLog({
      actorUserId: session.id,
      entityType: "staff_contract",
      entityId: result.data.id,
      action: "contract_create",
      afterData: { ...result.data, salary_reference: result.data.salary_reference ? "[restricted]" : null },
    });
  }
  revalidatePath(`/admin-kiosko/personal/empleados/${employeeId}`);
}

export async function createStaffShiftAction(formData: FormData) {
  const session = await requireAdminPermission("staff:shifts:manage");
  const shiftDate = String(formData.get("shiftDate") || "");
  const startsAt = madridDateTimeToIso(shiftDate, String(formData.get("startsAt") || ""));
  let endsAt = madridDateTimeToIso(shiftDate, String(formData.get("endsAt") || ""));
  if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    const endDate = new Date(endsAt);
    endDate.setUTCDate(endDate.getUTCDate() + 1);
    endsAt = endDate.toISOString();
  }
  const result = await createStaffShift({
    locationId: String(formData.get("locationId") || ""),
    employeeId: String(formData.get("employeeId") || "") || null,
    shiftDate,
    startsAt,
    endsAt,
    roleName: String(formData.get("roleName") || "") || null,
    notes: String(formData.get("notes") || "") || null,
  });
  if (result.ok) {
    await writeStaffAuditLog({
      actorUserId: session.id,
      entityType: "staff_shift",
      entityId: result.data.id,
      action: "shift_create",
      afterData: result.data,
    });
  }
  revalidatePath("/admin-kiosko/personal/turnos");
}

export async function publishStaffShiftsAction(formData: FormData) {
  const session = await requireAdminPermission("staff:shifts:publish");
  const shiftIds = formData.getAll("shiftId").map(String).filter(Boolean);
  if (shiftIds.length) await publishSchedule({ actorUserId: session.id, shiftIds });
  revalidatePath("/admin-kiosko/personal/turnos");
}

export async function duplicateStaffWeekAction(formData: FormData) {
  const session = await requireAdminPermission("staff:shifts:manage");
  await duplicateScheduleWeek({
    actorUserId: session.id,
    fromDate: String(formData.get("fromDate") || ""),
    toDate: String(formData.get("toDate") || ""),
    targetStartDate: String(formData.get("targetStartDate") || ""),
  });
  revalidatePath("/admin-kiosko/personal/turnos");
}

export async function reviewTimeIncidentAction(formData: FormData) {
  const session = await requireAdminPermission("staff:time:review");
  const incidentId = String(formData.get("incidentId") || "");
  const resolution = String(formData.get("resolution") || "").trim() || "Revisado por administración.";
  const intent = String(formData.get("intent") || "");
  if (intent === "approve") {
    await approveTimeCorrection({ actorUserId: session.id, incidentId, resolution });
  } else if (intent === "reject") {
    await rejectTimeCorrection({ actorUserId: session.id, incidentId, resolution });
  }
  revalidatePath("/admin-kiosko/personal/incidencias");
}
