import QRCode from "qrcode";
import jsQR from "jsqr";
import { createCanvas } from "@napi-rs/canvas";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const BASE_HEADER = [
  "^Q50,3",
  "^W80",
  "^H10",
  "^S4",
  "^C1",
  "^R0",
  "~Q+0",
  "^O0",
  "^D0",
  "^L",
];

export function cleanLabelText(value) {
  const cleaned = String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\^~\r\n\t]/g, " ")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return ["", "-", "0", "0.", "0.0", "undefined", "null"].includes(cleaned.toLowerCase()) ? "" : cleaned;
}

function safeText(value, maxLength = 36) {
  return cleanLabelText(value).slice(0, maxLength);
}

function safeQrText(value, maxLength = 180) {
  return cleanLabelText(value)
    .replace(/,/g, "")
    .slice(0, maxLength);
}

function safeCopies(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(8, Math.round(parsed))) : 1;
}

function textCommand(x, y, value, options = {}) {
  const width = options.width ?? 1;
  const height = options.height ?? 1;
  return `AA,${x},${y},1,${width},${height},0,${safeText(value, options.max ?? 36)}`;
}

function lineCommand(x1, y1, x2, y2, thickness = 2) {
  return `Lo,${x1},${y1},${x2},${y2},${thickness}`;
}

function visibleTextCommand(x, y, value, options = {}) {
  const text = safeText(value, options.max ?? 36);
  return text ? textCommand(x, y, text, options) : "";
}

