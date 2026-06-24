"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearAdminSession, createAdminSession, isCorrectAdminPassword, requireAdminSession } from "@/lib/admin-kiosko/auth";
import {
  createChecklistRecord,
  createCleaningRecord,
  createFryerOilRecord,
  createGoodsReceptionRecord,
  createIncidentRecord,
  createTemperatureRecord,
  updateEquipmentAlertStatus,
} from "@/lib/admin-kiosko/database";

export async function loginAdminKioskoAction(formData: FormData) {
  const password = String(formData.get("password") || "");

  if (!isCorrectAdminPassword(password)) {
    redirect("/admin-kiosko?error=1");
  }

  await createAdminSession();
  redirect("/admin-kiosko");
}

export async function logoutAdminKioskoAction() {
  await clearAdminSession();
  redirect("/admin-kiosko");
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function optionalNumber(formData: FormData, key: string) {
  const value = text(formData, key).replace(",", ".");
  return value ? Number(value) : undefined;
}

function checkbox(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function redirectAfterSave(path: string, result: { ok: true } | { ok: false; error: string }): never {
  revalidatePath(path);
  if (result.ok) {
    redirect(`${path}?saved=1`);
  }

  const error = encodeURIComponent(result.error.slice(0, 240));
  redirect(`${path}?error=${error}`);
}

export async function saveTemperatureRecordAction(formData: FormData) {
  await requireAdminSession();

  const result = await createTemperatureRecord({
    record_date: text(formData, "record_date"),
    record_time: text(formData, "record_time"),
    equipment: text(formData, "equipment"),
    temperature: Number(text(formData, "temperature").replace(",", ".")),
    status: text(formData, "status"),
    observations: text(formData, "observations"),
    responsible: text(formData, "responsible"),
  });

  redirectAfterSave("/admin-kiosko/temperaturas", result);
}

export async function updateEquipmentAlertStatusAction(formData: FormData) {
  await requireAdminSession();

  const status = text(formData, "status");
  const result = await updateEquipmentAlertStatus({
    id: text(formData, "id"),
    status: status === "solventado" ? "solventado" : status === "en_proceso" ? "en_proceso" : "pendiente",
    corrective_action: text(formData, "corrective_action"),
    resolved_by: text(formData, "resolved_by"),
  });

  redirectAfterSave("/admin-kiosko/temperaturas", result);
}

export async function saveCleaningRecordAction(formData: FormData) {
  await requireAdminSession();

  const result = await createCleaningRecord({
    record_date: text(formData, "record_date"),
    record_time: text(formData, "record_time"),
    area: text(formData, "area"),
    shift: text(formData, "shift"),
    cleaning_done: checkbox(formData, "cleaning_done"),
    products_used: text(formData, "products_used"),
    status: text(formData, "status"),
    observations: text(formData, "observations"),
    responsible: text(formData, "responsible"),
  });

  redirectAfterSave("/admin-kiosko/limpieza", result);
}

export async function saveFryerOilRecordAction(formData: FormData) {
  await requireAdminSession();

  const result = await createFryerOilRecord({
    record_date: text(formData, "record_date"),
    record_time: text(formData, "record_time"),
    fryer: text(formData, "fryer"),
    oil_status: text(formData, "oil_status"),
    oil_changed: checkbox(formData, "oil_changed"),
    polar_compounds: text(formData, "polar_compounds"),
    color_smell_check: text(formData, "color_smell_check"),
    status: text(formData, "status"),
    observations: text(formData, "observations"),
    responsible: text(formData, "responsible"),
  });

  redirectAfterSave("/admin-kiosko/aceite-freidora", result);
}

export async function saveGoodsReceptionRecordAction(formData: FormData) {
  await requireAdminSession();

  const result = await createGoodsReceptionRecord({
    record_date: text(formData, "record_date"),
    record_time: text(formData, "record_time"),
    supplier: text(formData, "supplier"),
    product: text(formData, "product"),
    delivery_temperature: optionalNumber(formData, "delivery_temperature"),
    accepted: checkbox(formData, "accepted"),
    batch_number: text(formData, "batch_number"),
    expiry_date: text(formData, "expiry_date"),
    status: text(formData, "status"),
    observations: text(formData, "observations"),
    responsible: text(formData, "responsible"),
  });

  redirectAfterSave("/admin-kiosko/recepcion-mercancia", result);
}

export async function saveIncidentRecordAction(formData: FormData) {
  await requireAdminSession();

  const result = await createIncidentRecord({
    record_date: text(formData, "record_date"),
    record_time: text(formData, "record_time"),
    incident_type: text(formData, "incident_type"),
    severity: text(formData, "severity"),
    corrective_action: text(formData, "corrective_action"),
    resolved: checkbox(formData, "resolved"),
    status: text(formData, "status"),
    observations: text(formData, "observations"),
    responsible: text(formData, "responsible"),
  });

  redirectAfterSave("/admin-kiosko/incidencias", result);
}

export async function saveChecklistRecordAction(formData: FormData) {
  await requireAdminSession();

  const items = ["item_1", "item_2", "item_3", "item_4"]
    .map((key) => text(formData, key))
    .filter(Boolean);

  const result = await createChecklistRecord({
    record_date: text(formData, "record_date"),
    record_time: text(formData, "record_time"),
    checklist_type: text(formData, "checklist_type"),
    items,
    completed: checkbox(formData, "completed"),
    status: text(formData, "status"),
    observations: text(formData, "observations"),
    responsible: text(formData, "responsible"),
  });

  redirectAfterSave("/admin-kiosko/checklists", result);
}
