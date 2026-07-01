"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearAdminSession, createAdminSession, isCorrectAdminPassword, requireAdminSession } from "@/lib/admin-kiosko/auth";
import { createDomainEvent, emitDomainEventSafe } from "@/lib/admin-kiosko/domain";
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
  createAiProcessingLog,
  createAiSupplierDocument,
  createAiTraceabilityItem,
  createAccountingDocument,
  createAccountingDocumentItem,
  createDocumentCorrections,
  createInventoryProduct,
  createInternalRecipe,
  createLabelRecord,
  createProductionBatch,
  createProductionMovement,
  ensureSupplierRecord,
  applyInventoryMovement,
  updateInventoryProduct,
  upsertInventoryFromAiReception,
  updateEquipmentAlertStatus,
  updateAccountingReconciliationStatus,
  updateUploadedDocumentReview,
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

function requiredNumber(formData: FormData, key: string) {
  const value = Number(text(formData, key).replace(",", "."));
  return Number.isFinite(value) ? value : 0;
}

function checkbox(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function checkboxValue(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function todayMadrid() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function timeMadrid() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function optionalDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const match = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!match) return "";

  const [, day, month, year] = match;
  const fullYear = year.length === 2 ? `20${year}` : year;
  return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function optionalMoney(value: string) {
  const normalized = value.replace(",", ".").replace(/[^\d.-]/g, "");
  const number = normalized ? Number(normalized) : undefined;
  return Number.isFinite(number) ? number : undefined;
}

function optionalQuantity(value: string) {
  const normalized = value.replace(",", ".").replace(/[^\d.-]/g, "");
  const number = normalized ? Number(normalized) : undefined;
  return Number.isFinite(number) ? number : undefined;
}

function temperatureFromText(value: string) {
  const match = value.replace(",", ".").match(/-?\d+(\.\d+)?/);
  const number = match ? Number(match[0]) : undefined;
  return Number.isFinite(number) ? number : undefined;
}

function hasCriticalObservation(value: string) {
  return /rechaz|incidencia|cr[ií]tic|mal estado|temperatura alta|caducad[ao]|no conforme/i.test(value);
}

async function resolveSupplierFromForm(formData: FormData, fieldPrefix = "supplier") {
  const selectedId = text(formData, `${fieldPrefix}_id`);
  const selectedName = text(formData, `${fieldPrefix}_name`) || text(formData, fieldPrefix);
  const newName = text(formData, `new_${fieldPrefix}_name`);
  const creatingNew = selectedId === "__new__" || selectedName === "__new__" || Boolean(newName);

  if (!creatingNew) {
    return selectedName;
  }

  const supplierName = newName || (selectedName === "__new__" ? "" : selectedName);
  if (!supplierName) return "";

  const ensured = await ensureSupplierRecord({
    supplier: supplierName,
    cif: text(formData, `new_${fieldPrefix}_tax_id`),
    phone: text(formData, `new_${fieldPrefix}_phone`),
    email: text(formData, `new_${fieldPrefix}_email`),
    contact: text(formData, `new_${fieldPrefix}_contact`),
    responsible_person: text(formData, `new_${fieldPrefix}_contact`),
    category: "Proveedor APPCC",
    status: "pendiente_datos_administrativos",
    observations: text(formData, `new_${fieldPrefix}_observations`) || "Proveedor registrado. Información administrativa pendiente de completar.",
  });

  return ensured.ok && ensured.data?.supplier ? ensured.data.supplier : supplierName;
}

function redirectAfterSave(path: string, result: { ok: true } | { ok: false; error: string }): never {
  revalidatePath(path);
  if (result.ok) {
    redirect(`${path}?saved=1`);
  }

  const error = encodeURIComponent(result.error.slice(0, 240));
  redirect(`${path}?error=${error}`);
}

async function redirectAfterSaveWithEvent(
  path: string,
  result: { ok: true } | { ok: false; error: string },
  onSuccess: () => Promise<unknown>,
): Promise<never> {
  revalidatePath(path);
  if (result.ok) {
    await onSuccess();
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

  await redirectAfterSaveWithEvent("/admin-kiosko/temperaturas", result, () => emitDomainEventSafe(createDomainEvent("TemperatureRecorded", {
    source: "appcc",
    payload: {
      equipment: text(formData, "equipment"),
      temperature: Number(text(formData, "temperature").replace(",", ".")),
      status: text(formData, "status"),
    },
  })));
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

  await redirectAfterSaveWithEvent("/admin-kiosko/limpieza", result, () => emitDomainEventSafe(createDomainEvent("CleaningRecorded", {
    source: "appcc",
    payload: {
      area: text(formData, "area"),
      status: text(formData, "status"),
    },
  })));
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
  const supplier = await resolveSupplierFromForm(formData);

  const result = await createGoodsReceptionRecord({
    record_date: text(formData, "record_date"),
    record_time: text(formData, "record_time"),
    supplier,
    product: text(formData, "product"),
    delivery_temperature: optionalNumber(formData, "delivery_temperature"),
    accepted: checkbox(formData, "accepted"),
    batch_number: text(formData, "batch_number"),
    expiry_date: text(formData, "expiry_date"),
    status: text(formData, "status"),
    observations: text(formData, "observations"),
    responsible: text(formData, "responsible"),
  });

  await redirectAfterSaveWithEvent("/admin-kiosko/recepcion-mercancia", result, () => emitDomainEventSafe(createDomainEvent("GoodsReceived", {
    source: "appcc",
    payload: {
      supplierName: supplier,
      items: [{
        productName: text(formData, "product"),
        batchNumber: text(formData, "batch_number"),
        quantity: undefined,
        expiryDate: text(formData, "expiry_date"),
      }],
    },
  })));
}

export async function saveAiReceptionAction(formData: FormData) {
  await requireAdminSession();

  const ocrJson = parseJson<Record<string, unknown>>(text(formData, "ocr_json"), {});
  const productCount = Number(text(formData, "product_count")) || 0;
  const supplier = await resolveSupplierFromForm(formData) || "Proveedor no identificado";
  const documentDate = optionalDate(text(formData, "document_date")) || todayMadrid();
  const recordTime = timeMadrid();
  const observations = text(formData, "observations");
  const temperature = temperatureFromText(text(formData, "temperature"));
  const products = Array.from({ length: productCount }, (_, index) => ({
    name: text(formData, `product_${index}_name`),
    quantity: text(formData, `product_${index}_quantity`),
    batch: text(formData, `product_${index}_batch`),
    expiry: optionalDate(text(formData, `product_${index}_expiry`)),
    price: optionalMoney(text(formData, `product_${index}_price`)),
    location: text(formData, `product_${index}_location`) || "Almacén",
    accepted: formData.get(`product_${index}_accepted`) !== "false",
  })).filter((product) => product.name || product.batch || product.expiry);
  const missingBatchOrExpiry = products.some((product) => !product.batch || !product.expiry);
  const missingTemperature = !Number.isFinite(temperature);
  const status = missingBatchOrExpiry || missingTemperature ? "revisar" : "correcto";
  const productSummary = `Recepción IA · ${products.length || 1} productos`;
  const cleanSummary = [
    `Documento: ${text(formData, "document_type") || "OCR IA"} ${text(formData, "document_number") || ""}`.trim(),
    `Proveedor: ${supplier}`,
    products.length ? `Productos: ${products.map((product) => product.name || "Sin nombre").join(", ")}` : "",
    missingBatchOrExpiry ? "Revisar lotes/caducidades no visibles cuando aplique." : "",
    missingTemperature ? "Temperatura no visible en el documento. Revisar si aplica." : "",
    observations,
  ].filter(Boolean).join("\n");

  const supplierDocument = await createAiSupplierDocument({
    document_type: text(formData, "document_type"),
    document_number: text(formData, "document_number"),
    document_date: documentDate,
    supplier_name: supplier,
    supplier_tax_id: text(formData, "supplier_tax_id"),
    total_amount: optionalMoney(text(formData, "total_amount")),
    original_filename: text(formData, "original_filename"),
    ocr_status: status,
    ocr_json: ocrJson,
    reviewed_by: "F. Javier Bocanegra Sanjuan",
  });

  if (!supplierDocument.ok) {
    await createAiProcessingLog({
      document_name: text(formData, "original_filename"),
      detected_type: text(formData, "detected_type"),
      status: "error",
      summary: "No se pudo guardar el documento OCR revisado.",
      raw_json: ocrJson,
      error_message: supplierDocument.error,
    });
    redirect(`/admin-kiosko/ia?error=${encodeURIComponent(supplierDocument.error.slice(0, 240))}`);
  }

  const uploadedDocumentId = text(formData, "uploaded_document_id");
  await updateUploadedDocumentReview(uploadedDocumentId, {
    review_status: "revisado",
    related_record_type: "admin_ai_supplier_documents",
    related_record_id: supplierDocument.data?.id,
    corrections: {
      supplier,
      supplier_tax_id: text(formData, "supplier_tax_id"),
      document_type: text(formData, "document_type"),
      document_number: text(formData, "document_number"),
      document_date: documentDate,
      taxable_base: text(formData, "taxable_base"),
      vat_amount: text(formData, "vat_amount"),
      total_amount: text(formData, "total_amount"),
      reception_temperature: text(formData, "reception_temperature"),
      observations,
      products,
    },
  });
  await emitDomainEventSafe(createDomainEvent("DocumentConfirmed", {
    source: "ocr",
    trace: { documentId: uploadedDocumentId, supplierDocumentId: supplierDocument.data?.id },
    payload: {
      uploadedDocumentId,
      confirmedType: text(formData, "document_type") || text(formData, "detected_type") || "other",
      corrections: {
        supplier,
        document_number: text(formData, "document_number"),
        document_date: documentDate,
        products,
      },
    },
  }));

  const accountingDocument = await createAccountingDocument({
    uploaded_document_id: uploadedDocumentId,
    supplier_name: supplier,
    supplier_tax_id: text(formData, "supplier_tax_id"),
    document_type: text(formData, "document_type"),
    document_number: text(formData, "document_number"),
    document_date: documentDate,
    taxable_base: optionalMoney(text(formData, "taxable_base")),
    vat_amount: optionalMoney(text(formData, "vat_amount")),
    total_amount: optionalMoney(text(formData, "total_amount")),
    reconciliation_status: "pendiente_conciliar",
    review_status: "revisado",
    observations: observations,
  });
  const accountingDocumentId = accountingDocument.ok ? accountingDocument.data?.id : undefined;
  if (accountingDocument.ok && accountingDocumentId) {
    await emitDomainEventSafe(createDomainEvent("AccountingDocumentCreated", {
      source: "accounting",
      trace: { documentId: uploadedDocumentId, accountingDocumentId },
      payload: {
        accountingDocumentId,
        uploadedDocumentId,
        documentType: text(formData, "document_type"),
        supplierName: supplier,
        totalAmount: optionalMoney(text(formData, "total_amount")),
      },
    }));
  }

  await createDocumentCorrections({
    document_id: uploadedDocumentId,
    accounting_document_id: accountingDocumentId,
    responsible: "F. Javier Bocanegra Sanjuan",
    corrections: [
      { field: "proveedor", ocrValue: ocrJson.proveedor || ocrJson.supplier || ocrJson.supplier_name, finalValue: supplier },
      { field: "cif", ocrValue: ocrJson.cif || ocrJson.supplier_tax_id, finalValue: text(formData, "supplier_tax_id") },
      { field: "fecha_documento", ocrValue: ocrJson.fecha || ocrJson.document_date, finalValue: documentDate },
      { field: "numero_documento", ocrValue: ocrJson.numero || ocrJson.document_number, finalValue: text(formData, "document_number") },
      { field: "base_imponible", ocrValue: ocrJson.base_imponible || ocrJson.taxable_base, finalValue: text(formData, "taxable_base") },
      { field: "iva", ocrValue: ocrJson.iva || ocrJson.vat_amount, finalValue: text(formData, "vat_amount") },
      { field: "total", ocrValue: ocrJson.total || ocrJson.total_amount, finalValue: text(formData, "total_amount") },
      { field: "temperatura_recepcion", ocrValue: ocrJson.temperatura, finalValue: text(formData, "temperature") },
    ],
  });

  await ensureSupplierRecord({
    supplier,
    cif: text(formData, "supplier_tax_id"),
    category: "Proveedor IA",
    status: "pendiente_datos_administrativos",
    observations: "Proveedor registrado desde recepción IA OCR. Información administrativa pendiente de completar.",
  });
  await emitDomainEventSafe(createDomainEvent("SupplierCreated", {
    source: "ocr",
    trace: { documentId: uploadedDocumentId },
    payload: {
      name: supplier,
      taxId: text(formData, "supplier_tax_id"),
      status: "pendiente_datos_administrativos",
    },
  }));

  for (const product of products) {
    const traceability = await createAiTraceabilityItem({
      supplier_document_id: supplierDocument.data.id,
      product_name: product.name,
      quantity: product.quantity,
      batch_number: product.batch,
      expiry_date: product.expiry,
      accepted: product.accepted,
      observations: !product.batch || !product.expiry ? "Dato no visible en el documento. Revisar si aplica." : "",
    });

    if (!traceability.ok) {
      redirect(`/admin-kiosko/ia?error=${encodeURIComponent(traceability.error.slice(0, 240))}`);
    }

    const inventory = await upsertInventoryFromAiReception({
      name: product.name,
      quantity: product.quantity,
      supplier,
      batch: product.batch,
      expiry: product.expiry,
      purchasePrice: product.price,
      location: product.location,
      entryDate: documentDate,
      documentId: supplierDocument.data.id,
      uploadedDocumentId,
    });
    if (inventory.ok) {
      await emitDomainEventSafe(createDomainEvent("InventoryLotCreated", {
        source: "inventory",
        trace: { documentId: uploadedDocumentId, productId: inventory.data?.id },
        payload: {
          productId: inventory.data?.id,
          productName: product.name,
          batchNumber: product.batch,
          quantity: optionalQuantity(product.quantity),
          unit: "ud",
          expiryDate: product.expiry,
        },
      }));
    }

    await createAccountingDocumentItem({
      accounting_document_id: accountingDocumentId,
      product_name: product.name,
      quantity: optionalQuantity(product.quantity),
      unit: "ud",
      unit_price: product.price,
      total_amount: product.price && optionalQuantity(product.quantity) ? Number((product.price * Number(optionalQuantity(product.quantity))).toFixed(2)) : product.price,
      batch_number: product.batch,
      expiry_date: product.expiry,
      inventory_product_id: inventory.ok ? inventory.data?.id : undefined,
    });
  }

  const goodsReception = await createGoodsReceptionRecord({
    record_date: documentDate,
    record_time: recordTime,
    supplier,
    product: productSummary,
    delivery_temperature: temperature,
    accepted: products.every((product) => product.accepted),
    batch_number: products.map((product) => product.batch).filter(Boolean).join(", "),
    expiry_date: products.find((product) => product.expiry)?.expiry || "",
    status,
    observations: cleanSummary,
    responsible: "F. Javier Bocanegra Sanjuan",
    created_by: "F. Javier Bocanegra Sanjuan",
    uploaded_document_id: uploadedDocumentId,
    supplier_document_id: supplierDocument.data.id,
  });

  if (!goodsReception.ok) {
    await createAiProcessingLog({
      document_name: text(formData, "original_filename"),
      detected_type: text(formData, "detected_type"),
      status: "error",
      summary: "Documento OCR guardado, pero falló el registro de recepción APPCC.",
      raw_json: ocrJson,
      error_message: goodsReception.error,
    });
    redirect(`/admin-kiosko/ia?error=${encodeURIComponent(goodsReception.error.slice(0, 240))}`);
  }
  await emitDomainEventSafe(createDomainEvent("GoodsReceived", {
    source: "ocr",
    trace: { documentId: uploadedDocumentId, supplierDocumentId: supplierDocument.data.id, accountingDocumentId },
    payload: {
      supplierName: supplier,
      uploadedDocumentId,
      items: products.map((product) => ({
        productName: product.name,
        batchNumber: product.batch,
        quantity: optionalQuantity(product.quantity),
        unit: "ud",
        expiryDate: product.expiry,
      })),
    },
  }));

  const expiredProducts = products.filter((product) => product.expiry && product.expiry < todayMadrid());
  const rejectedProducts = products.filter((product) => !product.accepted);
  const needsIncident = (Number.isFinite(temperature) && Number(temperature) > 8)
    || expiredProducts.length > 0
    || rejectedProducts.length > 0
    || hasCriticalObservation(observations);

  if (needsIncident) {
    const incident = await createIncidentRecord({
      record_date: documentDate,
      record_time: recordTime,
      incident_type: "recepción mercancía",
      severity: rejectedProducts.length || hasCriticalObservation(observations) ? "incidencia" : "revisar",
      corrective_action: "pendiente",
      resolved: false,
      status: "pendiente",
      observations: [
        Number.isFinite(temperature) && Number(temperature) > 8 ? `Temperatura recepción superior a 8 ºC: ${temperature} ºC.` : "",
        expiredProducts.length ? `Caducidad pasada: ${expiredProducts.map((product) => product.name || product.expiry).join(", ")}.` : "",
        rejectedProducts.length ? `Producto rechazado: ${rejectedProducts.map((product) => product.name || "Sin nombre").join(", ")}.` : "",
        hasCriticalObservation(observations) ? observations : "",
      ].filter(Boolean).join("\n"),
      responsible: "F. Javier Bocanegra Sanjuan",
      created_by: "F. Javier Bocanegra Sanjuan",
    });
    if (incident.ok) {
      await emitDomainEventSafe(createDomainEvent("IncidentCreated", {
        source: "appcc",
        trace: { documentId: uploadedDocumentId, supplierDocumentId: supplierDocument.data.id },
        payload: {
          incidentType: "recepción mercancía",
          severity: rejectedProducts.length || hasCriticalObservation(observations) ? "incidencia" : "revisar",
        },
      }));
    }
  }

  await createAiProcessingLog({
    document_name: text(formData, "original_filename"),
    detected_type: text(formData, "detected_type"),
    status,
    summary: `${supplier} · ${productSummary}`,
    raw_json: ocrJson,
  });

  ["/admin-kiosko/ia", "/admin-kiosko/recepcion-mercancia", "/admin-kiosko/registros", "/admin-kiosko/cronologia", "/admin-kiosko/inventario", "/admin-kiosko/trazabilidad"].forEach((path) => revalidatePath(path));
  const labelProduct = products.find((product) => product.name && product.batch) || products[0];
  if (labelProduct) {
    const label = await createLabelRecord({
      model: "Recepción",
      product: labelProduct.name,
      batch: labelProduct.batch,
      supplier,
      opening_date: documentDate,
      best_before_date: labelProduct.expiry,
      responsible: "F. Javier Bocanegra Sanjuan",
      print_format: "termica",
      copies: 1,
      template: "recepcion",
      zpl_version: "ZPL II",
    });
    if (label.ok) {
      await emitDomainEventSafe(createDomainEvent("LabelPrinted", {
        source: "labels",
        trace: { documentId: uploadedDocumentId, supplierDocumentId: supplierDocument.data.id },
        payload: {
          template: "recepcion",
          copies: 1,
          printer: "Zebra ZD421",
        },
      }));
    }
    const labelParams = new URLSearchParams({
      model: "Recepción",
      product: labelProduct.name,
      batch: labelProduct.batch,
      best_before_date: labelProduct.expiry,
      responsible: "F. Javier Bocanegra Sanjuan",
      supplier,
      opening_date: documentDate,
      print_format: "termica",
      copies: "1",
    });
    redirect(`/admin-kiosko/etiquetas?${labelParams.toString()}`);
  }

  redirect("/admin-kiosko/ia?saved=1");
}

export async function updateAccountingReconciliationAction(formData: FormData) {
  await requireAdminSession();

  const result = await updateAccountingReconciliationStatus({
    id: text(formData, "document_id"),
    status: text(formData, "reconciliation_status"),
    observations: text(formData, "observations"),
  });

  await redirectAfterSaveWithEvent("/admin-kiosko/contabilidad", result, () => emitDomainEventSafe(createDomainEvent("AccountingDocumentReconciled", {
    source: "accounting",
    trace: { accountingDocumentId: text(formData, "document_id") },
    payload: {
      accountingDocumentId: text(formData, "document_id"),
      status: text(formData, "reconciliation_status"),
    },
  })));
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

  await redirectAfterSaveWithEvent("/admin-kiosko/incidencias", result, () => emitDomainEventSafe(createDomainEvent("IncidentCreated", {
    source: "appcc",
    payload: {
      incidentType: text(formData, "incident_type"),
      severity: text(formData, "severity"),
    },
  })));
}

export async function saveProductionBatchAction(formData: FormData) {
  await requireAdminSession();
  const material = parseJson<{
    lot_id?: string;
    product_id?: string;
    product?: string;
    supplier?: string | null;
    batch?: string | null;
    unit?: string | null;
    expiry_date?: string | null;
    source_document_id?: string | null;
  }>(text(formData, "source_material"), {});
  const recipeShelfLifeDays = Math.ceil((optionalNumber(formData, "shelf_life_refrigerated_hours") || 0) / 24);
  const productionDate = text(formData, "production_date") || todayMadrid();
  const calculatedExpiry = recipeShelfLifeDays
    ? new Date(`${productionDate}T00:00:00.000Z`)
    : null;
  if (calculatedExpiry) calculatedExpiry.setUTCDate(calculatedExpiry.getUTCDate() + recipeShelfLifeDays);
  const expiryDate = text(formData, "expiry_date") || (calculatedExpiry ? calculatedExpiry.toISOString().slice(0, 10) : "");

  const result = await createProductionBatch({
    production_date: productionDate,
    production_time: text(formData, "production_time") || timeMadrid(),
    responsible: text(formData, "responsible"),
    source_lot_id: material.lot_id,
    source_product_id: material.product_id,
    source_supplier: material.supplier || "",
    source_product: material.product || "",
    source_batch_number: material.batch || "",
    input_quantity: optionalNumber(formData, "input_quantity"),
    input_unit: text(formData, "input_unit") || material.unit || "",
    output_product: text(formData, "output_product"),
    output_quantity: optionalNumber(formData, "output_quantity"),
    output_unit: text(formData, "output_unit"),
    unit_weight: optionalNumber(formData, "unit_weight"),
    storage_state: text(formData, "storage_state") || "refrigerado",
    expiry_date: expiryDate,
    observations: text(formData, "observations"),
    source_document_id: material.source_document_id || "",
  });

  revalidatePath("/admin-kiosko/produccion");
  revalidatePath("/admin-kiosko/inventario");
  revalidatePath("/admin-kiosko/trazabilidad");
  revalidatePath("/admin-kiosko/etiquetas");

  if (result.ok) {
    await emitDomainEventSafe(createDomainEvent("ProductionBatchCreated", {
      source: "production",
      trace: { productionBatchId: result.data.id, inventoryLotId: material.lot_id },
      payload: {
        productionBatchId: result.data.id,
        batchCode: result.data.batch_code,
        outputProduct: text(formData, "output_product"),
        outputQuantity: optionalNumber(formData, "output_quantity"),
        outputUnit: text(formData, "output_unit"),
        sourceInventoryLotId: material.lot_id,
      },
    }));
    const params = new URLSearchParams({
      model: "Elaboración",
      product: text(formData, "output_product"),
      batch: result.data.batch_code,
      supplier: material.supplier || "",
      source_batch_number: material.batch || "",
      elaboration_date: productionDate,
      best_before_date: expiryDate,
      responsible: text(formData, "responsible") || "F. Javier Bocanegra Sanjuan",
      print_format: "termica",
      copies: "1",
    });
    if (result.data.warnings.length) params.set("warning", result.data.warnings.join(" · ").slice(0, 240));
    redirect(`/admin-kiosko/etiquetas?${params.toString()}`);
  }

  redirect(`/admin-kiosko/produccion?error=${encodeURIComponent(result.error.slice(0, 240))}`);
}

export async function saveProductionMovementAction(formData: FormData) {
  await requireAdminSession();

  const movementType = text(formData, "movement_type") as Parameters<typeof createProductionMovement>[0]["movement_type"];
  const result = await createProductionMovement({
    batch_id: text(formData, "batch_id"),
    movement_date: text(formData, "movement_date") || todayMadrid(),
    movement_time: text(formData, "movement_time") || timeMadrid(),
    movement_type: movementType,
    quantity: optionalNumber(formData, "quantity"),
    unit: text(formData, "unit"),
    from_state: text(formData, "from_state"),
    to_state: text(formData, "to_state"),
    reason: text(formData, "reason"),
    responsible: text(formData, "responsible"),
    observations: text(formData, "observations"),
    expiry_date: text(formData, "expiry_date"),
  });

  redirectAfterSave("/admin-kiosko/produccion", result);
}

export async function saveInternalRecipeAction(formData: FormData) {
  await requireAdminSession();
  const inputProduct = parseJson<{ id?: string; name?: string; unit?: string }>(text(formData, "recipe_input_product"), {});

  const result = await createInternalRecipe({
    id: text(formData, "id"),
    recipe_name: text(formData, "recipe_name"),
    output_product: text(formData, "output_product"),
    expected_yield: optionalNumber(formData, "expected_yield"),
    output_unit: text(formData, "output_unit"),
    unit_weight: optionalNumber(formData, "unit_weight"),
    expected_waste: optionalNumber(formData, "expected_waste"),
    final_weight: optionalNumber(formData, "final_weight"),
    prep_time_minutes: optionalNumber(formData, "prep_time_minutes"),
    shelf_life_refrigerated_hours: optionalNumber(formData, "shelf_life_refrigerated_hours"),
    shelf_life_frozen_days: optionalNumber(formData, "shelf_life_frozen_days"),
    conservation_type: text(formData, "conservation_type"),
    status: text(formData, "status"),
    instructions: text(formData, "instructions"),
    input_product_id: inputProduct.id || text(formData, "input_product_id"),
    input_product: inputProduct.name || text(formData, "input_product"),
    input_quantity: optionalNumber(formData, "input_quantity"),
    input_unit: text(formData, "input_unit") || inputProduct.unit || "",
    active: true,
  });

  redirectAfterSave("/admin-kiosko/produccion", result);
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

  await redirectAfterSaveWithEvent("/admin-kiosko/inspecciones", result, () => emitDomainEventSafe(createDomainEvent("InspectionRecordCreated", {
    source: "inspection",
    payload: {
      inspectionDate: text(formData, "inspection_date"),
      result: text(formData, "result"),
    },
  })));
}

export async function saveSupplierRecordAction(formData: FormData) {
  await requireAdminSession();

  const result = await createSupplierRecord({
    supplier: text(formData, "supplier"),
    cif: text(formData, "cif"),
    status: text(formData, "status") || "pendiente_datos_administrativos",
    contact: text(formData, "contact"),
    phone: text(formData, "phone"),
    email: text(formData, "email"),
    responsible_person: text(formData, "responsible_person"),
    schedule: text(formData, "schedule"),
    usual_products: text(formData, "usual_products"),
    category: text(formData, "category"),
    certificates: text(formData, "certificates"),
    health_register: text(formData, "health_register"),
    appcc: text(formData, "appcc"),
    invoices: text(formData, "invoices"),
    delivery_notes: text(formData, "delivery_notes"),
    ocr_documents: text(formData, "ocr_documents"),
    receptions: text(formData, "receptions"),
    incidents: text(formData, "incidents"),
    reception_temperatures: text(formData, "reception_temperatures"),
    ai_history: text(formData, "ai_history"),
    observations: text(formData, "observations"),
  });

  await redirectAfterSaveWithEvent("/admin-kiosko/proveedores", result, () => emitDomainEventSafe(createDomainEvent("SupplierCreated", {
    source: "appcc",
    payload: {
      name: text(formData, "supplier"),
      taxId: text(formData, "cif"),
      status: text(formData, "status") || "pendiente_datos_administrativos",
    },
  })));
}

export async function saveInventoryProductAction(formData: FormData) {
  await requireAdminSession();

  const id = text(formData, "id");
  const payload = {
    id,
    name: text(formData, "name"),
    category: text(formData, "category"),
    usual_supplier: text(formData, "usual_supplier"),
    unit: text(formData, "unit") || "ud",
    current_stock: requiredNumber(formData, "current_stock"),
    minimum_stock: requiredNumber(formData, "minimum_stock"),
    recommended_stock: requiredNumber(formData, "recommended_stock"),
    last_purchase_price: requiredNumber(formData, "last_purchase_price"),
    average_purchase_price: requiredNumber(formData, "last_purchase_price"),
    location: text(formData, "location"),
    current_batch: text(formData, "current_batch"),
    expiry_date: text(formData, "expiry_date"),
    observations: text(formData, "observations"),
    active: formData.get("active") !== "false",
  };
  const result = id ? await updateInventoryProduct(payload) : await createInventoryProduct(payload);

  ["/admin-kiosko/inventario", "/admin-kiosko", "/admin-kiosko/inspeccion-express"].forEach((path) => revalidatePath(path));
  redirectAfterSave("/admin-kiosko/inventario", result);
}

export async function saveInventoryMovementAction(formData: FormData) {
  await requireAdminSession();

  const movement = text(formData, "movement_type");
  const movementType = ["entrada", "consumo", "merma", "regularizacion", "baja"].includes(movement)
    ? movement as "entrada" | "consumo" | "merma" | "regularizacion" | "baja"
    : "consumo";
  const result = await applyInventoryMovement({
    product_id: text(formData, "product_id"),
    lot_id: text(formData, "lot_id"),
    movement_type: movementType,
    quantity: requiredNumber(formData, "quantity"),
    unit: text(formData, "unit"),
    supplier: text(formData, "supplier"),
    batch_number: text(formData, "batch_number"),
    expiry_date: text(formData, "expiry_date"),
    observations: text(formData, "observations"),
  });

  ["/admin-kiosko/inventario", "/admin-kiosko/trazabilidad", "/admin-kiosko", "/admin-kiosko/inspeccion-express"].forEach((path) => revalidatePath(path));
  await redirectAfterSaveWithEvent("/admin-kiosko/inventario", result, () => emitDomainEventSafe(createDomainEvent(
    movementType === "entrada" ? "InventoryLotCreated" : "InventoryLotConsumed",
    {
      source: "inventory",
      trace: { productId: text(formData, "product_id"), inventoryLotId: text(formData, "lot_id") },
      payload: movementType === "entrada"
        ? {
            inventoryLotId: text(formData, "lot_id") || undefined,
            productId: text(formData, "product_id"),
            productName: text(formData, "product_name") || text(formData, "product_id"),
            batchNumber: text(formData, "batch_number"),
            quantity: requiredNumber(formData, "quantity"),
            unit: text(formData, "unit"),
            expiryDate: text(formData, "expiry_date"),
          }
        : {
            inventoryLotId: text(formData, "lot_id") || undefined,
            productId: text(formData, "product_id"),
            quantity: requiredNumber(formData, "quantity"),
            unit: text(formData, "unit"),
            reason: movementType,
          },
    },
  )));
}

export async function saveLabelRecordAction(formData: FormData) {
  await requireAdminSession();
  const supplier = await resolveSupplierFromForm(formData);

  const result = await createLabelRecord({
    model: text(formData, "model"),
    product: text(formData, "product"),
    batch: text(formData, "batch"),
    supplier,
    elaboration_date: text(formData, "elaboration_date"),
    opening_date: text(formData, "opening_date"),
    freezing_date: text(formData, "freezing_date"),
    defrosting_date: text(formData, "defrosting_date"),
    best_before_date: text(formData, "best_before_date"),
    responsible: text(formData, "responsible"),
    print_format: text(formData, "print_format"),
    copies: Math.max(1, Math.min(48, Math.round(requiredNumber(formData, "copies") || 8))),
  });

  revalidatePath("/admin-kiosko/etiquetas");
  await redirectAfterSaveWithEvent("/admin-kiosko/etiquetas", result, () => emitDomainEventSafe(createDomainEvent("LabelPrinted", {
    source: "labels",
    payload: {
      template: text(formData, "model") || text(formData, "template") || "etiqueta",
      copies: Math.max(1, Math.min(48, Math.round(requiredNumber(formData, "copies") || 8))),
      printer: text(formData, "printer") || "Zebra ZD421",
    },
  })));
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

  await redirectAfterSaveWithEvent("/admin-kiosko/agua", result, () => emitDomainEventSafe(createDomainEvent("WaterControlRecorded", {
    source: "appcc",
    payload: {
      recordDate: text(formData, "record_date"),
      status: text(formData, "status") || text(formData, "chlorine") || "registrado",
    },
  })));
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
