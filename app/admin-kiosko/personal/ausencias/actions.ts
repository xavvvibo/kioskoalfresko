"use server";

import { revalidatePath } from "next/cache";
import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { createLeavePolicy } from "@/lib/admin-kiosko/repositories/staff-leave.repository";
import { listStaffOrganizations } from "@/lib/admin-kiosko/repositories/staff-records.repository";
import { decideLeaveRequest } from "@/lib/admin-kiosko/staff/leave-request.service";
import { createPeriodLockService } from "@/lib/admin-kiosko/staff/period-lock.service";
import { createPayrollVariableService } from "@/lib/admin-kiosko/staff/payroll-variable.service";
import { writeStaffAuditLog } from "@/lib/admin-kiosko/repositories/staff.repository";

async function defaultOrganizationId() {
  const organizations = await listStaffOrganizations();
  if (!organizations.ok || !organizations.data[0]) throw new Error("No hay organización configurada.");
  return organizations.data[0].id;
}

export async function createLeavePolicyAction(formData: FormData) {
  const session = await requireAdminPermission("staff:policy:write");
  const organizationId = await defaultOrganizationId();
  const created = await createLeavePolicy({
    organization_id: organizationId,
    location_id: String(formData.get("locationId") || "") || null,
    name: String(formData.get("name") || ""),
    absence_type: String(formData.get("absenceType") || "vacation"),
    unit: String(formData.get("unit") || "natural_days") as "natural_days",
    accrual_method: String(formData.get("accrualMethod") || "annual") as "annual",
    annual_amount: Number(formData.get("annualAmount") || 0),
    cycle_starts_on: String(formData.get("cycleStartsOn") || new Date().toISOString().slice(0, 10)),
    carryover_enabled: formData.get("carryoverEnabled") === "on",
    max_carryover: Number(formData.get("maxCarryover") || 0),
    negative_balance_allowed: formData.get("negativeBalanceAllowed") === "on",
    negative_limit: Number(formData.get("negativeLimit") || 0),
    requires_document: formData.get("requiresDocument") === "on",
    created_by: session.id,
  });
  if (created.ok) {
    await writeStaffAuditLog({
      actorUserId: session.id,
      entityType: "staff_leave_policy",
      entityId: created.data.id,
      action: "leave_policy_create",
      afterData: created.data,
    });
  }
  revalidatePath("/admin-kiosko/personal/politicas");
}

export async function decideLeaveRequestAction(formData: FormData) {
  const session = await requireAdminPermission("staff:absence:approve");
  await decideLeaveRequest({
    actorUserId: session.id,
    requestId: String(formData.get("requestId") || ""),
    decision: String(formData.get("decision") || "reject") as "approve",
    comment: String(formData.get("comment") || "Resuelto por administración."),
  });
  revalidatePath("/admin-kiosko/personal/ausencias");
}

export async function createPeriodLockAction(formData: FormData) {
  const session = await requireAdminPermission("staff:period:lock");
  const organizationId = await defaultOrganizationId();
  await createPeriodLockService({
    actorUserId: session.id,
    organizationId,
    periodType: String(formData.get("periodType") || "absences") as "absences",
    startsOn: String(formData.get("startsOn") || ""),
    endsOn: String(formData.get("endsOn") || ""),
    status: String(formData.get("status") || "soft_locked") as "soft_locked",
    reason: String(formData.get("reason") || ""),
  });
  revalidatePath("/admin-kiosko/personal/periodos");
}

export async function createPayrollVariableAction(formData: FormData) {
  const session = await requireAdminPermission("staff:payroll-variable:write");
  const organizationId = await defaultOrganizationId();
  await createPayrollVariableService({
    actorUserId: session.id,
    organizationId,
    employeeId: String(formData.get("employeeId") || ""),
    periodStart: String(formData.get("periodStart") || ""),
    periodEnd: String(formData.get("periodEnd") || ""),
    concept: String(formData.get("concept") || "manual_adjustment"),
    quantity: Number(formData.get("quantity") || 0),
    unit: String(formData.get("unit") || "hours") as "hours",
    notes: String(formData.get("notes") || "") || null,
  });
  revalidatePath("/admin-kiosko/personal/variables");
}
