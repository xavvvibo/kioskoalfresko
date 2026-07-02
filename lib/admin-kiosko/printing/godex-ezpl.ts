export type GodexLabelTemplate = "produccion" | "trazabilidad" | "congelacion" | "descongelacion" | "recepcion";

export type GodexLabelConfig = {
  widthMm: number;
  heightMm: number;
  dpi: 203 | 300;
  marginDots: number;
  gapMm: number;
  darkness: number;
  speed: number;
  copies: number;
  fontWidth: number;
  fontHeight: number;
};

export type GodexTraceabilityLabelInput = {
  template?: GodexLabelTemplate;
  product: string;
  batch: string;
  supplier?: string;
  sourceBatch?: string;
  productionDate?: string;
  expiryDate?: string;
  freezingDate?: string;
  defrostingDate?: string;
  receptionDate?: string;
  allergens?: string[];
  responsible?: string;
  traceabilityCode?: string;
  qrPayload?: Record<string, unknown> | string;
  sanitaryText?: string;
  copies?: number;
  config?: Partial<GodexLabelConfig>;
};

export type GodexProductionLabelInput = Omit<GodexTraceabilityLabelInput, "template"> & {
  elaborationType?: string;
};

export const godexG500DefaultConfig: GodexLabelConfig = {
  widthMm: 58,
  heightMm: 40,
  dpi: 203,
  marginDots: 12,
  gapMm: 3,
  darkness: 10,
  speed: 4,
  copies: 1,
  fontWidth: 1,
  fontHeight: 1,
};

function dots(mm: number, dpi: number) {
  return Math.round((mm / 25.4) * dpi);
}

function mergeConfig(input?: Partial<GodexLabelConfig>): GodexLabelConfig {
  return {
    ...godexG500DefaultConfig,
    ...input,
    widthMm: Math.max(20, input?.widthMm || godexG500DefaultConfig.widthMm),
    heightMm: Math.max(20, input?.heightMm || godexG500DefaultConfig.heightMm),
    marginDots: Math.max(0, Math.round(input?.marginDots ?? godexG500DefaultConfig.marginDots)),
    gapMm: Math.max(0, input?.gapMm ?? godexG500DefaultConfig.gapMm),
    darkness: Math.max(0, Math.min(19, Math.round(input?.darkness ?? godexG500DefaultConfig.darkness))),
    speed: Math.max(1, Math.min(6, Math.round(input?.speed ?? godexG500DefaultConfig.speed))),
    copies: Math.max(1, Math.min(99, Math.round(input?.copies ?? godexG500DefaultConfig.copies))),
    fontWidth: Math.max(1, Math.min(4, Math.round(input?.fontWidth ?? godexG500DefaultConfig.fontWidth))),
    fontHeight: Math.max(1, Math.min(4, Math.round(input?.fontHeight ?? godexG500DefaultConfig.fontHeight))),
  };
}

export function sanitizeGodexEzplText(value?: string | number | null, maxLength = 48) {
  const normalized = String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\^~\r\n\t]/g, " ")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized.length > maxLength ? `${normalized.slice(0, Math.max(1, maxLength - 1))}.` : normalized;
}

function titleFor(template: GodexLabelTemplate) {
  if (template === "congelacion") return "CONGELACION";
  if (template === "descongelacion") return "DESCONGELACION";
  if (template === "recepcion") return "RECEPCION";
  if (template === "trazabilidad") return "TRAZABILIDAD";
  return "ELABORACION";
}

function qrPayload(input: GodexTraceabilityLabelInput) {
  if (typeof input.qrPayload === "string") return sanitizeGodexEzplText(input.qrPayload, 240);

  return sanitizeGodexEzplText(JSON.stringify({
    product: input.product,
    batch: input.batch,
    supplier: input.supplier,
    source_batch: input.sourceBatch,
    production_date: input.productionDate,
    expiry_date: input.expiryDate,
    freezing_date: input.freezingDate,
    defrosting_date: input.defrostingDate,
    reception_date: input.receptionDate,
    responsible: input.responsible,
    traceability_code: input.traceabilityCode,
  }), 240);
}

