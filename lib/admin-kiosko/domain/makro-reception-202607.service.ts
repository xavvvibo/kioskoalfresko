import "server-only";

import { createLabelRecord } from "@/lib/admin-kiosko/database";
import { buildGodex80x50AppccTraceabilityEzpl, isValidGodex80x50Ezpl } from "@/lib/admin-kiosko/printing/godex-80x50-ezpl.mjs";
import { DEFAULT_GODEX_G500_PRINTER_KEY } from "@/lib/admin-kiosko/printing/print-service";
import { enqueuePrintJob, type PrintJob } from "@/lib/admin-kiosko/repositories/print-jobs.repository";
import { adminSupabaseRequest } from "@/lib/admin-kiosko/repositories/legacy-core";

type DbResult<T> = { ok: true; data: T } | { ok: false; error: string };

export type MakroItemKind = "appcc" | "basic" | "stock";
export type MakroLabelKind = "reception" | "opening" | "marinated";

export type MakroInvoice = {
  ref: string;
  invoiceNumber: string;
  deliveredAt: string;
  date: string;
};

export type MakroReceptionItem = {
  key: string;
  productName: string;
  invoiceRef: string;
  quantity: number;
  unit: string;
  displayQuantity: string;
  kind: MakroItemKind;
  conservation: string;
  supplierLot?: string;
  gtin?: string;
  notes?: string;
  openedToday?: boolean;
  transformToday?: boolean;
  omitted?: boolean;
};

export type MakroPurchaseSource = {
  invoiceRef: string;
  documentDate: string;
  documentDatetime: string;
  productNameOriginal: string;
  normalizedProductName: string;
  provider: string;
  quantity: number;
  unit: string;
  supplierLot?: string;
  source: "invoice";
  notes: string;
};

export type MakroLabel = {
  key: string;
  kind: MakroLabelKind;
  title: string;
  productName: string;
  state: string;
  quantityText: string;
  supplierName: string;
  invoiceRef: string;
  receivedDate: string;
  internalLot: string;
  supplierLot?: string;
  conservation: string;
  originalExpiry: string;
  responsible: string;
  traceValue: string;
  warning: string;
  note: string;
  openedAt?: string;
  useBy?: string;
};

type ProductRow = { id: string; name: string; current_stock?: number | null; unit?: string | null };
type LotRow = { id: string; batch_number: string | null };

export const MAKRO_SUPPLIER = "Makro Distribución Mayorista, S.A. Granada";
export const MAKRO_DEFAULT_RESPONSIBLE = "F. Javier Bocanegra Sanjuan";

export const makroInvoices: MakroInvoice[] = [
  { ref: "201-0037200", invoiceNumber: "0/0(055)0201/(2026)003720", deliveredAt: "2026-07-03 11:54", date: "2026-07-03" },
  { ref: "003-313566", invoiceNumber: "0/0(055)0003/(2026)031066", deliveredAt: "2026-07-04 15:58", date: "2026-07-04" },
  { ref: "003-313571", invoiceNumber: "0/0(055)0003/(2026)031070", deliveredAt: "2026-07-04 16:06", date: "2026-07-04" },
  { ref: "003-314013", invoiceNumber: "0/0(055)0003/(2026)031342", deliveredAt: "2026-07-06 19:13", date: "2026-07-06" },
];