function dateText(value) {
  const text = cleanLabelText(value);
  if (!text) return "";

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return safeText(text, 24);

  const parts = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.day}/${values.month}/${values.year} ${values.hour}:${values.minute}`;
}

export function generateQrBitmapEzpl(value, x, y, size = 144) {
  const qrValue = safeText(value, 180);
  const targetSize = Math.max(80, Math.min(220, Math.round(size)));
  const quietModules = 4;
  if (!qrValue) return "";

  try {
    const qr = QRCode.create(qrValue, {
      errorCorrectionLevel: "M",
      margin: 4,
    });
    const sourceSize = qr.modules.size;
    const sourceSizeWithQuiet = sourceSize + quietModules * 2;
    const scale = Math.max(1, Math.floor(targetSize / sourceSizeWithQuiet));
    const imageSize = sourceSizeWithQuiet * scale;
    const widthBytes = Math.ceil(imageSize / 8);
    const bytes = [];

    for (let row = 0; row < imageSize; row += 1) {
      for (let byteIndex = 0; byteIndex < widthBytes; byteIndex += 1) {
        let byte = 0;
        for (let bit = 0; bit < 8; bit += 1) {
          const col = byteIndex * 8 + bit;
          const sourceRow = Math.floor(row / scale) - quietModules;
          const sourceCol = Math.floor(col / scale) - quietModules;
          const isDark = col < imageSize
            && sourceRow >= 0
            && sourceCol >= 0
            && sourceRow < sourceSize
            && sourceCol < sourceSize
            && qr.modules.get(sourceRow, sourceCol);
          if (isDark) byte |= 0x80 >> bit;
        }
        bytes.push(byte);
      }
    }

    const hex = Buffer.from(bytes).toString("hex").toUpperCase();
    return `GW,${x},${y},${widthBytes},${imageSize},${hex}`;
  } catch (error) {
    console.error("[GODEX QR BITMAP ERROR]", {
      value: qrValue,
      error: error instanceof Error ? error.message : String(error),
    });
    return "";
  }
}

export function nativeQrCommand(value, options = {}) {
  const qrValue = safeQrText(value, options.max ?? 180);
  if (!qrValue) return "";

  const x = Number.isFinite(options.x) ? Math.round(options.x) : 360;
  const y = Number.isFinite(options.y) ? Math.round(options.y) : 150;
  const model = Number.isFinite(options.model) ? Math.round(options.model) : 2;
  const multiplier = Number.isFinite(options.multiplier) ? Math.round(options.multiplier) : 2;
  const errorCorrection = safeText(options.errorCorrection || "M", 1) || "M";
  const mask = Number.isFinite(options.mask) ? Math.round(options.mask) : 8;
  const rotation = Number.isFinite(options.rotation) ? Math.round(options.rotation) : 5;

  return [`W${x},${y},${model},${multiplier},${errorCorrection},${mask},${rotation},${qrValue.length},0`, qrValue].join("\r\n");
}

export function parseNativeQrCommand(lines, startIndex = 0) {
  const command = Array.isArray(lines) ? String(lines[startIndex] || "") : String(lines || "");
  const value = Array.isArray(lines) ? String(lines[startIndex + 1] || "") : "";
  const match = command.match(/^W(\d+),(\d+),(\d+),(\d+),([A-Z]),(\d+),(\d+),(\d+),(\d+)$/);
  if (!match) return null;

  const parsed = {
    x: Number(match[1]),
    y: Number(match[2]),
    model: Number(match[3]),
    multiplier: Number(match[4]),
    errorCorrection: match[5],
    mask: Number(match[6]),
    rotation: Number(match[7]),
    length: Number(match[8]),
    mode: Number(match[9]),
    value,
  };

  return parsed.length === value.length ? parsed : null;
}

export function bitmapPixelsFromGodexGw(command, options = {}) {
  const parsed = parseGodexGwBitmap(command);
  if (!parsed) return null;
  const width = parsed.widthBytes * 8;
  const height = parsed.rows;
  const bytes = Buffer.from(parsed.hex, "hex");
  const inverted = options.inverted === true;
  const pixels = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const byte = bytes[y * parsed.widthBytes + Math.floor(x / 8)];
      const bit = 0x80 >> (x % 8);
      const dark = Boolean(byte & bit);
      const value = (dark !== inverted) ? 0 : 255;
      const offset = (y * width + x) * 4;
      pixels[offset] = value;
      pixels[offset + 1] = value;
      pixels[offset + 2] = value;
      pixels[offset + 3] = 255;
    }
  }

  return { ...parsed, width, height, pixels };
}

export function decodeGodexGwQr(command, expectedValue, options = {}) {
  const bitmap = bitmapPixelsFromGodexGw(command);
  if (!bitmap) return { ok: false, error: "GW bitmap invalido." };
  const decoded = jsQR(bitmap.pixels, bitmap.width, bitmap.height, { inversionAttempts: "dontInvert" });
  const inverted = bitmapPixelsFromGodexGw(command, { inverted: true });
  const decodedInverted = inverted ? jsQR(inverted.pixels, inverted.width, inverted.height, { inversionAttempts: "dontInvert" }) : null;
  const previewPath = options.previewPath || path.join(os.tmpdir(), `godex-qr-preview-${Date.now()}.png`);

  if (options.writePreview !== false) {
    const canvas = createCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d");
    const imageData = context.createImageData(bitmap.width, bitmap.height);
    imageData.data.set(bitmap.pixels);
    context.putImageData(imageData, 0, 0);
    fs.writeFileSync(previewPath, canvas.toBuffer("image/png"));
  }

  if (decodedInverted?.data) {
    return { ok: false, error: "El QR se decodifica invertido; polaridad incorrecta.", previewPath, decodedInverted: decodedInverted.data, ...bitmap };
  }
  if (!decoded?.data) {
    return { ok: false, error: "El QR no se puede decodificar.", previewPath, ...bitmap };
  }
  if (expectedValue !== undefined && decoded.data !== expectedValue) {
    return { ok: false, error: "El valor decodificado no coincide.", decoded: decoded.data, expected: expectedValue, previewPath, ...bitmap };
  }

  return { ok: true, decoded: decoded.data, previewPath, ...bitmap };
}

export function parseGodexGwBitmap(command) {
  const match = String(command || "").match(/^GW,(\d+),(\d+),(\d+),(\d+),([0-9A-F]+)$/);
  if (!match) return null;

  const [, x, y, widthBytes, rows, hex] = match;
  const parsed = {
    x: Number(x),
    y: Number(y),
    widthBytes: Number(widthBytes),
    rows: Number(rows),
    hex,
  };
  const expectedHexLength = parsed.widthBytes * parsed.rows * 2;
  if (!Number.isFinite(parsed.x) || !Number.isFinite(parsed.y) || !Number.isFinite(parsed.widthBytes) || !Number.isFinite(parsed.rows)) {
    return null;
  }
  if (parsed.hex.length !== expectedHexLength) return null;
  return parsed;
}

export function isStructurallyValidQrBitmapEzpl(command, printableWidth = 640, printableHeight = 400) {
  const parsed = parseGodexGwBitmap(command);
  if (!parsed) return false;
  const widthDots = parsed.widthBytes * 8;
  return parsed.widthBytes >= 16
    && parsed.rows >= 110
    && parsed.x >= 0
    && parsed.y >= 0
    && parsed.x + widthDots <= printableWidth
    && parsed.y + parsed.rows <= printableHeight
    && /^[0-9A-F]+$/.test(parsed.hex);
}

function buildEzpl(lines, options = {}) {
  return [...BASE_HEADER.slice(0, 4), `^P${safeCopies(options.copies)}`, ...BASE_HEADER.slice(4), ...lines, "E"].join("\r\n") + "\r\n";
}

export function buildGodex80x50TestEzpl() {
  return buildEzpl([
    textCommand(18, 16, "KIOSKO ALFRESKO", { width: 2, height: 2, max: 24 }),
    lineCommand(18, 58, 620, 58),
    textCommand(18, 78, "TEST TCP 9100", { width: 2, height: 2, max: 24 }),
    textCommand(18, 124, "GODEX G500", { width: 2, height: 2, max: 24 }),
    lineCommand(18, 170, 620, 170),
    textCommand(18, 192, "ETIQUETA 80x50 MM", { max: 32 }),
    textCommand(18, 220, "HOST 192.168.1.38", { max: 32 }),
    textCommand(18, 248, "PUERTO RAW 9100", { max: 32 }),
    textCommand(18, 286, "LOTE TCP-GODEX-001", { max: 32 }),
    textCommand(18, 330, "KIOSKO ALFRESKO", { width: 2, height: 1, max: 24 }),
  ]);
}

export function buildGodex80x50MinimalTestEzpl() {
  return buildEzpl([
    textCommand(70, 110, "TEST GODEX", { width: 4, height: 4, max: 16 }),
    textCommand(70, 190, "TCP 9100 OK", { width: 2, height: 2, max: 20 }),
  ]);
}

export function buildGodex80x50SafeErpTestEzpl(input = {}) {
  const host = safeText(input.host || "192.168.1.37", 32);
  const timestamp = safeText(input.timestamp || new Date().toISOString(), 32);

  return buildEzpl([
    textCommand(28, 54, "PRUEBA ERP", { width: 4, height: 4, max: 16 }),
    textCommand(28, 142, "NO USAR", { width: 4, height: 4, max: 16 }),
    lineCommand(28, 230, 610, 230, 3),
    textCommand(28, 258, `GODEX ${host}`, { width: 2, height: 2, max: 28 }),
    textCommand(28, 312, timestamp, { width: 1, height: 1, max: 32 }),
  ], { copies: 1 });
}

export function buildGodex80x50QrTestEzpl(input = {}) {
  const qrValue = safeQrText(input.qrValue || "ERP:QR-TEST:LOCAL", 180);
  const batchCode = safeText(input.batchCode || "QR-TEST", 32);

  return buildEzpl([
    textCommand(30, 30, "PRUEBA QR ERP", { width: 2, height: 2, max: 20 }),
    textCommand(30, 78, "NO USAR", { width: 2, height: 2, max: 20 }),
    lineCommand(30, 108, 610, 108, 2),
    nativeQrCommand(qrValue, { x: 360, y: 150, model: 2, multiplier: 2, errorCorrection: "M", mask: 8, rotation: 5 }),
    textCommand(220, 296, batchCode, { width: 2, height: 2, max: 24 }),
    textCommand(30, 342, "VALIDACION QR", { max: 20 }),
  ]);
}

export function buildGodex80x50LabelEzpl(input = {}) {
  const template = safeText(input.template || "test_label", 32);
  const title = safeText(input.title || input.prepName || input.productName || input.ingredientName || "ETIQUETA ERP", 24);
  const line1 = safeText(input.line1 || input.batchCode || input.lot || input.internalCode || input.supplierName || "-", 32);
  const line2 = safeText(input.line2 || input.expiryDate || input.expiryDateTime || input.productionDateTime || "-", 32);
  const line3 = safeText(input.line3 || input.responsibleName || input.storageCondition || input.brandName || "KIOSKO ALFRESKO", 32);
  const line4 = safeText(input.line4 || input.storageCondition || input.brandName || "", 32);

  return buildEzpl([
    textCommand(18, 16, "KIOSKO ALFRESKO", { width: 2, height: 2, max: 24 }),
    lineCommand(18, 58, 620, 58),
    textCommand(18, 78, title, { width: 2, height: 2, max: 24 }),
    textCommand(18, 124, template.toUpperCase(), { width: 1, height: 1, max: 32 }),
    lineCommand(18, 170, 620, 170),
    textCommand(18, 192, line1, { width: 1, height: 1, max: 32 }),
    textCommand(18, 220, line2, { width: 1, height: 1, max: 32 }),
    textCommand(18, 248, line3, { width: 1, height: 1, max: 32 }),
    line4 ? textCommand(18, 276, line4, { width: 1, height: 1, max: 32 }) : "",
    textCommand(18, 330, "KIOSKO ALFRESKO", { width: 2, height: 1, max: 24 }),
  ].filter(Boolean), { copies: input.copies });
}

export function buildGodex80x50PrepProfessionalEzpl(input = {}) {
  const title = safeText(input.prepName || input.title, 24);
  const batchCode = safeText(input.batchCode, 32);
  const productionDate = dateText(input.productionDateTime || input.productionDate || input.line1);
  const expiryDate = dateText(input.expiryDateTime || input.expiryDate || input.line2);
  const responsible = safeText(input.responsibleName || input.responsible || input.line3, 30);
  const storage = safeText(input.storageCondition || input.line4, 30);
  const qrValue = batchCode ? safeQrText(input.qrValue || `ERP:prep_batch:${batchCode}`, 180) : "";
  const includeQr = Boolean(qrValue && input.includeQr !== false);
  const qrGraphic = includeQr ? nativeQrCommand(qrValue, { x: 360, y: 150, model: 2, multiplier: 2, errorCorrection: "M", mask: 8, rotation: 5 }) : "";
  const infoWidth = includeQr ? 390 : 600;
  const rows = [
    productionDate ? `ELAB: ${productionDate}` : "",
    expiryDate ? `CAD: ${expiryDate}` : "",
    responsible ? `RESPONSABLE: ${responsible}` : "",
    storage ? `CONSERVACION: ${storage}` : "",
  ].filter(Boolean);
  const rowCommands = rows.map((row, index) => visibleTextCommand(22, 132 + index * 30, row, { max: includeQr ? 34 : 48 }));

  return buildEzpl([
    lineCommand(0, 0, 640, 0, 8),
    visibleTextCommand(18, 16, "KIOSKO ALFRESKO", { max: 20 }),
    visibleTextCommand(498, 16, "PREPARACION", { max: 16 }),
    lineCommand(0, 42, 640, 42, 3),
    visibleTextCommand(22, 62, title || "PREPARACION", { width: 2, height: 2, max: includeQr ? 20 : 24 }),
    lineCommand(22, 112, infoWidth, 112, 2),
    ...rowCommands,
    qrGraphic,
    lineCommand(22, 320, 618, 320, 2),
    batchCode ? lineCommand(22, 326, 174, 326, 2) : "",
    batchCode ? lineCommand(22, 360, 174, 360, 2) : "",
    batchCode ? lineCommand(22, 326, 22, 360, 2) : "",
    batchCode ? lineCommand(174, 326, 174, 360, 2) : "",
    batchCode ? visibleTextCommand(24, 334, "LOTE INTERNO", { max: 16 }) : "",
    batchCode ? visibleTextCommand(198, 334, batchCode, { width: 2, height: 2, max: 24 }) : "",
  ].filter(Boolean), { copies: input.copies });
}

export function ezplLines(ezpl) {
  return String(ezpl || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function isValidGodex80x50Ezpl(ezpl) {
  const lines = ezplLines(ezpl);
  return lines.length > 0
    && lines[0] === "^Q50,3"
    && lines.includes("^W80")
    && lines.includes("^L")
    && lines[lines.length - 1] === "E"
    && /^[\x09\x0A\x0D\x20-\x7E]*$/.test(String(ezpl || ""));
}

export function summarizeGodexEzpl(ezpl) {
  const lines = ezplLines(ezpl);
  return {
    rawCommandLength: Buffer.byteLength(String(ezpl || ""), "utf8"),
    firstLines: lines.slice(0, 8),
    lastLines: lines.slice(-8),
  };
}
