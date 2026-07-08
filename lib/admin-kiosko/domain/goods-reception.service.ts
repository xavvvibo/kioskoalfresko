import "server-only";

import { emitDomainEventSafe } from "./emit-safe";
import { createDomainEvent } from "./events";
import {
  applyInventoryMovement,
  getInventoryLots,
  getInventoryProductById,
} from "@/lib/admin-kiosko/database";
import { adminSupabaseRequest } from "@/lib/admin-kiosko/repositories/legacy-core";
import { labelEventService, type LabelEventResult } from "./label-event.service";

type GoodsReceptionResult = {
  receiptId: string;
  productId: string;
  productName: string;
  supplierName: string;
  batchCode: string;
  quantity: number;
  unit: string;
  receivedAt: string;
  expiryDate?: string;
  storageCondition?: string;
  receivedBy: string;
  printResult?: LabelEventResult | { ok: false; error: string };
  skippedExistingReception?: boolean;
  lotConfirmed?: boolean;
};

type GoodsReceptionInput = {
  supplierId?: string;
  supplierName: string;
  productId: string;
  batchCode: string;
  quantity: number;
  unit?: string;
  receivedDate: string;
  receivedTime?: string;
  expiryDate?: string;
  storageCondition?: string;
  receivedBy: string;
  observations?: string;
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function limitedText(value: unknown, maxLength: number) {
  return cleanText(value).replace(/\s+/g, " ").slice(0, maxLength);
}

function normalizeQuantity(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function normalizeUnit(value: unknown, fallback = "ud") {
  const unit = limitedText(value, 16).toLowerCase();
  if (!unit) return fallback;
  const aliases: Record<string, string> = {
    unidad: "ud",
    unidades: "ud",
    uds: "ud",
    kilo: "kg",
    kilos: "kg",
    kilogramo: "kg",
    kilogramos: "kg",
    litro: "l",
    litros: "l",
  };
  return aliases[unit] || unit;
}

function isValidDateOnly(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.getUTCFullYear() === Number(match[1])
    && date.getUTCMonth() === Number(match[2]) - 1
    && date.getUTCDate() === Number(match[3]);
}

function normalizeTime(value: string) {
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) return "";
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return "";
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function madridLocalToIso(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = (time || "00:00").split(":").map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Madrid",
    timeZoneName: "longOffset",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(utcGuess);
  const offset = parts.find((part) => part.type === "timeZoneName")?.value.replace("GMT", "") || "+00:00";
  return `${date}T${time || "00:00"}:00${offset}`;
}

function receptionIdempotencyKey(input: {
  supplierName: string;
  productId: string;
  batchCode: string;
  quantity: number;
  unit: string;
  receivedDate: string;
}) {
  return [
    "goods_reception_manual",
    input.supplierName.toLowerCase(),
    input.productId,
    input.batchCode.toLowerCase(),
    String(input.quantity),
    input.unit.toLowerCase(),
    input.receivedDate,
  ].join(":");
}

function isLabelEventResult(value: unknown): value is LabelEventResult {
  return value !== null
    && typeof value === "object"
    && "ok" in value
    && "decision" in value;
}

async function createGoodsReceptionRecordReturning(input: {
  recordDate: string;
  recordTime?: string;
  supplierName: string;
  productName: string;
  batchCode: string;
  expiryDate?: string;
  storageCondition?: string;
  receivedBy: string;
  observations?: string;
  idempotencyKey: string;
}) {
  const result = await adminSupabaseRequest<Array<{ id: string }>>("admin_goods_reception_records", {
    method: "POST",
    query: "?select=id",
    body: JSON.stringify({
      record_date: input.recordDate,
      record_time: cleanText(input.recordTime),
      supplier: input.supplierName,
      product: input.productName,
      accepted: true,
      batch_number: input.batchCode,
      expiry_date: cleanText(input.expiryDate),
      responsible: input.receivedBy,
      status: "correcto",
      observations: [
        `IdempotencyKey: ${input.idempotencyKey}`,
        input.storageCondition ? `Conservacion: ${input.storageCondition}` : "",
        input.observations,
      ].filter(Boolean).join("\n"),
      created_by: input.receivedBy,
      source: "admin-kiosko",
    }),
    headers: { Prefer: "return=representation" },
  });

  if (!result.ok) return result;
  const row = result.data[0];
  return row?.id
    ? { ok: true as const, data: row.id }
    : { ok: false as const, error: "No se pudo recuperar el id de recepcion." };
}

async function findExistingManualReception(input: {
  recordDate: string;
  supplierName: string;
  productName: string;
  batchCode: string;
  idempotencyKey: string;
}) {
  const result = await adminSupabaseRequest<Array<{ id: string; observations: string | null }>>("admin_goods_reception_records", {
    method: "GET",
    query: `?select=id,observations&record_date=eq.${encodeURIComponent(input.recordDate)}&supplier=eq.${encodeURIComponent(input.supplierName)}&product=eq.${encodeURIComponent(input.productName)}&batch_number=eq.${encodeURIComponent(input.batchCode)}&order=created_at.desc&limit=10`,
  });
  if (!result.ok) return result;
  const existing = result.data.find((row) => cleanText(row.observations).includes(`IdempotencyKey: ${input.idempotencyKey}`));
  return { ok: true as const, data: existing?.id || null };
}

async function findConfirmedLot(productId: string, batchCode: string) {
  const lots = await getInventoryLots({ productId, activeOnly: false, limit: 500 });
  if (!lots.ok) return lots;
  const normalizedBatch = batchCode.toLowerCase();
  const lot = lots.data.find((candidate) => cleanText(candidate.batch_number).toLowerCase() === normalizedBatch);
  return { ok: true as const, data: lot || null };
}

export const goodsReceptionService = {
  async registerManualReception(input: GoodsReceptionInput) {
    const supplierName = limitedText(input.supplierName, 80);
    const productId = cleanText(input.productId);
    const batchCode = limitedText(input.batchCode, 80);
    const quantity = normalizeQuantity(input.quantity);
    const receivedDate = cleanText(input.receivedDate);
    const receivedBy = limitedText(input.receivedBy, 80) || "admin-kiosko";
    const receivedTime = normalizeTime(cleanText(input.receivedTime));
    const expiryDate = cleanText(input.expiryDate);

    if (!supplierName) return { ok: false as const, error: "Indica el proveedor." };
    if (!productId) return { ok: false as const, error: "Selecciona el producto recibido." };
    if (!batchCode) return { ok: false as const, error: "Indica el lote del proveedor." };
    if (quantity <= 0) return { ok: false as const, error: "La cantidad debe ser mayor que cero." };
    if (!receivedDate) return { ok: false as const, error: "Indica la fecha de recepcion." };
    if (!isValidDateOnly(receivedDate)) return { ok: false as const, error: "Fecha de recepcion no valida." };
    if (expiryDate && !isValidDateOnly(expiryDate)) return { ok: false as const, error: "Fecha de caducidad no valida." };

    const productResult = await getInventoryProductById(productId);
    if (!productResult.ok) return { ok: false as const, error: productResult.error };
    if (!productResult.data) return { ok: false as const, error: "Producto no localizado." };

    const unit = normalizeUnit(input.unit, productResult.data.unit || "ud");
    const productName = limitedText(productResult.data.name, 80);
    const receivedAt = madridLocalToIso(receivedDate, receivedTime);
    const storageCondition = limitedText(input.storageCondition, 80);
    const observations = limitedText(input.observations, 500);
    const stableIdempotencyKey = receptionIdempotencyKey({
      supplierName,
      productId,
      batchCode,
      quantity,
      unit,
      receivedDate,
    });

    const existingReception = await findExistingManualReception({
      recordDate: receivedDate,
      supplierName,
      productName,
      batchCode,
      idempotencyKey: stableIdempotencyKey,
    });
    if (!existingReception.ok) return { ok: false as const, error: existingReception.error };

    if (existingReception.data) {
      const existingLot = await findConfirmedLot(productId, batchCode);
      if (!existingLot.ok) {
        return { ok: false as const, error: `Recepcion ya existente (${existingReception.data}), pero no se pudo verificar el lote: ${existingLot.error}` };
      }
      if (!existingLot.data) {
        return { ok: false as const, error: `Recepcion ya existente (${existingReception.data}), pero el lote ${batchCode} no esta confirmado en inventario. No se emite etiqueta.` };
      }

      const printResult = await labelEventService.requestGoodsReceivedLabel({
        receiptId: existingReception.data,
        receptionId: existingReception.data,
        supplierId: cleanText(input.supplierId) || undefined,
        supplierName,
        productId,
        productName,
        batchCode,
        quantity,
        unit,
        receivedAt,
        expiryDate: expiryDate || undefined,
        storageCondition: storageCondition || undefined,
        receivedBy,
        idempotencyKey: stableIdempotencyKey,
      });

      return {
        ok: true as const,
        data: {
          receiptId: existingReception.data,
          productId,
          productName,
          supplierName,
          batchCode,
          quantity,
          unit,
          receivedAt,
          expiryDate: expiryDate || undefined,
          storageCondition: storageCondition || undefined,
          receivedBy,
          skippedExistingReception: true,
          lotConfirmed: true,
          printResult,
        } satisfies GoodsReceptionResult,
      };
    }

    const reception = await createGoodsReceptionRecordReturning({
      recordDate: receivedDate,
      recordTime: receivedTime,
      supplierName,
      productName,
      batchCode,
      expiryDate,
      storageCondition,
      receivedBy,
      observations,
      idempotencyKey: stableIdempotencyKey,
    });
    if (!reception.ok) return { ok: false as const, error: reception.error };

    const movement = await applyInventoryMovement({
      product_id: productId,
      movement_type: "entrada",
      quantity,
      unit,
      supplier: supplierName,
      batch_number: batchCode,
      expiry_date: expiryDate,
      observations: [
        "Entrada desde recepcion manual de compras.",
        storageCondition ? `Conservacion: ${storageCondition}` : "",
        `IdempotencyKey: ${stableIdempotencyKey}`,
        observations,
      ].filter(Boolean).join("\n"),
    });
    if (!movement.ok) {
      return { ok: false as const, error: `Recepcion creada (${reception.data}), pero fallo el movimiento de inventario: ${movement.error}` };
    }

    const confirmedLot = await findConfirmedLot(productId, batchCode);
    if (!confirmedLot.ok) {
      return { ok: false as const, error: `Recepcion creada (${reception.data}), pero no se pudo verificar el lote: ${confirmedLot.error}` };
    }
    if (!confirmedLot.data) {
      return { ok: false as const, error: `Recepcion creada (${reception.data}), pero el lote ${batchCode} no quedo confirmado en inventario.` };
    }

    const eventResult = await emitDomainEventSafe(createDomainEvent("GoodsReceived", {
      source: "inventory",
      correlationId: reception.data,
      trace: { productId },
      payload: {
        receiptId: reception.data,
        receptionId: reception.data,
        supplierId: cleanText(input.supplierId) || undefined,
        supplierName,
        productId,
        productName,
        batchCode,
        quantity,
        unit,
        receivedAt,
        expiryDate: expiryDate || undefined,
        storageCondition: storageCondition || undefined,
        receivedBy,
        idempotencyKey: stableIdempotencyKey,
        items: [{
          productName,
          batchNumber: batchCode,
          quantity,
          unit,
          expiryDate: expiryDate || undefined,
        }],
      },
    }));
    const labelResult = eventResult?.handlerResults.find((entry) => entry.handlerName === "LabelHandler")?.result;

    return {
      ok: true as const,
      data: {
        receiptId: reception.data,
        productId,
        productName,
        supplierName,
        batchCode,
        quantity,
        unit,
        receivedAt,
        expiryDate: expiryDate || undefined,
        storageCondition: storageCondition || undefined,
        receivedBy,
        lotConfirmed: true,
        printResult: isLabelEventResult(labelResult)
          ? labelResult
          : { ok: false as const, error: "Recepcion registrada, etiqueta no confirmada." },
      } satisfies GoodsReceptionResult,
    };
  },
};
