"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { requireEmployeeAccess, requireStaffPermission } from "@/lib/admin-kiosko/auth/staff-actor";
import { listAdminUsers } from "@/lib/admin-kiosko/repositories/admin-users.repository";
import { getStaffDocumentById } from "@/lib/admin-kiosko/repositories/staff-records.repository";
import {
  getStaffEmployeeByAuthUserId,
  getStaffEmployeeById,
  updateStaffEmployeeAuthUser,
  writeStaffAuditLog,
} from "@/lib/admin-kiosko/repositories/staff.repository";
import { createAbsenceRequest } from "@/lib/admin-kiosko/staff/absence.service";
import { createDisciplinaryCaseService } from "@/lib/admin-kiosko/staff/disciplinary.service";
import { archiveEmployeeDocument, createSignedDocumentUrl, uploadEmployeeDocument } from "@/lib/admin-kiosko/staff/documents.service";
import { updateEmployeePrivateProfile } from "@/lib/admin-kiosko/staff/profile.service";
import { assignTrainingToEmployee, createTrainingCatalogItemService } from "@/lib/admin-kiosko/staff/training.service";

export async function updateEmployeePrivateProfileAction(formData: FormData) {
  const actor = await requireStaffPermission("staff:write");
  const employeeId = String(formData.get("employeeId") || "");
  if (!employeeId) return;
  await requireEmployeeAccess(actor, employeeId);
  await updateEmployeePrivateProfile({
    actorUserId: actor.adminUserId,
    employeeId,
    payload: {
      preferred_name: String(formData.get("preferredName") || "") || null,
      dni_nie: String(formData.get("dniNie") || "") || null,
      social_security_number: String(formData.get("socialSecurityNumber") || "") || null,
      birth_date: String(formData.get("birthDate") || "") || null,
      address: String(formData.get("address") || "") || null,
      postal_code: String(formData.get("postalCode") || "") || null,
      municipality: String(formData.get("municipality") || "") || null,
      province: String(formData.get("province") || "") || null,
      country: String(formData.get("country") || "") || null,
      emergency_contact_name: String(formData.get("emergencyContactName") || "") || null,
      emergency_contact_phone: String(formData.get("emergencyContactPhone") || "") || null,
      emergency_contact_relationship: String(formData.get("emergencyContactRelationship") || "") || null,
      iban: String(formData.get("iban") || "") || null,
      shirt_size: String(formData.get("shirtSize") || "") || null,
      shoe_size: String(formData.get("shoeSize") || "") || null,
      internal_notes: String(formData.get("internalNotes") || "") || null,
      seniority_date: String(formData.get("seniorityDate") || "") || null,
      termination_reason: String(formData.get("terminationReason") || "") || null,
      professional_group: String(formData.get("professionalGroup") || "") || null,
      professional_category: String(formData.get("professionalCategory") || "") || null,
      department: String(formData.get("department") || "") || null,
      workday_type: String(formData.get("workdayType") || "") || null,
      salary_gross: String(formData.get("salaryGross") || "") || null,
      salary_periodicity: String(formData.get("salaryPeriodicity") || "") || null,
      estimated_company_cost: String(formData.get("estimatedCompanyCost") || "") || null,
      probation_period: String(formData.get("probationPeriod") || "") || null,
      probation_ends_at: String(formData.get("probationEndsAt") || "") || null,
      labor_notes: String(formData.get("laborNotes") || "") || null,
    },
  });
  revalidatePath(`/admin-kiosko/personal/empleados/${employeeId}`);
}

export async function uploadEmployeeDocumentAction(formData: FormData) {
  const actor = await requireStaffPermission("staff:documents:write");
  const employeeId = String(formData.get("employeeId") || "");
  const file = formData.get("file");
  if (!employeeId || !(file instanceof File) || !file.size) return;
  await requireEmployeeAccess(actor, employeeId);
  await uploadEmployeeDocument({
    actorUserId: actor.adminUserId,
    employeeId,
    file,
    category: String(formData.get("category") || "other"),
    visibleName: String(formData.get("visibleName") || file.name),
    documentDate: String(formData.get("documentDate") || "") || null,
    expiresAt: String(formData.get("expiresAt") || "") || null,
    notes: String(formData.get("notes") || "") || null,
    visibleToEmployee: formData.get("visibleToEmployee") === "on",
    requiresSignature: formData.get("requiresSignature") === "on",
    replacesDocumentId: String(formData.get("replacesDocumentId") || "") || null,
  });
  revalidatePath(`/admin-kiosko/personal/empleados/${employeeId}`);
}

export async function archiveEmployeeDocumentAction(formData: FormData) {
  const actor = await requireStaffPermission("staff:documents:write");
  const employeeId = String(formData.get("employeeId") || "");
  const documentId = String(formData.get("documentId") || "");
  if (employeeId) await requireEmployeeAccess(actor, employeeId);
  if (documentId) await archiveEmployeeDocument({ actorUserId: actor.adminUserId, documentId });
  revalidatePath(`/admin-kiosko/personal/empleados/${employeeId}`);
}