export const makroReceptionItems: MakroReceptionItem[] = [
  { key: "cheddar-lafuent", productName: "LONCHAS TIPO CHEDD 1KG LAFUENT", invoiceRef: "003-313566", quantity: 1, unit: "ud", displayQuantity: "1 ud", kind: "appcc", conservation: "Refrigerado 0-4 C" },
  { key: "magreta-adb", productName: "MAGRETA ADB EPZ KG", invoiceRef: "003-313566", quantity: 1.994, unit: "kg", displayQuantity: "1,994 kg", kind: "appcc", conservation: "Refrigerado 0-4 C" },
  { key: "picadillo-chorizo", productName: "PICADILLO CHORIZO BJ EMC KG", invoiceRef: "003-313566", quantity: 0.956, unit: "kg", displayQuantity: "0,956 kg", kind: "appcc", conservation: "Refrigerado 0-4 C", gtin: "08424771011966", supplierLot: "16104415" },
  { key: "picadillo-morcilla", productName: "PICADILLO MORCILLA BJ EMC KG", invoiceRef: "003-313566", quantity: 0.902, unit: "kg", displayQuantity: "0,902 kg", kind: "appcc", conservation: "Refrigerado 0-4 C", gtin: "08424771121436", supplierLot: "16900919" },
  { key: "patatas-aro", productName: "PATATAS FRITAS ARO 2KG", invoiceRef: "003-313566", quantity: 1, unit: "caja", displayQuantity: "1 caja/ud", kind: "basic", conservation: "Ambiente seco" },
  { key: "tortilla-chips", productName: "TORTILLA CHIPS MILD MC 750G", invoiceRef: "003-313566", quantity: 2, unit: "ud", displayQuantity: "2 uds", kind: "stock", conservation: "Ambiente seco" },
  { key: "whisky-jb", productName: "WHISKY J&B 70CL", invoiceRef: "003-313566", quantity: 2, unit: "ud", displayQuantity: "2 uds", kind: "stock", conservation: "Almacén bebidas" },
  { key: "ginebra-beefeater", productName: "GINEBRA BEEFEATER 70CL", invoiceRef: "003-313566", quantity: 1, unit: "ud", displayQuantity: "1 ud", kind: "stock", conservation: "Almacén bebidas" },
  { key: "ron-barcelo", productName: "RON AÑEJO BARCELO 70CL", invoiceRef: "003-313566", quantity: 3, unit: "ud", displayQuantity: "3 uds", kind: "stock", conservation: "Almacén bebidas" },
  { key: "licor-rioba-mora", productName: "LICOR SIN RIOBA MORA BT70CL", invoiceRef: "003-313566", quantity: 1, unit: "ud", displayQuantity: "1 ud", kind: "stock", conservation: "Almacén bebidas" },
  { key: "nectar-juver-pina", productName: "NECTAR JUVER PIÑA 20CL", invoiceRef: "003-313566", quantity: 24, unit: "ud", displayQuantity: "1 pack 24", kind: "stock", conservation: "Almacén bebidas" },
  { key: "fuze-limon", productName: "FUZE TEA LIMON LT 33CL", invoiceRef: "003-313566", quantity: 48, unit: "ud", displayQuantity: "2 packs 24", kind: "stock", conservation: "Almacén bebidas" },
  { key: "fuze-verde", productName: "FUZE TEA VERDE MARACUYA LT33CL", invoiceRef: "003-313566", quantity: 24, unit: "ud", displayQuantity: "1 pack 24", kind: "stock", conservation: "Almacén bebidas" },
  { key: "aquarius-limon", productName: "AQUARIUS LIMON LT 33CL", invoiceRef: "003-313566", quantity: 24, unit: "ud", displayQuantity: "1 pack 24", kind: "stock", conservation: "Almacén bebidas" },
  { key: "sirope-blue", productName: "SIROPE RIOBA BLUE CURA 70CL", invoiceRef: "003-313566", quantity: 1, unit: "ud", displayQuantity: "1 ud", kind: "stock", conservation: "Almacén bebidas" },
  { key: "sirope-mojito", productName: "SIROPE RIOBA MOJITO 70CL", invoiceRef: "003-313566", quantity: 1, unit: "ud", displayQuantity: "1 ud", kind: "stock", conservation: "Almacén bebidas" },
  { key: "cocacola", productName: "COCACOLA LT 33CL REGULAR", invoiceRef: "003-313566", quantity: 72, unit: "ud", displayQuantity: "3 packs 24", kind: "stock", conservation: "Almacén bebidas" },
  { key: "tonica-zero", productName: "TONICA ZERO SCHWEPPE SLEEK", invoiceRef: "003-313566", quantity: 24, unit: "ud", displayQuantity: "1 pack 24", kind: "stock", conservation: "Almacén bebidas" },
  { key: "agua-lanjaron", productName: "AGUA LANJARON 50CL", invoiceRef: "003-313566", quantity: 48, unit: "ud", displayQuantity: "2 packs 24", kind: "stock", conservation: "Almacén bebidas" },
  { key: "salsa-cheddar", productName: "SALSA QSO CHEDDAR 3KG LA FUEN", invoiceRef: "003-313571", quantity: 1, unit: "ud", displayQuantity: "1 ud", kind: "appcc", conservation: "Refrigerado 0-4 C" },
  { key: "mozzarella", productName: "MOZZARELLA RALLADA MC 1KG", invoiceRef: "003-314013", quantity: 1, unit: "ud", displayQuantity: "1 ud", kind: "appcc", conservation: "Refrigerado 0-4 C" },
  { key: "queso-escmas", productName: "QSO ESCMAS 500G HOCHLAND", invoiceRef: "003-314013", quantity: 1, unit: "ud", displayQuantity: "1 ud", kind: "appcc", conservation: "Refrigerado 0-4 C" },
  { key: "provolone", productName: "QSO PROVOLONE C/OREGANO 200G", invoiceRef: "003-314013", quantity: 3, unit: "ud", displayQuantity: "3 uds", kind: "appcc", conservation: "Refrigerado 0-4 C" },
  { key: "pollo-contramuslo", productName: "POLLO CONTRAMUSLO VC KG", invoiceRef: "003-314013", quantity: 1.846, unit: "kg", displayQuantity: "1,846 kg", kind: "appcc", conservation: "Refrigerado 0-4 C", gtin: "08436547401017", supplierLot: "26002392", transformToday: true, notes: "TRANSFORMADO / MARINADO HOY." },
  { key: "cebolleta", productName: "CEBOLLETA CHINA", invoiceRef: "003-314013", quantity: 1, unit: "ud", displayQuantity: "1 ud", kind: "appcc", conservation: "Refrigerado / zona verduras. Lavar antes de uso." },
  { key: "cebolla-caramel", productName: "CEBOLLA CARAMEL MC FCO 900G", invoiceRef: "003-314013", quantity: 1, unit: "ud", displayQuantity: "1 ud", kind: "appcc", conservation: "Refrigerado 0-4 C" },
  { key: "pepino", productName: "PEPINO RDJ. AGRID.B.CAMPO 370G", invoiceRef: "003-314013", quantity: 1, unit: "ud", displayQuantity: "1 ud", kind: "appcc", conservation: "Refrigerado 0-4 C", openedToday: true, notes: "ABIERTO HOY." },
  { key: "corn-flakes", productName: "CORN FLAKES KELLOGG 500G", invoiceRef: "003-314013", quantity: 1, unit: "ud", displayQuantity: "1 ud", kind: "basic", conservation: "Seco, cerrado, protegido de humedad", openedToday: true, notes: "ABIERTO HOY." },
  { key: "mayonesa-trufada", productName: "MAYONESA TRUFADA HEINZ 875ML", invoiceRef: "003-314013", quantity: 1, unit: "ud", displayQuantity: "1 ud", kind: "appcc", conservation: "Refrigerado 0-4 C", openedToday: true, notes: "ABIERTO HOY." },
  { key: "ranchera", productName: "SSA RANCHERA YBARRA 1L", invoiceRef: "003-314013", quantity: 1, unit: "ud", displayQuantity: "1 ud", kind: "appcc", conservation: "Refrigerado 0-4 C", openedToday: true, notes: "ABIERTO HOY." },
  { key: "bbq-whiskey", productName: "SSA BBQ WHISKEY BULL'S EYE 2L", invoiceRef: "003-314013", quantity: 1, unit: "ud", displayQuantity: "1 ud", kind: "appcc", conservation: "Refrigerado 0-4 C tras apertura si no consta otra instrucción", openedToday: true, notes: "ABIERTO HOY." },
  { key: "panko", productName: "PANKO MC 1KG", invoiceRef: "003-314013", quantity: 1, unit: "ud", displayQuantity: "1 ud", kind: "basic", conservation: "Seco, cerrado, protegido de humedad", openedToday: true, notes: "ABIERTO HOY." },
];

