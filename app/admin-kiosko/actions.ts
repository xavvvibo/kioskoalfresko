"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearAdminSession, createAdminSession, isCorrectAdminPassword, requireAdminSession } from "@/lib/admin-kiosko/auth";
import {
  createChecklistRecord,
  createCleaningRecord,
  createAnnualVerification,
  createEquipmentAsset,
  createFryerOilRecord,
  createGoodsReceptionRecord,
  createInspectionRecord,
  createMaintenanceRecord,
  createMonthlySignature,
  createSupplierRecord,
  createWaterRecord,
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

function checkboxValue(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
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

export async function signMonthlyAppccReportAction(formData: FormData) {
  await requireAdminSession();

  const year = Number(text(formData, "year"));
  const month = Number(text(formData, "month"));
  const result = await createMonthlySignature({
    year,
    month,
    signed_by: text(formData, "signed_by"),
    signature_note: text(formData, "signature_note"),
  });

  revalidatePath("/admin-kiosko/registros/informe");
  if (result.ok) {
    redirect(`/admin-kiosko/registros/informe?year=${year}&month=${String(month).padStart(2, "0")}&saved=1`);
  }

  const error = encodeURIComponent(result.error.slice(0, 240));
  redirect(`/admin-kiosko/registros/informe?year=${year}&month=${String(month).padStart(2, "0")}&error=${error}`);
}

export async function saveChecklistOpeningAction(formData: FormData) {
  await requireAdminSession();

  const checks = [
    "Arcón frío correcto",
    "Arcón congelador correcto",
    "Lavamanos operativo",
    "Productos etiquetados",
    "Limpieza realizada",
    "Termómetros revisados",
    "Sin incidencias",
  ];
  const items = checks.filter((_, index) => checkboxValue(formData, `check_${index}`));
  const result = await createChecklistRecord({
    record_date: text(formData, "record_date"),
    record_time: text(formData, "record_time"),
    checklist_type: "Apertura APPCC",
    items,
    completed: items.length === checks.length,
    status: items.length === checks.length ? "correcto" : "revisar",
    observations: text(formData, "observations"),
    responsible: text(formData, "responsible"),
  });

  redirectAfterSave("/admin-kiosko/checklists/apertura", result);
}

export async function saveChecklistClosingAction(formData: FormData) {
  await requireAdminSession();

  const checks = [
    "Basura retirada",
    "Superficies desinfectadas",
    "Arcón frío cerrado",
    "Freidoras apagadas",
    "Productos almacenados",
    "Incidencias registradas",
  ];
  const items = checks.filter((_, index) => checkboxValue(formData, `check_${index}`));
  const result = await createChecklistRecord({
    record_date: text(formData, "record_date"),
    record_time: text(formData, "record_time"),
    checklist_type: "Cierre APPCC",
    items,
    completed: items.length === checks.length,
    status: items.length === checks.length ? "correcto" : "revisar",
    observations: text(formData, "observations"),
    responsible: text(formData, "responsible"),
  });

  redirectAfterSave("/admin-kiosko/checklists/cierre", result);
}

export async function saveInspectionRecordAction(formData: FormData) {
  await requireAdminSession();

  const result = await createInspectionRecord({
    inspection_date: text(formData, "inspection_date"),
    inspector: text(formData, "inspector"),
    organization: text(formData, "organization"),
    result: text(formData, "result"),
    observations: text(formData, "observations"),
    requirements: text(formData, "requirements"),
    deadline: text(formData, "deadline"),
    status: text(formData, "status"),
    actions_done: text(formData, "actions_done"),
    responsible: text(formData, "responsible"),
    documentation: text(formData, "documentation"),
  });

  redirectAfterSave("/admin-kiosko/inspecciones", result);
}

export async function saveSupplierRecordAction(formData: FormData) {
  await requireAdminSession();

  const result = await createSupplierRecord({
    supplier: text(formData, "supplier"),
    cif: text(formData, "cif"),
    phone: text(formData, "phone"),
    email: text(formData, "email"),
    category: text(formData, "category"),
    certificates: text(formData, "certificates"),
    observations: text(formData, "observations"),
  });

  redirectAfterSave("/admin-kiosko/proveedores", result);
}

export async function saveEquipmentAssetAction(formData: FormData) {
  await requireAdminSession();

  const result = await createEquipmentAsset({
    name: text(formData, "name"),
    brand: text(formData, "brand"),
    model: text(formData, "model"),
    serial_number: text(formData, "serial_number"),
    purchase_date: text(formData, "purchase_date"),
    installation_date: text(formData, "installation_date"),
    location: text(formData, "location"),
    last_maintenance: text(formData, "last_maintenance"),
    next_maintenance: text(formData, "next_maintenance"),
    fault_history: text(formData, "fault_history"),
    status: text(formData, "status"),
  });

  redirectAfterSave("/admin-kiosko/equipos", result);
}

export async function saveMaintenanceRecordAction(formData: FormData) {
  await requireAdminSession();

  const result = await createMaintenanceRecord({
    record_date: text(formData, "record_date"),
    equipment: text(formData, "equipment"),
    intervention: text(formData, "intervention"),
    company: text(formData, "company"),
    invoice: text(formData, "invoice"),
    observations: text(formData, "observations"),
    responsible: text(formData, "responsible"),
  });

  redirectAfterSave("/admin-kiosko/mantenimiento", result);
}

export async function saveWaterRecordAction(formData: FormData) {
  await requireAdminSession();

  const result = await createWaterRecord({
    record_date: text(formData, "record_date"),
    color: text(formData, "color"),
    smell: text(formData, "smell"),
    taste: text(formData, "taste"),
    chlorine: text(formData, "chlorine"),
    observations: text(formData, "observations"),
    responsible: text(formData, "responsible"),
  });

  redirectAfterSave("/admin-kiosko/agua", result);
}

export async function saveAnnualVerificationAction(formData: FormData) {
  await requireAdminSession();

  const result = await createAnnualVerification({
    record_date: text(formData, "record_date"),
    appcc_reviewed: checkboxValue(formData, "appcc_reviewed"),
    health_memory_reviewed: checkboxValue(formData, "health_memory_reviewed"),
    allergens_reviewed: checkboxValue(formData, "allergens_reviewed"),
    suppliers_reviewed: checkboxValue(formData, "suppliers_reviewed"),
    cleaning_products_reviewed: checkboxValue(formData, "cleaning_products_reviewed"),
    equipment_reviewed: checkboxValue(formData, "equipment_reviewed"),
    handler_training: checkboxValue(formData, "handler_training"),
    documentation_complete: checkboxValue(formData, "documentation_complete"),
    observations: text(formData, "observations"),
    responsible: text(formData, "responsible"),
  });

  redirectAfterSave("/admin-kiosko/verificacion-anual", result);
}
