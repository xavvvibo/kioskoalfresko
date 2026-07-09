import "server-only";

import { createLabelRecord } from "@/lib/admin-kiosko/database";
import { buildGodex80x50AppccTraceabilityEzpl, isValidGodex80x50Ezpl } from "@/lib/admin-kiosko/printing/godex-80x50-ezpl.mjs";
import { DEFAULT_GODEX_G500_PRINTER_KEY } from "@/lib/admin-kiosko/printing/print-service";
import { enqueuePrintJob, type PrintJob } from "@/lib/admin-kiosko/repositories/print-jobs.repository";
import { adminSupabaseRequest } from "@/lib/admin-kiosko/repositories/legacy-core";

export const PALOMITAS_TRACEABILITY = {
  supplierName: "Carnicería Palomitas",
  supplierSearch: "palomitas",
  supplierTaxId: "24065365-M",
  stall: "30",
  purchaseDate: "2026-06-17",
  ticketTime: "12:34",
  ticketRef: "#017843",
  ticketTotal: "158,18 €",
  freezingDate: "2026-06-18",
  originalFreshExpiryDate: "2026-06-30",
  thawQuantity: 1,
  frozenQuantity: 1.8,
  unit: "kg",
  defrostTime: "00:00",
  defaultUseHours: 24,
};

type DbResult<T> = { ok: true; data: T } | { ok: false; error: string };

export type PalomitasLotRow = {
  id: string;
  created_at?: string | null;
  updated_at?: string | null;
  product_id: string | null;
  product_name: string | null;
  supplier_id?: string | null;
  supplier_name: string | null;
  supplier_document_id?: string | null;
  uploaded_document_id?: string | null;
  batch_number: string | null;
  expiry_date: string | null;
  received_date: string | null;
  initial_quantity: number | null;
  current_quantity: number | null;
  unit: string | null;
  location: string | null;
  purchase_price?: number | null;
  average_unit_cost?: number | null;
  status: string | null;
  observations: string | null;
  source: string | null;
};

export type PalomitasLabelVariant = "defrosting" | "frozen";

export type PalomitasLabelData = {
  variant: PalomitasLabelVariant;
  title: string;
  state: string;
  productName: string;
  quantityText: string;
  supplierName: string;
  ticketRef: string;
  purchaseDate: string;
  freezingDate: string;
  originalFreshExpiryDate: string;
  defrostedAt?: string;
  useBy?: string;
  storage: string;
  warning: string;
  note: string;
  responsible: string;
  batchCode: string;
  traceValue: string;
  inventoryLotId: string;
  parentLotId: string;
  productId: string;
};

type SplitResult = {
  parentLot: PalomitasLotRow;
  thawedLot: PalomitasLotRow;
};

const lotSelect = [
  "id",
  "created_at",
  "updated_at",
  "product_id",
  "product_name",
  "supplier_id",
  "supplier_name",
  "supplier_document_id",
  "uploaded_document_id",
  "batch_number",
  "expiry_date",
  "received_date",
  "initial_quantity",
  "current_quantity",
  "unit",
  "location",
  "purchase_price",
  "average_unit_cost",
  "status",
  "observations",
  "source",
].join(",");

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNumber(value: unknown) {
  const number = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(number) ? number : 0;
}

function sameQuantity(left: number, right: number) {
  return Math.abs(left - right) < 0.001;
}

function formatKg(quantity: number) {
  return `${quantity.toFixed(3).replace(".", ",")} kg`;
}

function madridDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDays(date: string, days: number) {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function displayDate(date: string) {
  const [year, month, day] = date.split("-");
  return year && month && day ? `${day}/${month}/${year}` : date;
}

function displayDateTime(date: string, time: string) {
  return `${displayDate(date)} ${time}`;
}

function splitKey(parentLotId: string) {
  return `palomitas_017843_split:${parentLotId}`;
}

function childBatch(parent: PalomitasLotRow, date: string) {
  const base = cleanText(parent.batch_number) || parent.id.slice(0, 8);
  return `${base}-DES-${date.replace(/-/g, "")}`;
}

function appendObservation(current: string | null | undefined, lines: string[]) {
  const previous = cleanText(current);
  return [previous, ...lines.filter(Boolean)].filter(Boolean).join("\n").slice(0, 2000);
}

function isDefrostedLot(lot: PalomitasLotRow) {
  return /descongel|en uso|refrigerado 0-4/i.test([
    lot.status,
    lot.location,
    lot.observations,
  ].filter(Boolean).join(" "));
}

async function getLotById(lotId: string): Promise<DbResult<PalomitasLotRow | null>> {
  if (!cleanText(lotId)) return { ok: true, data: null };
  const result = await adminSupabaseRequest<PalomitasLotRow[]>("admin_inventory_lots", {
    method: "GET",
    query: `?select=${lotSelect}&id=eq.${encodeURIComponent(lotId)}&limit=1`,
  });
  if (!result.ok) return result;
  return { ok: true, data: result.data[0] || null };
}

async function getLotsForRuntimeSearch(): Promise<DbResult<PalomitasLotRow[]>> {
  const result = await adminSupabaseRequest<PalomitasLotRow[]>("admin_inventory_lots", {
    method: "GET",
    query: `?select=${lotSelect}&order=created_at.desc&limit=1000`,
  });
  if (!result.ok) return result;
  return { ok: true, data: result.data };
}

async function patchLot(lotId: string, payload: Record<string, unknown>) {
  return adminSupabaseRequest<undefined>("admin_inventory_lots", {
    method: "PATCH",
    query: `?id=eq.${encodeURIComponent(lotId)}`,
    body: JSON.stringify(payload),
    headers: { Prefer: "return=minimal" },
  });
}

async function insertLot(payload: Record<string, unknown>) {
  return adminSupabaseRequest<PalomitasLotRow[]>("admin_inventory_lots", {
    method: "POST",
    query: `?select=${lotSelect}`,
    body: JSON.stringify(payload),
    headers: { Prefer: "return=representation" },
  });
}

async function insertMovement(payload: Record<string, unknown>) {
  return adminSupabaseRequest<undefined>("admin_inventory_lot_movements", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { Prefer: "return=minimal" },
  });
}

async function findThawedChild(parentLotId: string): Promise<DbResult<PalomitasLotRow | null>> {
  const key = splitKey(parentLotId);
  const result = await adminSupabaseRequest<PalomitasLotRow[]>("admin_inventory_lots", {
    method: "GET",
    query: `?select=${lotSelect}&observations=ilike.*${encodeURIComponent(key)}*&order=created_at.desc&limit=10`,
  });
  if (!result.ok) return result;
  return { ok: true, data: result.data.find(isDefrostedLot) || null };
}