export const makroOmittedItems = [
  "YOPRO DRINKS FRS/FRAMB 300G · 003-313566",
  "YOPRO DRINKS FRS/FRAMB 300G · 003-314013",
  "JAMON RVA MC LONCH 500G · 003-314013",
  "PECHUGA PAVO LONCH 225G ELPOZO · 003-314013",
];

const makroAdditionalInvoiceItems: MakroReceptionItem[] = [
  { key: "mantequilla-mc-2010037200", productName: "MANTEQUILLA MC BQ 1KG", invoiceRef: "201-0037200", quantity: 1, unit: "ud", displayQuantity: "1 ud", kind: "stock", conservation: "Refrigerado 0-4 C" },
  { key: "qso-crema-sin-lactosa-2010037200", productName: "QSO CREMA S/LACTOSA MC 400G", invoiceRef: "201-0037200", quantity: 1, unit: "ud", displayQuantity: "1 ud", kind: "stock", conservation: "Refrigerado 0-4 C" },
  { key: "lonc-cheddar-american-2010037200", productName: "LONC 48 C/CHED RJ 1KG AMERICAN", invoiceRef: "201-0037200", quantity: 1, unit: "ud", displayQuantity: "1 ud", kind: "stock", conservation: "Refrigerado 0-4 C" },
  { key: "qso-rulo-vaca-cabra-2010037200", productName: "QSO RULO VACA-CABRA MC 1KG", invoiceRef: "201-0037200", quantity: 1, unit: "ud", displayQuantity: "1 ud", kind: "stock", conservation: "Refrigerado 0-4 C" },
  { key: "pollo-alas-1312-2010037200", productName: "POLLO ALAS VC AI KG", invoiceRef: "201-0037200", quantity: 1.312, unit: "kg", displayQuantity: "1,312 kg", kind: "appcc", conservation: "Refrigerado 0-4 C", supplierLot: "26002377" },
  { key: "pollo-alas-1372-2010037200", productName: "POLLO ALAS VC AI KG", invoiceRef: "201-0037200", quantity: 1.372, unit: "kg", displayQuantity: "1,372 kg", kind: "appcc", conservation: "Refrigerado 0-4 C", supplierLot: "26002377" },
  { key: "pollo-alas-1224-2010037200", productName: "POLLO ALAS VC AI KG", invoiceRef: "201-0037200", quantity: 1.224, unit: "kg", displayQuantity: "1,224 kg", kind: "appcc", conservation: "Refrigerado 0-4 C", supplierLot: "26002377" },
  { key: "prep-picada-mixta-2010037200", productName: "PREP PICADA MIXTA 1,6KG", invoiceRef: "201-0037200", quantity: 1, unit: "ud", displayQuantity: "1 ud", kind: "appcc", conservation: "Refrigerado 0-4 C" },
  { key: "albahaca-mc-2010037200", productName: "ALBAHACA MC 125G", invoiceRef: "201-0037200", quantity: 1, unit: "ud", displayQuantity: "1 ud", kind: "stock", conservation: "Refrigerado / zona verduras" },
  { key: "patata-guarnicion-2010037200", productName: "PATATA MC GUARNICION", invoiceRef: "201-0037200", quantity: 1, unit: "ud", displayQuantity: "1 ud", kind: "stock", conservation: "Ambiente fresco y seco" },
  { key: "pimiento-habanero-2010037200", productName: "PIMIENTO HABANERO 100G", invoiceRef: "201-0037200", quantity: 1, unit: "ud", displayQuantity: "1 ud", kind: "stock", conservation: "Refrigerado / zona verduras" },
  { key: "cilantro-mc-2010037200", productName: "CILANTRO MC 125G", invoiceRef: "201-0037200", quantity: 1, unit: "ud", displayQuantity: "1 ud", kind: "stock", conservation: "Refrigerado / zona verduras" },
  { key: "tomate-doble-conc-2010037200", productName: "TOMATE DOBLE CONC HIDA 170G", invoiceRef: "201-0037200", quantity: 1, unit: "ud", displayQuantity: "1 ud", kind: "stock", conservation: "Ambiente seco" },
  { key: "mayonesa-rioba-2010037200", productName: "MAYONESA RIOBA BIBERON 300ML", invoiceRef: "201-0037200", quantity: 1, unit: "ud", displayQuantity: "1 ud", kind: "appcc", conservation: "Refrigerado 0-4 C tras apertura" },
  { key: "baconesa-rioba-2010037200", productName: "SSA BACONESA RIOBA BIBERON 770", invoiceRef: "201-0037200", quantity: 1, unit: "ud", displayQuantity: "1 ud", kind: "appcc", conservation: "Refrigerado 0-4 C tras apertura" },
  { key: "bebida-centenario-2010037200", productName: "BEBIDA ESPIRIT CENTENARIO 1L", invoiceRef: "201-0037200", quantity: 1, unit: "ud", displayQuantity: "1 ud", kind: "stock", conservation: "Almacén bebidas" },
  { key: "ron-anforas-2010037200", productName: "RON AÑEJO T ANFORAS 3L", invoiceRef: "201-0037200", quantity: 1, unit: "ud", displayQuantity: "1 ud", kind: "stock", conservation: "Almacén bebidas" },
  { key: "vino-cerro-criz-2010037200", productName: "VINO TTO CERRO DE LA CRIZ BIB", invoiceRef: "201-0037200", quantity: 1, unit: "ud", displayQuantity: "1 ud", kind: "stock", conservation: "Almacén bebidas" },
  { key: "mosto-salob-2010037200", productName: "MOSTO CASTILLO SALOB BLAN MANZ", invoiceRef: "201-0037200", quantity: 1, unit: "ud", displayQuantity: "1 ud", kind: "stock", conservation: "Almacén bebidas" },
  { key: "sirope-fresa-2010037200", productName: "SIROPE RIOBA FRESA 70CL", invoiceRef: "201-0037200", quantity: 1, unit: "ud", displayQuantity: "1 ud", kind: "stock", conservation: "Almacén bebidas" },
  { key: "sirope-coco-2010037200", productName: "SIROPE RIOBA COCO 70CL", invoiceRef: "201-0037200", quantity: 1, unit: "ud", displayQuantity: "1 ud", kind: "stock", conservation: "Almacén bebidas" },
  { key: "sirope-cereza-2010037200", productName: "SIROPE RIOBA CEREZA 70CL", invoiceRef: "201-0037200", quantity: 1, unit: "ud", displayQuantity: "1 ud", kind: "stock", conservation: "Almacén bebidas" },
  { key: "bolsa-camiseta-2010037200", productName: "BOLSA PA CAMISETA 35X50 200UD", invoiceRef: "201-0037200", quantity: 1, unit: "ud", displayQuantity: "1 ud", kind: "stock", conservation: "Almacén seco" },
  { key: "yopro-313566", productName: "YOPRO DRINKS FRS/FRAMB 300G", invoiceRef: "003-313566", quantity: 2, unit: "ud", displayQuantity: "2 uds", kind: "stock", conservation: "Refrigerado 0-4 C", omitted: true },
  { key: "yopro-314013", productName: "YOPRO DRINKS FRS/FRAMB 300G", invoiceRef: "003-314013", quantity: 2, unit: "ud", displayQuantity: "2 uds", kind: "stock", conservation: "Refrigerado 0-4 C", omitted: true },
  { key: "jamon-reserva-314013", productName: "JAMON RVA MC LONCH 500G", invoiceRef: "003-314013", quantity: 1, unit: "ud", displayQuantity: "1 ud", kind: "stock", conservation: "Refrigerado 0-4 C", omitted: true },
  { key: "pechuga-pavo-314013", productName: "PECHUGA PAVO LONCH 225G ELPOZO", invoiceRef: "003-314013", quantity: 1, unit: "ud", displayQuantity: "1 ud", kind: "stock", conservation: "Refrigerado 0-4 C", omitted: true },
];