function textCommand(x: number, y: number, value: string, options?: { width?: number; height?: number; max?: number }) {
  const width = options?.width ?? 1;
  const height = options?.height ?? 1;
  return `AA,${x},${y},1,${width},${height},0,0,${sanitizeGodexEzplText(value, options?.max ?? 42)}`;
}

function lineCommand(x1: number, y1: number, x2: number, y2: number, thickness = 2) {
  return `Lo,${x1},${y1},${x2},${y2},${thickness}`;
}

function qrCommand(x: number, y: number, payload: string) {
  return `BQ,${x},${y},2,4,80,0,0,${payload}`;
}

function rowsFor(input: GodexTraceabilityLabelInput): Array<[string, string | undefined]> {
  if (input.template === "recepcion") {
    return [
      ["PRODUCTO", input.product],
      ["LOTE PROV.", input.sourceBatch || input.batch],
      ["RECEP.", input.receptionDate],
      ["CAD.", input.expiryDate],
      ["PROV.", input.supplier],
    ];
  }

  if (input.template === "congelacion") {
    return [
      ["PRODUCTO", input.product],
      ["LOTE", input.batch],
      ["CONG.", input.freezingDate],
      ["CAD.", input.expiryDate],
      ["RESP.", input.responsible],
    ];
  }

  if (input.template === "descongelacion") {
    return [
      ["PRODUCTO", input.product],
      ["LOTE", input.batch],
      ["DESCONG.", input.defrostingDate],
      ["CONS.", input.expiryDate],
      ["RESP.", input.responsible],
    ];
  }

  return [
    ["PRODUCTO", input.product],
    ["LOTE", input.batch],
    ["ELAB.", input.productionDate],
    ["CAD.", input.expiryDate],
    ["RESP.", input.responsible],
  ];
}

export function generateGodexTraceabilityEzpl(input: GodexTraceabilityLabelInput) {
  const template = input.template || "trazabilidad";
  const config = mergeConfig({ ...input.config, copies: input.copies ?? input.config?.copies });
  const widthDots = dots(config.widthMm, config.dpi);
  const title = titleFor(template);
  const rows = rowsFor({ ...input, template });
  const allergens = input.allergens?.length ? `ALERGENOS: ${input.allergens.join(" ")}` : "";
  const warning = template === "descongelacion" ? "PRODUCTO DESCONGELADO" : "";
  const legalText = input.sanitaryText || warning || "APPCC interno - Kiosko Alfresko";
  const qr = qrPayload(input);
  const left = config.marginDots;
  const textX = left;
  const valueX = 118;

  return [
    `^Q${config.heightMm},${config.gapMm}`,
    `^W${config.widthMm}`,
    `^H${config.darkness}`,
    `^S${config.speed}`,
    `^P${config.copies}`,
    "^C1",
    "^R0",
    "~Q+0",
    "^O0",
    "^D0",
    "^L",
    textCommand(left, 12, "KIOSKO ALFRESKO", { width: 2, height: 2, max: 24 }),
    textCommand(left, 42, title, { width: 1, height: 1, max: 24 }),
    lineCommand(left, 66, widthDots - left, 66),
    ...rows.map(([label, value], index) => {
      const y = 78 + (index * 27);
      return `${textCommand(textX, y, `${label}:`, { max: 12 })}\n${textCommand(valueX, y, value || "-", { max: 29 })}`;
    }),
    allergens ? textCommand(left, 220, allergens, { max: 48 }) : "",
    textCommand(left, 244, legalText, { max: 48 }),
    qrCommand(widthDots - 126, 76, qr),
    textCommand(left, 286, `TRAZA: ${input.traceabilityCode || input.batch}`, { max: 44 }),
    "E",
  ].filter(Boolean).join("\n");
}

export function generateGodexProductionLabelEzpl(input: GodexProductionLabelInput) {
  return generateGodexTraceabilityEzpl({
    ...input,
    template: "produccion",
    sanitaryText: input.sanitaryText || `${input.elaborationType || "Elaboracion"} - conservar segun APPCC`,
  });
}
