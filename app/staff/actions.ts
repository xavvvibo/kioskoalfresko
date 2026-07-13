"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentAdminSession, requireAdminSession } from "@/lib/admin-kiosko/auth";
import {
  getOpenWorkEntry,
  getStaffEmployeeByAuthUserId,
  getStaffEmployeeById,
  listOpenBreaks,
} from "@/lib/admin-kiosko/repositories/staff.repository";
import { clockIn, clockOut, createTimeIncident, endBreak, startBreak } from "@/lib/admin-kiosko/staff/service";
import { verifyStaffPin } from "@/lib/admin-kiosko/staff/pin";
import { getStaffDocumentById } from "@/lib/admin-kiosko/repositories/staff-records.repository";
import { createSignedDocumentUrl } from "@/lib/admin-kiosko/staff/documents.service";
import { registerHandwrittenSignature } from "@/lib/admin-kiosko/staff/signature.service";

async function requireLinkedEmployee() {
  const session = await requireAdminSession("/staff");
  if (!session.id) {
    throw new Error("El acceso legacy no está vinculado a un empleado.");
  }
  const employee = await getStaffEmployeeByAuthUserId(session.id);
  if (!employee.ok) throw new Error(employee.error);
  if (!employee.data) throw new Error("No hay empleado vinculado a este usuario.");
  return { session, employee: employee.data };
}

export async function staffClockAction(formData: FormData) {
  const { session, employee } = await requireLinkedEmployee();
  const intent = String(formData.get("intent") || "");
  const actorUserId = session.id;
  const actorEmployeeId = employee.id;

  if (intent === "clock_in") {
    await clockIn({ actorUserId, actorEmployeeId, employee, source: "employee_web" });
  } else if (intent === "start_break") {
    await startBreak({ actorUserId, actorEmployeeId, employeeId: employee.id });
  } else if (intent === "end_break") {
    await endBreak({ actorUserId, actorEmployeeId, employeeId: employee.id });
  } else if (intent === "clock_out") {
    await clockOut({ actorUserId, actorEmployeeId, employeeId: employee.id, source: "employee_web" });
  }

  revalidatePath("/staff");
  revalidatePath("/staff/fichajes");
}

export async function staffIncidentAction(formData: FormData) {
  const { session, employee } = await requireLinkedEmployee();
  const incidentType = String(formData.get("incidentType") || "other") as Parameters<typeof createTimeIncident>[0]["incidentType"];
  const description = String(formData.get("description") || "").trim();
  if (description.length < 8) return;

  await createTimeIncident({
    actorUserId: session.id,
    actorEmployeeId: employee.id,
    employeeId: employee.id,
    incidentType,
    description,
  });
  revalidatePath("/staff/incidencias");
}

export async function staffDownloadDocumentAction(formData: FormData) {
  const { session, employee } = await requireLinkedEmployee();
  const documentId = String(formData.get("documentId") || "");
  const document = await getStaffDocumentById(documentId);
  if (!document.ok || !document.data || document.data.employee_id !== employee.id || !document.data.visible_to_employee) return;
  const signed = await createSignedDocumentUrl({ actorUserId: session.id, document: document.data, expiresIn: 120 });
  if (signed.ok) redirect(signed.data);
}

export async function staffSignDocumentAction(formData: FormData) {
  const { session, employee } = await requireLinkedEmployee();
  const documentId = String(formData.get("documentId") || "");
  const document = await getStaffDocumentById(documentId);
  if (!document.ok || !document.data || document.data.employee_id !== employee.id || !document.data.visible_to_employee) return;
  const signatureImageDataUrl = String(formData.get("signatureImageDataUrl") || "");
  const consent = formData.get("signatureConsent") === "on";
  if (!signatureImageDataUrl || !consent) return;
  await registerHandwrittenSignature({
    actorUserId: session.id,
    employeeId: employee.id,
    signerName: employee.display_name,
    signedEntityType: "document",
    signedEntityId: document.data.id,
    documentId: document.data.id,
    documentVersion: document.data.version,
    signatureImageDataUrl,
    consentText: "Confirmo que la firma manuscrita representa mi conformidad con el contenido mostrado.",
    displayedText: `${document.data.visible_name} · versión ${document.data.version}`,
  });
  revalidatePath("/staff/firmas");
  revalidatePath("/staff/documentos");
}

export async function sharedKioskLoginAction(formData: FormData) {
  const employeeId = String(formData.get("employeeId") || "");
  const pin = String(formData.get("pin") || "");
  const employee = await getStaffEmployeeById(employeeId);
  if (!employee.ok || !employee.data || employee.data.status !== "active" || !verifyStaffPin(pin, employee.data.pin_hash)) {
    redirect("/staff/kiosk?error=1");
  }
  redirect(`/staff/kiosk?employee=${encodeURIComponent(employee.data.id)}`);
}

export async function sharedKioskClockAction(formData: FormData) {
  const employeeId = String(formData.get("employeeId") || "");
  const intent = String(formData.get("intent") || "");
  const employee = await getStaffEmployeeById(employeeId);
  if (!employee.ok || !employee.data || employee.data.status !== "active") redirect("/staff/kiosk?error=1");

  if (intent === "clock_in") {
    await clockIn({ actorEmployeeId: employee.data.id, employee: employee.data, source: "shared_kiosk" });
  } else if (intent === "start_break") {
    await startBreak({ actorEmployeeId: employee.data.id, employeeId: employee.data.id });
  } else if (intent === "end_break") {
    await endBreak({ actorEmployeeId: employee.data.id, employeeId: employee.data.id });
  } else if (intent === "clock_out") {
    await clockOut({ actorEmployeeId: employee.data.id, employeeId: employee.data.id, source: "shared_kiosk" });
  }
  redirect("/staff/kiosk?ok=1");
}

export async function getKioskState(employeeId: string) {
  const session = await getCurrentAdminSession();
  if (!session && !employeeId) return { openEntry: null, openBreak: null };
  const openEntry = await getOpenWorkEntry(employeeId);
  if (!openEntry.ok || !openEntry.data) return { openEntry: null, openBreak: null };
  const openBreaks = await listOpenBreaks(openEntry.data.id);
  return { openEntry: openEntry.data, openBreak: openBreaks.ok ? openBreaks.data[0] || null : null };
}
