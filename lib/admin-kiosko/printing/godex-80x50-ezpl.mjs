const BASE_HEADER = [
  "^Q50,3",
  "^W80",
  "^H10",
  "^S4",
  "^P1",
  "^C1",
  "^R0",
  "~Q+0",
  "^O0",
  "^D0",
  "^L",
];

function safeText(value, maxLength = 36) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\^~\r\n\t]/g, " ")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function textCommand(x, y, value, options = {}) {
  const width = options.width ?? 1;
  const height = options.height ?? 1;
  return `AA,${x},${y},1,${width},${height},0,0,${safeText(value, options.max ?? 36)}`;
}

function lineCommand(x1, y1, x2, y2, thickness = 2) {
  return `Lo,${x1},${y1},${x2},${y2},${thickness}`;
}

function buildEzpl(lines) {
  return [...BASE_HEADER, ...lines, "E"].join("\r\n") + "\r\n";
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
  ].filter(Boolean));
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