export function normalizeMakroProductName(value: string) {
  return cleanLabelSourceText(value)
    .replace(/\b(LT|BT|FCO|BJ|EMC|MC|KG|UDS?|C\/OREGANO)\b/g, " ")
    .replace(/\b\d+([,.]\d+)?\s*(KG|G|ML|CL|L)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanLabelSourceText(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const makroPurchaseSources: MakroPurchaseSource[] = [...makroReceptionItems, ...makroAdditionalInvoiceItems].map((item) => {
  const invoice = invoiceFor(item.invoiceRef);
  return {
    invoiceRef: item.invoiceRef,
    documentDate: invoice.date,
    documentDatetime: invoice.deliveredAt,
    productNameOriginal: item.productName,
    normalizedProductName: normalizeMakroProductName(item.productName),
    provider: MAKRO_SUPPLIER,
    quantity: item.quantity,
    unit: item.unit,
    supplierLot: item.supplierLot,
    source: "invoice",
    notes: item.omitted
      ? "Compra documentada para regularización; producto omitido del flujo operativo anterior por criterio de recepción."
      : "Compra documentada para regularización de stock autorizada por responsable.",
  };
});

export function findLatestMakroPurchaseForProduct(productName: string) {
  const explicitFreezerAlias: Record<string, string> = {
    "ALITAS DE POLLO": normalizeMakroProductName("POLLO ALAS VC AI KG"),
  };
  const cleaned = cleanLabelSourceText(productName);
  const normalized = explicitFreezerAlias[cleaned] || normalizeMakroProductName(productName);
  const matches = makroPurchaseSources
    .filter((purchase) => purchase.normalizedProductName === normalized)
    .sort((a, b) => b.documentDatetime.localeCompare(a.documentDatetime));
  return matches[0] || null;
}

export const openingPolicy: Record<string, { days: number; conservation: string; warning: string }> = {
  pepino: { days: 7, conservation: "Refrigerado 0-4 C", warning: "Usar en 7 días salvo envase más restrictivo" },
  ranchera: { days: 7, conservation: "Refrigerado 0-4 C", warning: "Usar en 7 días salvo envase más restrictivo" },
  "mayonesa-trufada": { days: 7, conservation: "Refrigerado 0-4 C", warning: "Usar en 7 días salvo envase más restrictivo" },
  "bbq-whiskey": { days: 14, conservation: "Refrigerado 0-4 C tras apertura", warning: "Usar en 14 días salvo envase más restrictivo" },
  "corn-flakes": { days: 30, conservation: "Seco, cerrado, protegido de humedad", warning: "NO REUTILIZAR SOBRANTE QUE HAYA TOCADO POLLO CRUDO. Mantener cerrado y seco." },
  panko: { days: 30, conservation: "Seco, cerrado, protegido de humedad", warning: "NO REUTILIZAR SOBRANTE QUE HAYA TOCADO POLLO CRUDO. Mantener cerrado y seco." },
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function invoiceFor(ref: string) {
  return makroInvoices.find((invoice) => invoice.ref === ref) || makroInvoices[0];
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

function lotCode(item: MakroReceptionItem) {
  return `MAK-${item.invoiceRef.replace(/[^0-9]/g, "")}-${item.key.toUpperCase().replace(/[^A-Z0-9]+/g, "-").slice(0, 24)}`;
}

function isLabelReceptionItem(item: MakroReceptionItem) {
  return ["cheddar-lafuent", "magreta-adb", "picadillo-chorizo", "picadillo-morcilla", "salsa-cheddar", "mozzarella", "queso-escmas", "provolone", "cebolleta", "cebolla-caramel"].includes(item.key);
}

function labelState(kind: MakroLabelKind) {
  if (kind === "opening") return "ABIERTO";
  if (kind === "marinated") return "MARINADO / CRUDO";
  return "RECEPCION APPCC";
}

export function buildMakroLabels(input?: { operativeDate?: string; operativeTime?: string; responsible?: string }) {
  const operativeDate = input?.operativeDate || "2026-07-08";
  const operativeTime = input?.operativeTime || "00:00";
  const responsible = cleanText(input?.responsible) || MAKRO_DEFAULT_RESPONSIBLE;
  const labels: MakroLabel[] = [];

  for (const item of makroReceptionItems) {
    const invoice = invoiceFor(item.invoiceRef);
    const internalLot = lotCode(item);
    if (isLabelReceptionItem(item)) {
      labels.push({
        key: `reception:${item.key}`,
        kind: "reception",
        title: "Recepción",
        productName: item.productName,
        state: labelState("reception"),
        quantityText: item.displayQuantity,
        supplierName: "Makro",
        invoiceRef: item.invoiceRef,
        receivedDate: displayDate(invoice.date),
        internalLot,
        supplierLot: item.supplierLot,
        conservation: item.conservation,
        originalExpiry: "revisar envase",
        responsible,
        traceValue: `ERP:makro:${item.invoiceRef}:${internalLot}`,
        warning: "Caducidad original: revisar envase",
        note: item.supplierLot ? `Lote proveedor ${item.supplierLot}` : "Lote proveedor no consta en factura",
      });
    }
    if (item.openedToday) {
      const policy = openingPolicy[item.key];
      const useBy = addDays(operativeDate, policy.days);
      labels.push({
        key: `opening:${item.key}`,
        kind: "opening",
        title: "Apertura",
        productName: item.productName,
        state: labelState("opening"),
        quantityText: item.displayQuantity,
        supplierName: "Makro",
        invoiceRef: item.invoiceRef,
        receivedDate: displayDate(invoice.date),
        internalLot,
        supplierLot: item.supplierLot,
        conservation: policy.conservation,
        originalExpiry: "revisar envase",
        responsible,
        openedAt: `${displayDate(operativeDate)} ${operativeTime}`,
        useBy: `${displayDate(useBy)} ${operativeTime}`,
        traceValue: `ERP:makro:opening:${item.invoiceRef}:${internalLot}:${operativeDate}`,
        warning: policy.warning,
        note: "Caducidad original: revisar envase",
      });
    }
  }

  const chicken = makroReceptionItems.find((item) => item.key === "pollo-contramuslo");
  if (chicken) {
    labels.push({
      key: "marinated:pollo-contramuslo",
      kind: "marinated",
      title: "Transformación",
      productName: "POLLO CONTRAMUSLO MARINADO",
      state: labelState("marinated"),
      quantityText: "1,846 kg",
      supplierName: "Makro",
      invoiceRef: chicken.invoiceRef,
      receivedDate: displayDate(invoiceFor(chicken.invoiceRef).date),
      internalLot: "MAK-003314013-POLLO-MARINADO",
      supplierLot: chicken.supplierLot,
      conservation: "Refrigerado 0-4 C",
      originalExpiry: "revisar envase",
      responsible,
      openedAt: `${displayDate(operativeDate)} ${operativeTime}`,
      useBy: `${displayDate(addDays(operativeDate, 1))} ${operativeTime}`,
      traceValue: `ERP:makro:marinado:${chicken.supplierLot}:MAK-003314013-POLLO-MARINADO:${operativeDate}`,
      warning: "COCINAR COMPLETAMENTE · NO CONSUMIR CRUDO",
      note: "EVITAR CONTAMINACION CRUZADA",
    });
  }

  return labels;
}

function labelEzpl(label: MakroLabel) {
  return buildGodex80x50AppccTraceabilityEzpl({
    productName: label.productName,
    state: label.state,
    quantityText: label.quantityText,
    supplierName: label.supplierName,
    ticketRef: label.invoiceRef,
    supplierLot: label.supplierLot,
    purchaseDate: label.receivedDate,
    purchaseDateLabel: "RECEP FACT",
    originalExpiryDate: label.originalExpiry,
    defrostedAt: label.openedAt,
    eventDateLabel: label.kind === "opening" ? "APERTURA" : label.kind === "marinated" ? "MARINADO" : "FECHA",
    useBy: label.useBy,
    responsible: label.responsible,
    storage: label.conservation,
    warning: label.warning,
    note: label.note,
    batchCode: label.internalLot,
    traceValue: label.traceValue,
    copies: 1,
  });
}

async function getProductByName(name: string) {
  const result = await adminSupabaseRequest<ProductRow[]>("admin_inventory_products", {
    method: "GET",
    query: `?select=id,name,current_stock,unit&name=eq.${encodeURIComponent(name)}&limit=1`,
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] || null };
}

async function ensureProduct(item: MakroReceptionItem): Promise<DbResult<ProductRow>> {
  const existing = await getProductByName(item.productName);
  if (!existing.ok) return existing;
  if (existing.data) return { ok: true, data: existing.data };

  const inserted = await adminSupabaseRequest<ProductRow[]>("admin_inventory_products", {
    method: "POST",
    query: "?select=id,name,current_stock,unit",
    body: JSON.stringify({
      name: item.productName,
      category: item.kind === "stock" ? "stock" : item.kind === "basic" ? "stock_appcc_basico" : "appcc",
      usual_supplier: MAKRO_SUPPLIER,
      unit: item.unit,
      current_stock: 0,
      location: item.conservation,
      current_batch: lotCode(item),
      observations: `Proveedor: ${MAKRO_SUPPLIER}\nFuente: factura ${item.invoiceRef}\n${item.notes || ""}`.trim(),
      active: true,
    }),
    headers: { Prefer: "return=representation" },
  });
  if (!inserted.ok) return inserted;
  const row = inserted.data[0];
  return row ? { ok: true, data: row } : { ok: false, error: `No se pudo crear producto ${item.productName}.` };
}

async function findLot(internalLot: string) {
  const result = await adminSupabaseRequest<LotRow[]>("admin_inventory_lots", {
    method: "GET",
    query: `?select=id,batch_number&batch_number=eq.${encodeURIComponent(internalLot)}&limit=1`,
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] || null };
}

async function ensureLot(item: MakroReceptionItem, product: ProductRow) {
  const internalLot = lotCode(item);
  const existing = await findLot(internalLot);
  if (!existing.ok) return existing;
  if (existing.data) return { ok: true as const, data: existing.data, created: false };

  const inserted = await adminSupabaseRequest<LotRow[]>("admin_inventory_lots", {
    method: "POST",
    query: "?select=id,batch_number",
    body: JSON.stringify({
      product_id: product.id,
      product_name: item.productName,
      supplier_name: MAKRO_SUPPLIER,
      batch_number: internalLot,
      manufacturer_lot: item.supplierLot || null,
      received_date: invoiceFor(item.invoiceRef).date,
      initial_quantity: item.quantity,
      current_quantity: item.quantity,
      unit: item.unit,
      location: item.conservation,
      status: "activo",
      requires_traceability: item.kind !== "stock",
      requires_appcc_reception: item.kind === "appcc",
      generates_inventory_lot: true,
      storage_temperature: item.conservation,
      expiry_source: null,
      appcc_review_status: item.kind === "stock" ? "revisado" : "pendiente_revision",
      observations: [
        `IdempotencyKey: makro_reception:${item.invoiceRef}:${item.key}:${item.quantity}`,
        `Factura/ref: ${item.invoiceRef}`,
        `Proveedor: ${MAKRO_SUPPLIER}`,
        `Cantidad: ${item.displayQuantity}`,
        item.gtin ? `GTIN: ${item.gtin}` : "",
        item.supplierLot ? `Lote proveedor: ${item.supplierLot}` : "",
        "Caducidad original: revisar envase",
        item.notes || "",
      ].filter(Boolean).join("\n"),
      source: "makro_invoice_reception",
    }),
    headers: { Prefer: "return=representation" },
  });
  if (!inserted.ok) return inserted;
  const row = inserted.data[0];
  if (!row) return { ok: false as const, error: `No se pudo crear lote ${internalLot}.` };

  await adminSupabaseRequest<undefined>("admin_inventory_lot_movements", {
    method: "POST",
    body: JSON.stringify({
      lot_id: row.id,
      product_id: product.id,
      movement_type: "entrada",
      movement_date: invoiceFor(item.invoiceRef).date,
      movement_time: invoiceFor(item.invoiceRef).deliveredAt.slice(11, 16),
      quantity: item.quantity,
      unit: item.unit,
      to_location: item.conservation,
      reason: "Recepción factura Makro.",
      responsible: MAKRO_DEFAULT_RESPONSIBLE,
      related_record_type: "makro_invoice",
      related_record_id: null,
      observations: `IdempotencyKey: makro_reception:${item.invoiceRef}:${item.key}:${item.quantity}`,
    }),
    headers: { Prefer: "return=minimal" },
  });

  return { ok: true as const, data: row, created: true };
}

async function createGoodsReceptionIfNeeded(item: MakroReceptionItem) {
  const key = `makro_reception:${item.invoiceRef}:${item.key}:${item.quantity}`;
  const existing = await adminSupabaseRequest<Array<{ id: string }>>("admin_goods_reception_records", {
    method: "GET",
    query: `?select=id&observations=ilike.*${encodeURIComponent(key)}*&limit=1`,
  });
  if (!existing.ok) return existing;
  if (existing.data[0]) return { ok: true as const, data: existing.data[0].id, created: false };

  const inserted = await adminSupabaseRequest<Array<{ id: string }>>("admin_goods_reception_records", {
    method: "POST",
    query: "?select=id",
    body: JSON.stringify({
      record_date: invoiceFor(item.invoiceRef).date,
      record_time: invoiceFor(item.invoiceRef).deliveredAt.slice(11, 16),
      responsible: MAKRO_DEFAULT_RESPONSIBLE,
      status: "correcto",
      observations: [
        `IdempotencyKey: ${key}`,
        `Factura/ref: ${item.invoiceRef}`,
        `Proveedor: ${MAKRO_SUPPLIER}`,
        `Conservación: ${item.conservation}`,
        item.gtin ? `GTIN: ${item.gtin}` : "",
        item.supplierLot ? `Lote proveedor: ${item.supplierLot}` : "",
        "Caducidad original: revisar envase",
      ].filter(Boolean).join("\n"),
      created_by: MAKRO_DEFAULT_RESPONSIBLE,
      source: "makro_invoice_reception",
      supplier: MAKRO_SUPPLIER,
      product: item.productName,
      accepted: true,
      batch_number: item.supplierLot || lotCode(item),
    }),
    headers: { Prefer: "return=representation" },
  });
  if (!inserted.ok) return inserted;
  return { ok: true as const, data: inserted.data[0]?.id || "", created: true };
}

async function existingOpening(label: MakroLabel, operativeDate: string) {
  const result = await adminSupabaseRequest<Array<{ id: string }>>("admin_label_records", {
    method: "GET",
    query: `?select=id&label_type=eq.makro_opening&batch=eq.${encodeURIComponent(label.internalLot)}&opening_date=eq.${encodeURIComponent(operativeDate)}&limit=1`,
  });
  if (!result.ok) return result;
  return { ok: true as const, data: Boolean(result.data[0]) };
}

async function createOpeningHistory(label: MakroLabel, operativeDate: string) {
  const exists = await existingOpening(label, operativeDate);
  if (!exists.ok) return exists;
  if (exists.data) return { ok: true as const, data: "existing" };
  const result = await createLabelRecord({
    model: "Apertura",
    product: label.productName,
    batch: label.internalLot,
    supplier: MAKRO_SUPPLIER,
    elaboration_date: invoiceFor(label.invoiceRef).date,
    opening_date: operativeDate,
    best_before_date: label.useBy ? label.useBy.slice(6, 10) + "-" + label.useBy.slice(3, 5) + "-" + label.useBy.slice(0, 2) : undefined,
    responsible: label.responsible,
    print_format: "termica",
    copies: 1,
    printer: "Godex G500",
    template: "makro_opening_80x50",
    zpl_version: "EZPL",
    label_type: "makro_opening",
    review_warning: label.warning,
  });
  return result.ok ? { ok: true as const, data: "created" } : result;
}

async function existingTransformation(operativeDate: string) {
  const result = await adminSupabaseRequest<Array<{ id: string }>>("admin_inventory_lots", {
    method: "GET",
    query: `?select=id&batch_number=eq.MAK-003314013-POLLO-MARINADO&observations=ilike.*${encodeURIComponent(`marinado:${operativeDate}:26002392:1.846`)}*&limit=1`,
  });
  if (!result.ok) return result;
  return { ok: true as const, data: Boolean(result.data[0]) };
}

export const makroReception202607Service = {
  labels: buildMakroLabels,
  receptionItems: makroReceptionItems,
  omittedItems: makroOmittedItems,

  async registerReception() {
    let createdLots = 0;
    let existingLots = 0;
    for (const item of makroReceptionItems) {
      if (item.supplierLot === undefined && ["picadillo-chorizo", "picadillo-morcilla", "pollo-contramuslo"].includes(item.key)) {
        return { ok: false as const, error: `Falta lote proveedor obligatorio para ${item.productName}.` };
      }
      if (item.quantity <= 0) return { ok: false as const, error: `Cantidad no válida para ${item.productName}.` };
      const product = await ensureProduct(item);
      if (!product.ok) return product;
      const lot = await ensureLot(item, product.data);
      if (!lot.ok) return lot;
      if (lot.created) createdLots += 1;
      else existingLots += 1;
      if (item.kind !== "stock") {
        const reception = await createGoodsReceptionIfNeeded(item);
        if (!reception.ok) return reception;
      }
    }
    return { ok: true as const, data: { createdLots, existingLots, total: makroReceptionItems.length } };
  },

  async registerOpenings(input: { operativeDate: string; operativeTime: string; responsible: string }) {
    const labels = buildMakroLabels(input).filter((label) => label.kind === "opening");
    for (const label of labels) {
      const result = await createOpeningHistory(label, input.operativeDate);
      if (!result.ok) return result;
    }
    return { ok: true as const, data: { openings: labels.length } };
  },

  async registerChickenTransformation(input: { operativeDate: string; operativeTime: string; responsible: string; quantity?: number }) {
    const quantity = input.quantity || 1.846;
    if (quantity <= 0) return { ok: false as const, error: "La cantidad transformada debe ser positiva." };
    const exists = await existingTransformation(input.operativeDate);
    if (!exists.ok) return exists;
    if (exists.data) return { ok: true as const, data: { created: false } };

    const product = await ensureProduct({
      key: "pollo-marinado",
      productName: "POLLO CONTRAMUSLO MARINADO",
      invoiceRef: "003-314013",
      quantity,
      unit: "kg",
      displayQuantity: `${String(quantity).replace(".", ",")} kg`,
      kind: "appcc",
      conservation: "Refrigerado 0-4 C",
      supplierLot: "26002392",
    });
    if (!product.ok) return product;
    const inserted = await adminSupabaseRequest<LotRow[]>("admin_inventory_lots", {
      method: "POST",
      query: "?select=id,batch_number",
      body: JSON.stringify({
        product_id: product.data.id,
        product_name: "POLLO CONTRAMUSLO MARINADO",
        supplier_name: MAKRO_SUPPLIER,
        batch_number: "MAK-003314013-POLLO-MARINADO",
        manufacturer_lot: "26002392",
        received_date: invoiceFor("003-314013").date,
        initial_quantity: quantity,
        current_quantity: quantity,
        unit: "kg",
        location: "Refrigerado 0-4 C",
        status: "activo",
        requires_traceability: true,
        requires_appcc_reception: true,
        generates_inventory_lot: true,
        storage_temperature: "Refrigerado 0-4 C",
        appcc_review_status: "revisado",
        observations: [
          `IdempotencyKey: marinado:${input.operativeDate}:26002392:${quantity}`,
          "Transformación: MARINADO.",
          "Origen: POLLO CONTRAMUSLO VC KG.",
          "Lote proveedor origen: 26002392.",
          "Factura/ref: 003-314013.",
          `Fecha marinado: ${input.operativeDate} ${input.operativeTime}.`,
          "COCINAR COMPLETAMENTE. NO CONSUMIR CRUDO. EVITAR CONTAMINACIÓN CRUZADA.",
        ].join("\n"),
        source: "makro_chicken_marinade",
      }),
      headers: { Prefer: "return=representation" },
    });
    if (!inserted.ok) return inserted;
    return { ok: true as const, data: { created: true } };
  },

  async queueLabels(input: { keys: string[]; operativeDate: string; operativeTime: string; responsible: string; requestId?: string }): Promise<DbResult<{ queued: PrintJob[]; labels: MakroLabel[] }>> {
    const allLabels = buildMakroLabels(input);
    const selected = allLabels.filter((label) => input.keys.includes(label.key));
    const missingDocumentDate = selected.find((label) => !cleanText(label.receivedDate) || label.receivedDate.toLowerCase().includes("revisar"));
    if (missingDocumentDate) {
      return { ok: false, error: `No se puede imprimir ${missingDocumentDate.productName}: falta fecha factura/albarán.` };
    }
    const queued: PrintJob[] = [];
    const requestId = cleanText(input.requestId) || crypto.randomUUID();
    for (const label of selected) {
      const rawCommand = labelEzpl(label);
      if (!isValidGodex80x50Ezpl(rawCommand)) return { ok: false, error: `EZPL inválido para ${label.productName}.` };
      const result = await enqueuePrintJob({
        printerKey: DEFAULT_GODEX_G500_PRINTER_KEY,
        payload: {
          title: label.productName,
          line1: `${label.state} · ${label.quantityText}`,
          line2: `${label.invoiceRef} · ${label.internalLot}`,
          template: `makro_${label.kind}_80x50`,
          raw_command: rawCommand,
          data: label,
          metadata: {
            requestedBy: label.responsible,
            module: "goods-reception",
            sourceType: "makro_reception_202607",
            sourceId: label.internalLot,
            createdFrom: "admin_makro_reception_202607",
            reason: `print_makro_${label.kind}_label`,
            batchCode: label.internalLot,
            requestId: `${requestId}:${label.key}`,
            idempotencyKey: `makro_202607:${label.key}:${requestId}`,
          },
        },
      });
      if (!result.ok) return result;
      queued.push(result.data);
      await createLabelRecord({
        model: label.kind === "marinated" ? "Marinado" : label.kind === "opening" ? "Apertura" : "Recepción",
        product: label.productName,
        batch: label.internalLot,
        supplier: MAKRO_SUPPLIER,
        elaboration_date: invoiceFor(label.invoiceRef).date,
        opening_date: label.kind === "opening" ? input.operativeDate : undefined,
        best_before_date: undefined,
        responsible: label.responsible,
        print_format: "termica",
        copies: 1,
        printer: "Godex G500",
        template: `makro_${label.kind}_80x50`,
        zpl_version: "EZPL",
        label_type: `makro_${label.kind}`,
        review_warning: label.warning,
      });
    }
    return { ok: true, data: { queued, labels: selected } };
  },
};
