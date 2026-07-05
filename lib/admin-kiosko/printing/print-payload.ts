export const DEFAULT_GODEX_G500_PRINTER_KEY = "kiosko_godex_g500";

export const PRINT_LABEL_TEMPLATES = ["test_label", "product_label_basic", "ingredient_label_basic", "prep_label_basic", "prep_label_professional"] as const;

export type PrintLabelTemplate = typeof PRINT_LABEL_TEMPLATES[number];

export type TestLabelData = {
  title: string;
  line1: string;
  line2: string;
};

export type ProductLabelBasicData = {
  productName: string;
  internalCode?: string;
  lot?: string;
  expiryDate?: string;
};

export type IngredientLabelBasicData = {
  ingredientName: string;
  supplierName?: string;
  internalCode?: string;
  lot?: string;
  expiryDate?: string;
};

export type PrepLabelBasicData = {
  prepName: string;
  productionDateTime?: string;
  expiryDateTime?: string;
  shelfLifeDays?: number;
  productionDate?: string;
  expiryDate?: string;
  batchCode?: string;
  responsibleName?: string;
  storageCondition?: string;
  brandName?: string;
  qrUrl?: string;
  qrValue?: string;
  includeQr?: boolean;
};

export type PrintJobMetadata = {
  requestedBy?: string;
  module?: string;
  sourceType?: string;
  sourceId?: string;
  createdFrom?: string;
  reason?: string;
  batchCode?: string;
};

export type PrintLabelData = TestLabelData | ProductLabelBasicData | IngredientLabelBasicData | PrepLabelBasicData;

export type CreatePrintJobInput = {
  printerKey?: unknown;
  template?: unknown;
  data?: unknown;
  metadata?: unknown;
};

export type ValidatedPrintLabelInput = {
  printerKey: string;
  template: PrintLabelTemplate;
  data: PrintLabelData;
  metadata: PrintJobMetadata;
};

export type BridgePrintPayload = {
  title: string;
  line1: string;
  line2: string;
  template: PrintLabelTemplate;
  data: PrintLabelData;
  metadata: PrintJobMetadata;
};

export type PrintInputValidation =
  | { ok: true; input: ValidatedPrintLabelInput }
  | { ok: false; error: string };

const maxLabelTextLength = 36;
const labelDateTimeZone = "Europe/Madrid";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLabelText(value: unknown) {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\^~\r\n\t]/g, " ")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizeLabelText(value: unknown, maxLength = maxLabelTextLength) {
  const normalized = normalizeLabelText(value);
  return normalized.slice(0, Math.max(0, maxLength));
}

function validateLabelTextLength(fields: Array<[string, unknown]>) {
  const tooLong = fields.find(([, value]) => normalizeLabelText(value).length > maxLabelTextLength);
  return tooLong ? `${tooLong[0]} no puede superar ${maxLabelTextLength} caracteres imprimibles.` : null;
}

function dateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: labelDateTimeZone,
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function madridOffsetMs(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: labelDateTimeZone,
    timeZoneName: "longOffset",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const offsetName = parts.find((part) => part.type === "timeZoneName")?.value || "GMT+00:00";
  const match = offsetName.match(/^GMT([+-])(\d{2}):?(\d{2})?$/);
  if (!match) return 0;

  const [, sign, hours, minutes = "00"] = match;
  const offset = (Number(hours) * 60 + Number(minutes)) * 60_000;
  return sign === "-" ? -offset : offset;
}

function madridDateFromParts(year: number, month: number, day: number, hour = 0, minute = 0) {
  const normalized = new Date(Date.UTC(year, month - 1, day, hour, minute));
  if (
    normalized.getUTCFullYear() !== year
    || normalized.getUTCMonth() !== month - 1
    || normalized.getUTCDate() !== day
    || normalized.getUTCHours() !== hour
    || normalized.getUTCMinutes() !== minute
  ) {
    return new Date(Number.NaN);
  }

  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  return new Date(utcGuess.getTime() - madridOffsetMs(utcGuess));
}

export function formatLabelDateTime(value: Date) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return "";
  }

  const parts = dateParts(value);
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
}