export function buildPalomitasLabelData(input: {
  variant: PalomitasLabelVariant;
  parentLot: PalomitasLotRow;
  thawedLot?: PalomitasLotRow | null;
  responsible?: string;
  registerDate?: string;
}): PalomitasLabelData {
  const registerDate = input.registerDate || madridDate();
  const useByDate = addDays(registerDate, 1);
  const parent = input.parentLot;
  const thawedLot = input.thawedLot;
  const productName = cleanText(parent.product_name);
  const parentBatch = cleanText(parent.batch_number);
  const responsible = cleanText(input.responsible) || "F. Javier Bocanegra Sanjuan";
  const parentLotId = parent.id;
  const productId = cleanText(parent.product_id);

  if (input.variant === "defrosting") {
    const batchCode = cleanText(thawedLot?.batch_number) || childBatch(parent, registerDate);
    const inventoryLotId = cleanText(thawedLot?.id) || parentLotId;
    return {
      variant: "defrosting",
      title: "Etiqueta A",
      state: "DESCONGELANDO / EN USO",
      productName,
      quantityText: formatKg(PALOMITAS_TRACEABILITY.thawQuantity),
      supplierName: PALOMITAS_TRACEABILITY.supplierName,
      ticketRef: PALOMITAS_TRACEABILITY.ticketRef,
      purchaseDate: displayDate(PALOMITAS_TRACEABILITY.purchaseDate),
      freezingDate: displayDate(PALOMITAS_TRACEABILITY.freezingDate),
      originalFreshExpiryDate: displayDate(PALOMITAS_TRACEABILITY.originalFreshExpiryDate),
      defrostedAt: displayDateTime(registerDate, PALOMITAS_TRACEABILITY.defrostTime),
      useBy: displayDateTime(useByDate, PALOMITAS_TRACEABILITY.defrostTime),
      storage: "Refrigerado 0-4 C",
      warning: "NO RECONGELAR",
      note: "24h desde salida a descongelar",
      responsible,
      batchCode,
      traceValue: `ERP:palomitas:${PALOMITAS_TRACEABILITY.ticketRef}:${inventoryLotId}:descongelando`,
      inventoryLotId,
      parentLotId,
      productId,
    };
  }

  return {
    variant: "frozen",
    title: "Etiqueta B",
    state: "CONGELADO / RESERVA",
    productName,
    quantityText: formatKg(PALOMITAS_TRACEABILITY.frozenQuantity),
    supplierName: PALOMITAS_TRACEABILITY.supplierName,
    ticketRef: PALOMITAS_TRACEABILITY.ticketRef,
    purchaseDate: displayDate(PALOMITAS_TRACEABILITY.purchaseDate),
    freezingDate: displayDate(PALOMITAS_TRACEABILITY.freezingDate),
    originalFreshExpiryDate: displayDate(PALOMITAS_TRACEABILITY.originalFreshExpiryDate),
    storage: "Mantener a -18 C",
    warning: "NO RECONGELAR TRAS DESCONGELAR",
    note: "Reenvasado/desenvasado. Mantener protegido y cerrado en envase alimentario",
    responsible,
    batchCode: parentBatch,
    traceValue: `ERP:palomitas:${PALOMITAS_TRACEABILITY.ticketRef}:${parentLotId}:congelado`,
    inventoryLotId: parentLotId,
    parentLotId,
    productId,
  };
}