export async function downloadEmployeeDocumentAction(formData: FormData) {
  const actor = await requireStaffPermission("staff:documents:read");
  const documentId = String(formData.get("documentId") || "");
  const document = await getStaffDocumentById(documentId);
  if (!document.ok || !document.data) return;
  await requireEmployeeAccess(actor, document.data.employee_id);
  const signed = await createSignedDocumentUrl({ actorUserId: actor.adminUserId, document: document.data, expiresIn: 120 });
  if (signed.ok) redirect(signed.data);
}

export async function createTrainingAction(formData: FormData) {
  const session = await requireAdminPermission("staff:write");
  await createTrainingCatalogItemService({
    actorUserId: session.id,
    organizationId: String(formData.get("organizationId") || "") || null,
    category: String(formData.get("category") || "internal"),
    name: String(formData.get("name") || ""),
    provider: String(formData.get("provider") || "") || null,
    mandatory: formData.get("mandatory") === "on",
  });
  revalidatePath("/admin-kiosko/personal/empleados");
}

export async function assignTrainingAction(formData: FormData) {
  const actor = await requireStaffPermission("staff:write");
  const employeeId = String(formData.get("employeeId") || "");
  await requireEmployeeAccess(actor, employeeId);
  await assignTrainingToEmployee({
    actorUserId: actor.adminUserId,
    employeeId,
    trainingId: String(formData.get("trainingId") || "") || null,
    status: String(formData.get("status") || "pending") as "pending",
    completedAt: String(formData.get("completedAt") || "") || null,
    expiresAt: String(formData.get("expiresAt") || "") || null,
    provider: String(formData.get("provider") || "") || null,
    notes: String(formData.get("notes") || "") || null,
  });
  revalidatePath(`/admin-kiosko/personal/empleados/${employeeId}`);
}

export async function createAbsenceAction(formData: FormData) {
  const actor = await requireStaffPermission("staff:write");
  const employeeId = String(formData.get("employeeId") || "");
  await requireEmployeeAccess(actor, employeeId);
  await createAbsenceRequest({
    actorUserId: actor.adminUserId,
    employeeId,
    absenceType: String(formData.get("absenceType") || "other"),
    startsAt: String(formData.get("startsAt") || ""),
    endsAt: String(formData.get("endsAt") || ""),
    reason: String(formData.get("reason") || "") || null,
    notes: String(formData.get("notes") || "") || null,
    visibleToEmployee: formData.get("visibleToEmployee") === "on",
  });
  revalidatePath(`/admin-kiosko/personal/empleados/${employeeId}`);
}

export async function createDisciplinaryCaseAction(formData: FormData) {
  const actor = await requireStaffPermission("staff:disciplinary:write");
  const employeeId = String(formData.get("employeeId") || "");
  await requireEmployeeAccess(actor, employeeId);
  await createDisciplinaryCaseService({
    actorUserId: actor.adminUserId,
    employeeId,
    caseType: String(formData.get("caseType") || "other_communication"),
    title: String(formData.get("title") || ""),
    facts: String(formData.get("facts") || ""),
    factsDate: String(formData.get("factsDate") || "") || null,
    instructor: String(formData.get("instructor") || "") || null,
    visibleToEmployee: formData.get("visibleToEmployee") === "on",
    signatureRequired: formData.get("signatureRequired") === "on",
  });
  revalidatePath(`/admin-kiosko/personal/empleados/${employeeId}`);
}

export async function linkEmployeeAdminUserAction(formData: FormData) {
  const session = await requireAdminPermission("staff:identity:write");
  const employeeId = String(formData.get("employeeId") || "");
  const adminUserId = String(formData.get("adminUserId") || "");
  if (!employeeId || !adminUserId) return;

  const [employee, existingLink, users] = await Promise.all([
    getStaffEmployeeById(employeeId),
    getStaffEmployeeByAuthUserId(adminUserId),
    listAdminUsers(),
  ]);
  if (!employee.ok || !employee.data) return;
  if (!users.ok || !users.data.some((user) => user.id === adminUserId && user.status === "active")) return;
  if (existingLink.ok && existingLink.data && existingLink.data.id !== employeeId) return;

  const updated = await updateStaffEmployeeAuthUser({ employeeId, authUserId: adminUserId });
  if (updated.ok) {
    await writeStaffAuditLog({
      actorUserId: session.id,
      entityType: "staff_identity_link",
      entityId: employeeId,
      action: "identity_link",
      beforeData: { linked: Boolean(employee.data.auth_user_id) },
      afterData: { linked: true },
      metadata: { adminUserChanged: true },
    });
  }
  revalidatePath(`/admin-kiosko/personal/empleados/${employeeId}`);
}

export async function unlinkEmployeeAdminUserAction(formData: FormData) {
  const session = await requireAdminPermission("staff:identity:write");
  const employeeId = String(formData.get("employeeId") || "");
  if (!employeeId) return;
  const employee = await getStaffEmployeeById(employeeId);
  if (!employee.ok || !employee.data) return;

  const updated = await updateStaffEmployeeAuthUser({ employeeId, authUserId: null });
  if (updated.ok) {
    await writeStaffAuditLog({
      actorUserId: session.id,
      entityType: "staff_identity_link",
      entityId: employeeId,
      action: "identity_unlink",
      beforeData: { linked: Boolean(employee.data.auth_user_id) },
      afterData: { linked: false },
    });
  }
  revalidatePath(`/admin-kiosko/personal/empleados/${employeeId}`);
}
