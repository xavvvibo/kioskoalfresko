export type AiDocumentKind =
  | "albaran_factura"
  | "etiqueta_lote"
  | "termometro"
  | "aceite"
  | "documento_sanitario"
  | "desconocido";

export type AiDocumentClassification = {
  kind: AiDocumentKind;
  confidence: number;
  summary: string;
  suggestedRoute?: string;
};

export type AiDocumentInput = {
  filename?: string;
  mimeType?: string;
  text?: string;
};

export type AiResult<T> = { ok: true; data: T } | { ok: false; error: string };
