export type ZebraTemplate = "elaboracion" | "congelacion" | "descongelacion" | "recepcion" | "trazabilidad";

export type ZebraLabelData = {
  template: ZebraTemplate;
  product?: string;
  batch?: string;
  supplier?: string;
  sourceBatch?: string;
  productionDate?: string;
  freezingDate?: string;
  defrostingDate?: string;
  receptionDate?: string;
  expiryDate?: string;
  responsible?: string;
  copies?: number;
};

export const zebraDefaultConfig = {
  manufacturer: "Zebra",
  model: "Zebra ZD421",
  resolution: "203 dpi",
  size: "58x40 mm",
  widthDots: 464,
  heightDots: 320,
  language: "ZPL",
  zplVersion: "ZPL II",
  defaultCopies: 1,
};

function clean(value?: string | number | null) {
  return String(value || "")
    .replace(/[\^~]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function zplText(value: string, max = 34) {
  const text = clean(value);
  return text.length > max ? `${text.slice(0, max - 1)}.` : text;
}

function qrPayload(data: ZebraLabelData) {
  return JSON.stringify({
    product: clean(data.product),
    batch: clean(data.batch),
    supplier: clean(data.supplier),
    source_batch: clean(data.sourceBatch),
    production_date: clean(data.productionDate),
    freezing_date: clean(data.freezingDate),
    defrosting_date: clean(data.defrostingDate),
    reception_date: clean(data.receptionDate),
    expiry_date: clean(data.expiryDate),
  });
}

function templateTitle(template: ZebraTemplate) {
  if (template === "congelacion") return "CONGELACION";
  if (template === "descongelacion") return "DESCONGELACION";
  if (template === "recepcion") return "RECEPCION";
  if (template === "trazabilidad") return "TRAZABILIDAD";
  return "ELABORACION";
}

function labelRows(data: ZebraLabelData): Array<[string, string]> {
  if (data.template === "recepcion") {
    return [
      ["Proveedor", data.supplier || ""],
      ["Producto", data.product || ""],
      ["Lote prov.", data.sourceBatch || data.batch || ""],
      ["Recepcion", data.receptionDate || ""],
      ["Caducidad", data.expiryDate || ""],
    ];
  }

  if (data.template === "congelacion") {
    return [
      ["Producto", data.product || ""],
      ["Lote", data.batch || ""],
      ["Congelado", data.freezingDate || ""],
      ["Cons. antes", data.expiryDate || ""],
      ["Resp.", data.responsible || ""],
    ];
  }

  if (data.template === "descongelacion") {
    return [
      ["Producto", data.product || ""],
      ["Lote", data.batch || ""],
      ["Descong.", data.defrostingDate || ""],
      ["Cons. antes", data.expiryDate || ""],
      ["Resp.", data.responsible || ""],
    ];
  }

  return [
    ["Producto", data.product || ""],
    ["Lote", data.batch || ""],
    ["Elaborado", data.productionDate || ""],
    ["Cons. antes", data.expiryDate || ""],
    ["Resp.", data.responsible || ""],
  ];
}

export function buildZebraLabelZpl(data: ZebraLabelData) {
  const copies = Math.max(1, Math.min(99, Math.round(data.copies || zebraDefaultConfig.defaultCopies)));
  const title = templateTitle(data.template);
  const rows = labelRows(data);
  const warning = data.template === "descongelacion" ? "^FO20,250^A0N,24,24^FDPRODUCTO DESCONGELADO^FS" : "";
  const rowZpl = rows
    .map(([label, value], index) => {
      const y = 76 + (index * 31);
      return `^FO20,${y}^A0N,20,20^FD${zplText(label, 12)}:^FS^FO150,${y}^A0N,20,20^FD${zplText(value, 24)}^FS`;
    })
    .join("\n");

  return [
    "^XA",
    "^CI28",
    `^PW${zebraDefaultConfig.widthDots}`,
    `^LL${zebraDefaultConfig.heightDots}`,
    "^LH0,0",
    "^FO16,14^A0N,28,28^FDKIOSKO ALFRESKO^FS",
    `^FO16,45^A0N,24,24^FD${title}^FS`,
    "^FO340,28^BQN,2,5^FDLA," + qrPayload(data) + "^FS",
    rowZpl,
    warning,
    "^FO20,292^A0N,16,16^FDAPPCC interno - Zebra ZD421 58x40^FS",
    `^PQ${copies}`,
    "^XZ",
  ].filter(Boolean).join("\n");
}