export const palomitasTraceabilityService = {
  async findCandidateLots(): Promise<DbResult<PalomitasLotRow[]>> {
    const result = await getLotsForRuntimeSearch();
    if (!result.ok) return result;

    const candidates = result.data.filter((lot) => {
      const haystack = [
        lot.product_name,
        lot.supplier_name,
        lot.batch_number,
        lot.expiry_date,
        lot.received_date,
        lot.location,
        lot.observations,
        lot.source,
      ].filter(Boolean).join(" ").toLowerCase();

      return haystack.includes(PALOMITAS_TRACEABILITY.supplierSearch)
        || haystack.includes("017843")
        || lot.received_date === PALOMITAS_TRACEABILITY.purchaseDate
        || lot.expiry_date === PALOMITAS_TRACEABILITY.originalFreshExpiryDate;
    });

    return { ok: true, data: candidates };
  },

  async getSplitState(parentLotId: string): Promise<DbResult<{ parentLot: PalomitasLotRow; thawedLot: PalomitasLotRow | null } | null>> {
    const parent = await getLotById(parentLotId);
    if (!parent.ok) return parent;
    if (!parent.data) return { ok: true, data: null };
    const thawed = await findThawedChild(parentLotId);
    if (!thawed.ok) return thawed;
    return { ok: true, data: { parentLot: parent.data, thawedLot: thawed.data } };
  },

  async registerSplit(input: { parentLotId: string; responsible: string; registerDate?: string }): Promise<DbResult<SplitResult>> {
    const registerDate = cleanText(input.registerDate) || madridDate();
    const parentResult = await getLotById(input.parentLotId);
    if (!parentResult.ok) return parentResult;
    const parent = parentResult.data;
    if (!parent) return { ok: false, error: "No se ha localizado el lote original." };
    if (!cleanText(parent.product_name)) return { ok: false, error: "El lote no tiene nombre de producto. No se genera trazabilidad incompleta." };
    if (!cleanText(parent.batch_number)) return { ok: false, error: "El lote no tiene lote interno/proveedor. No se genera trazabilidad incompleta." };
    if (isDefrostedLot(parent)) return { ok: false, error: "Este lote ya aparece como descongelado/en uso. No se permite recongelar ni dividir como congelado." };

    const existingChild = await findThawedChild(parent.id);
    if (!existingChild.ok) return existingChild;
    if (existingChild.data) {
      return { ok: true, data: { parentLot: parent, thawedLot: existingChild.data } };
    }

    const currentQuantity = normalizeNumber(parent.current_quantity);
    const expectedTotal = PALOMITAS_TRACEABILITY.thawQuantity + PALOMITAS_TRACEABILITY.frozenQuantity;
    if (!sameQuantity(currentQuantity, expectedTotal)) {
      return { ok: false, error: `La cantidad disponible del lote debe ser ${formatKg(expectedTotal)} antes del split. Actual: ${formatKg(currentQuantity)}.` };
    }
    if (PALOMITAS_TRACEABILITY.thawQuantity <= 0 || PALOMITAS_TRACEABILITY.frozenQuantity <= 0) {
      return { ok: false, error: "Las cantidades del split deben ser positivas." };
    }
    if (PALOMITAS_TRACEABILITY.thawQuantity > currentQuantity) {
      return { ok: false, error: "No se puede descongelar mas stock del disponible." };
    }

    const key = splitKey(parent.id);
    const responsible = cleanText(input.responsible) || "F. Javier Bocanegra Sanjuan";
    const useByDate = addDays(registerDate, 1);
    const child = await insertLot({
      product_id: parent.product_id,
      product_name: parent.product_name,
      supplier_id: parent.supplier_id,
      supplier_name: PALOMITAS_TRACEABILITY.supplierName,
      supplier_document_id: parent.supplier_document_id,
      uploaded_document_id: parent.uploaded_document_id,
      batch_number: childBatch(parent, registerDate),
      expiry_date: useByDate,
      received_date: registerDate,
      initial_quantity: PALOMITAS_TRACEABILITY.thawQuantity,
      current_quantity: PALOMITAS_TRACEABILITY.thawQuantity,
      unit: PALOMITAS_TRACEABILITY.unit,
      location: "Refrigerado 0-4 C",
      purchase_price: parent.purchase_price,
      average_unit_cost: parent.average_unit_cost,
      status: "activo",
      observations: [
        `IdempotencyKey: ${key}`,
        `Lote original: ${parent.id}`,
        `Ticket/ref: ${PALOMITAS_TRACEABILITY.ticketRef}`,
        `Proveedor: ${PALOMITAS_TRACEABILITY.supplierName} (${PALOMITAS_TRACEABILITY.supplierTaxId}), puesto ${PALOMITAS_TRACEABILITY.stall}`,
        `Compra: ${PALOMITAS_TRACEABILITY.purchaseDate} ${PALOMITAS_TRACEABILITY.ticketTime}`,
        `Congelado: ${PALOMITAS_TRACEABILITY.freezingDate}`,
        `Caducidad original fresco: ${PALOMITAS_TRACEABILITY.originalFreshExpiryDate}`,
        `Salida a descongelar: ${registerDate} ${PALOMITAS_TRACEABILITY.defrostTime}`,
        `Limite operativo uso: ${useByDate} ${PALOMITAS_TRACEABILITY.defrostTime}`,
        "NO RECONGELAR.",
      ].join("\n"),
      source: "admin-kiosko-appcc-split",
    });
    if (!child.ok) return child;
    const thawedLot = child.data[0];
    if (!thawedLot) return { ok: false, error: "No se pudo crear el lote descongelando." };

    const patchedParent = await patchLot(parent.id, {
      updated_at: new Date().toISOString(),
      current_quantity: PALOMITAS_TRACEABILITY.frozenQuantity,
      unit: PALOMITAS_TRACEABILITY.unit,
      location: "Congelador -18 C",
      status: "activo",
      observations: appendObservation(parent.observations, [
        `IdempotencyKey: ${key}`,
        `Congelado desde ${PALOMITAS_TRACEABILITY.freezingDate}. Caducidad original fresco ${PALOMITAS_TRACEABILITY.originalFreshExpiryDate}.`,
        `Split APPCC ${registerDate}: ${formatKg(PALOMITAS_TRACEABILITY.thawQuantity)} descongelando/en uso (${thawedLot.id}); ${formatKg(PALOMITAS_TRACEABILITY.frozenQuantity)} permanece congelado.`,
        "Reenvasado/desenvasado. Mantener protegido y cerrado en envase alimentario.",
      ]),
    });
    if (!patchedParent.ok) return patchedParent;

    await insertMovement({
      lot_id: parent.id,
      product_id: parent.product_id,
      movement_type: "congelacion",
      movement_date: PALOMITAS_TRACEABILITY.freezingDate,
      movement_time: "00:00",
      quantity: currentQuantity,
      unit: PALOMITAS_TRACEABILITY.unit,
      to_location: "Congelador -18 C",
      reason: "Congelacion de producto fresco comprado en Carniceria Palomitas.",
      responsible,
      related_record_type: "admin_inventory_lots",
      related_record_id: parent.id,
      observations: `IdempotencyKey: ${key}:freeze\nTicket ${PALOMITAS_TRACEABILITY.ticketRef}. Caducidad original fresco ${PALOMITAS_TRACEABILITY.originalFreshExpiryDate}.`,
    });
    await insertMovement({
      lot_id: parent.id,
      product_id: parent.product_id,
      movement_type: "division_lote",
      movement_date: registerDate,
      movement_time: PALOMITAS_TRACEABILITY.defrostTime,
      quantity: PALOMITAS_TRACEABILITY.thawQuantity,
      unit: PALOMITAS_TRACEABILITY.unit,
      from_location: "Congelador -18 C",
      to_location: "Refrigerado 0-4 C",
      reason: "Salida parcial a descongelacion/en uso.",
      responsible,
      related_record_type: "admin_inventory_lots",
      related_record_id: thawedLot.id,
      observations: `IdempotencyKey: ${key}:split\nResto congelado ${formatKg(PALOMITAS_TRACEABILITY.frozenQuantity)}. NO RECONGELAR tras descongelar.`,
    });
    await insertMovement({
      lot_id: thawedLot.id,
      product_id: thawedLot.product_id,
      movement_type: "descongelacion",
      movement_date: registerDate,
      movement_time: PALOMITAS_TRACEABILITY.defrostTime,
      quantity: PALOMITAS_TRACEABILITY.thawQuantity,
      unit: PALOMITAS_TRACEABILITY.unit,
      from_location: "Congelador -18 C",
      to_location: "Refrigerado 0-4 C",
      reason: "Producto descongelando/en uso. No recongelar.",
      responsible,
      related_record_type: "admin_inventory_lots",
      related_record_id: parent.id,
      observations: `IdempotencyKey: ${key}:defrost\nLimite operativo ${useByDate} ${PALOMITAS_TRACEABILITY.defrostTime}.`,
    });

    const refreshedParent = await getLotById(parent.id);
    return {
      ok: true,
      data: {
        parentLot: refreshedParent.ok && refreshedParent.data ? refreshedParent.data : { ...parent, current_quantity: PALOMITAS_TRACEABILITY.frozenQuantity },
        thawedLot,
      },
    };
  },

  async queueLabel(input: { parentLotId: string; variant: PalomitasLabelVariant; responsible: string; requestId?: string }): Promise<DbResult<{ printJob: PrintJob; label: PalomitasLabelData; idempotent?: boolean }>> {
    const state = await this.getSplitState(input.parentLotId);
    if (!state.ok) return state;
    if (!state.data) return { ok: false, error: "No se ha localizado el lote original." };
    if (!state.data.thawedLot) return { ok: false, error: "Registra primero el split para imprimir etiquetas con trazabilidad completa." };

    const registerDate = madridDate();
    const label = buildPalomitasLabelData({
      variant: input.variant,
      parentLot: state.data.parentLot,
      thawedLot: state.data.thawedLot,
      responsible: input.responsible,
      registerDate,
    });
    if (!label.productName) return { ok: false, error: "Falta nombre de producto en el lote." };
    if (!label.batchCode) return { ok: false, error: "Falta lote interno/proveedor." };

    const rawCommand = buildGodex80x50AppccTraceabilityEzpl({
      productName: label.productName,
      state: label.state,
      quantityText: label.quantityText,
      supplierName: label.supplierName,
      ticketRef: label.ticketRef,
      purchaseDate: label.purchaseDate,
      freezingDate: label.freezingDate,
      originalExpiryDate: label.originalFreshExpiryDate,
      defrostedAt: label.defrostedAt,
      useBy: label.useBy,
      responsible: label.responsible,
      storage: label.storage,
      warning: label.warning,
      note: label.note,
      batchCode: label.batchCode,
      traceValue: label.traceValue,
      copies: 1,
    });
    if (!isValidGodex80x50Ezpl(rawCommand)) return { ok: false, error: "La etiqueta GoDEX generada no es EZPL valido." };

    const requestId = cleanText(input.requestId) || crypto.randomUUID();
    const result = await enqueuePrintJob({
      printerKey: DEFAULT_GODEX_G500_PRINTER_KEY,
      payload: {
        title: label.productName,
        line1: `${label.state} · ${label.quantityText}`,
        line2: `${label.ticketRef} · lote ${label.batchCode}`,
        template: "appcc_traceability_80x50",
        raw_command: rawCommand,
        data: label,
        metadata: {
          requestedBy: label.responsible,
          module: "traceability",
          sourceType: "palomitas_traceability_split",
          sourceId: label.inventoryLotId,
          createdFrom: "admin_traceability_palomitas_017843",
          reason: label.variant === "defrosting" ? "print_defrosting_use_label" : "print_frozen_reserve_label",
          batchCode: label.batchCode,
          requestId,
          idempotencyKey: `palomitas_017843:${label.variant}:${label.inventoryLotId}:${requestId}`,
        },
      },
    });
    if (!result.ok) return result;

    await createLabelRecord({
      model: label.variant === "defrosting" ? "Descongelación" : "Congelación",
      product: label.productName,
      batch: label.batchCode,
      supplier: label.supplierName,
      elaboration_date: PALOMITAS_TRACEABILITY.purchaseDate,
      freezing_date: PALOMITAS_TRACEABILITY.freezingDate,
      defrosting_date: label.variant === "defrosting" ? registerDate : undefined,
      best_before_date: label.variant === "defrosting" ? addDays(registerDate, 1) : PALOMITAS_TRACEABILITY.originalFreshExpiryDate,
      responsible: label.responsible,
      print_format: "termica",
      copies: 1,
      printer: "Godex G500",
      template: "appcc_traceability_80x50",
      zpl_version: "EZPL",
      inventory_lot_id: label.inventoryLotId,
      product_id: label.productId,
      label_type: "palomitas_traceability_split",
      expiry_source: "real_documentada",
      appcc_review_status: "revisado",
      review_warning: label.warning,
    });

    return { ok: true, data: { printJob: result.data, label, idempotent: "idempotent" in result ? result.idempotent : undefined } };
  },
};