export function addDaysToDateTime(value: Date, days: number) {
  const next = new Date(value.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

export function parseDateTimeInput(value: unknown) {
  const raw = cleanText(value);
  if (!raw) return null;

  const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const parsed = madridDateFromParts(Number(dateOnly[1]), Number(dateOnly[2]), Number(dateOnly[3]));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const madridDateTime = raw.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})$/);
  if (madridDateTime) {
    const parsed = madridDateFromParts(
      Number(madridDateTime[1]),
      Number(madridDateTime[2]),
      Number(madridDateTime[3]),
      Number(madridDateTime[4]),
      Number(madridDateTime[5]),
    );
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseShelfLifeDays(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function booleanFromInput(value: unknown) {
  return value === true || value === "true" || value === "1" || value === "on";
}

function buildInternalQrUrl(qrValue?: string) {
  const baseUrl = sanitizeLabelText(process.env.NEXT_PUBLIC_APP_BASE_URL, 180).replace(/\/+$/, "");
  const value = sanitizeLabelText(qrValue, 240);
  if (!baseUrl || !value) return undefined;
  return `${baseUrl}/admin-kiosko/qr/${encodeURIComponent(value)}`;
}

function normalizedMetadata(value: unknown): PrintJobMetadata {
  if (!isRecord(value)) return {};

  return {
    requestedBy: sanitizeLabelText(value.requestedBy, 80),
    module: sanitizeLabelText(value.module, 80),
    sourceType: sanitizeLabelText(value.sourceType, 80),
    sourceId: sanitizeLabelText(value.sourceId, 120),
    createdFrom: sanitizeLabelText(value.createdFrom, 80),
    reason: sanitizeLabelText(value.reason, 120),
    batchCode: sanitizeLabelText(value.batchCode, 120),
  };
}

export function isPrintLabelTemplate(value: unknown): value is PrintLabelTemplate {
  return typeof value === "string" && PRINT_LABEL_TEMPLATES.includes(value as PrintLabelTemplate);
}

export function validatePrintLabelInput(input: unknown): PrintInputValidation {
  if (!isRecord(input)) {
    return { ok: false, error: "payload/data es obligatorio." };
  }

  const printerKey = sanitizeLabelText(input.printerKey || DEFAULT_GODEX_G500_PRINTER_KEY, 80);
  const template = cleanText(input.template);

  if (!printerKey) {
    return { ok: false, error: "printerKey es obligatorio." };
  }

  if (!template) {
    return { ok: false, error: "template es obligatorio." };
  }

  if (!isPrintLabelTemplate(template)) {
    return { ok: false, error: `Template no soportado: ${template}.` };
  }

  if (!isRecord(input.data)) {
    return { ok: false, error: "payload/data es obligatorio." };
  }

  if (template === "test_label") {
    const lengthError = validateLabelTextLength([
      ["title", input.data.title],
      ["line1", input.data.line1],
      ["line2", input.data.line2],
    ]);
    if (lengthError) return { ok: false, error: lengthError };

    const title = sanitizeLabelText(input.data.title);
    const line1 = sanitizeLabelText(input.data.line1);
    const line2 = sanitizeLabelText(input.data.line2);

    if (!title || !line1 || !line2) {
      return { ok: false, error: "test_label necesita title, line1 y line2." };
    }

    return {
      ok: true,
      input: {
        printerKey,
        template,
        data: { title, line1, line2 },
        metadata: normalizedMetadata(input.metadata),
      },
    };
  }

  if (template === "product_label_basic") {
    const lengthError = validateLabelTextLength([
      ["productName", input.data.productName],
      ["internalCode", input.data.internalCode],
      ["lot", input.data.lot],
      ["expiryDate", input.data.expiryDate],
    ]);
    if (lengthError) return { ok: false, error: lengthError };

    const productName = sanitizeLabelText(input.data.productName);
    const internalCode = sanitizeLabelText(input.data.internalCode);
    const lot = sanitizeLabelText(input.data.lot);
    const expiryDate = sanitizeLabelText(input.data.expiryDate);

    if (!productName) {
      return { ok: false, error: "product_label_basic necesita productName." };
    }

    return {
      ok: true,
      input: {
        printerKey,
        template,
        data: { productName, internalCode, lot, expiryDate },
        metadata: normalizedMetadata(input.metadata),
      },
    };
  }

  if (template === "ingredient_label_basic") {
    const lengthError = validateLabelTextLength([
      ["ingredientName", input.data.ingredientName],
      ["supplierName", input.data.supplierName],
      ["internalCode", input.data.internalCode],
      ["lot", input.data.lot],
      ["expiryDate", input.data.expiryDate],
    ]);
    if (lengthError) return { ok: false, error: lengthError };

    const ingredientName = sanitizeLabelText(input.data.ingredientName);
    const supplierName = sanitizeLabelText(input.data.supplierName);
    const internalCode = sanitizeLabelText(input.data.internalCode);
    const lot = sanitizeLabelText(input.data.lot);
    const expiryDate = sanitizeLabelText(input.data.expiryDate);

    if (!ingredientName) {
      return { ok: false, error: "ingredient_label_basic necesita ingredientName." };
    }

    return {
      ok: true,
      input: {
        printerKey,
        template,
        data: { ingredientName, supplierName, internalCode, lot, expiryDate },
        metadata: normalizedMetadata(input.metadata),
      },
    };
  }

  const lengthError = validateLabelTextLength([
    ["prepName", input.data.prepName],
    ["batchCode", input.data.batchCode],
    ["responsibleName", input.data.responsibleName],
    ["storageCondition", input.data.storageCondition],
    ["brandName", input.data.brandName],
  ]);
  if (lengthError) return { ok: false, error: lengthError };

  const prepName = sanitizeLabelText(input.data.prepName);
  const productionDateTime = parseDateTimeInput(input.data.productionDateTime)
    || parseDateTimeInput(input.data.productionDate)
    || new Date();
  const shelfLifeDays = parseShelfLifeDays(input.data.shelfLifeDays);
  let expiryDateTime = parseDateTimeInput(input.data.expiryDateTime) || parseDateTimeInput(input.data.expiryDate);
  const batchCode = sanitizeLabelText(input.data.batchCode);
  const responsibleName = sanitizeLabelText(input.data.responsibleName) || undefined;
  const storageCondition = sanitizeLabelText(input.data.storageCondition) || "Refrigerado 0-4 C";
  const brandName = sanitizeLabelText(input.data.brandName) || "KIOSKO ALFRESKO";
  const qrValue = sanitizeLabelText(input.data.qrValue, 180)
    || (batchCode ? `ERP:prep_batch:${batchCode}` : undefined);
  const qrUrl = sanitizeLabelText(input.data.qrUrl, 240) || buildInternalQrUrl(qrValue);
  const includeQr = booleanFromInput(input.data.includeQr);

  if (!prepName) {
    return { ok: false, error: `${template} necesita prepName.` };
  }

  if (Number.isNaN(shelfLifeDays)) {
    return { ok: false, error: "shelfLifeDays debe ser un numero valido." };
  }

  if (!expiryDateTime && shelfLifeDays !== undefined) {
    expiryDateTime = addDaysToDateTime(productionDateTime, shelfLifeDays);
  }

  if (!expiryDateTime) {
    return { ok: false, error: `${template} necesita expiryDateTime o shelfLifeDays.` };
  }

  if (expiryDateTime.getTime() <= productionDateTime.getTime()) {
    return { ok: false, error: "La caducidad debe ser posterior a la elaboracion." };
  }

  const line1 = `ELAB ${formatLabelDateTime(productionDateTime)}`;
  const line2 = `CAD ${formatLabelDateTime(expiryDateTime)}`;
  const lineLengthError = validateLabelTextLength([
    ["line1", line1],
    ["line2", line2],
  ]);
  if (lineLengthError) {
    return { ok: false, error: lineLengthError };
  }

  return {
    ok: true,
    input: {
      printerKey,
      template,
      data: {
        prepName,
        productionDateTime: productionDateTime.toISOString(),
        expiryDateTime: expiryDateTime.toISOString(),
        shelfLifeDays,
        batchCode,
        responsibleName,
        storageCondition,
        brandName,
        qrUrl,
        qrValue,
        includeQr,
      },
      metadata: normalizedMetadata(input.metadata),
    },
  };
}

export function buildPrintPayload(input: ValidatedPrintLabelInput): BridgePrintPayload {
  let lines: Pick<BridgePrintPayload, "title" | "line1" | "line2">;

  if (input.template === "test_label") {
    const data = input.data as TestLabelData;
    lines = {
      title: sanitizeLabelText(data.title),
      line1: sanitizeLabelText(data.line1),
      line2: sanitizeLabelText(data.line2),
    };
  } else if (input.template === "product_label_basic") {
    const data = input.data as ProductLabelBasicData;
    lines = {
      title: sanitizeLabelText(data.productName),
      line1: sanitizeLabelText(data.internalCode) || sanitizeLabelText(data.lot),
      line2: sanitizeLabelText(data.expiryDate),
    };
  } else if (input.template === "ingredient_label_basic") {
    const data = input.data as IngredientLabelBasicData;
    lines = {
      title: sanitizeLabelText(data.ingredientName),
      line1: sanitizeLabelText(data.internalCode) || sanitizeLabelText(data.supplierName) || sanitizeLabelText(data.lot),
      line2: sanitizeLabelText(data.expiryDate),
    };
  } else {
    const data = input.data as PrepLabelBasicData;
    const productionDateTime = parseDateTimeInput(data.productionDateTime) || parseDateTimeInput(data.productionDate) || new Date();
    const expiryDateTime = parseDateTimeInput(data.expiryDateTime) || parseDateTimeInput(data.expiryDate);
    lines = {
      title: sanitizeLabelText(data.prepName),
      line1: sanitizeLabelText(`ELAB ${formatLabelDateTime(productionDateTime)}`),
      line2: sanitizeLabelText(`CAD ${expiryDateTime ? formatLabelDateTime(expiryDateTime) : ""}`),
    };
  }

  return {
    ...lines,
    template: input.template,
    data: input.data,
    metadata: input.metadata,
  };
}
