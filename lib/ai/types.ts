export type AiDocumentKind =
  | "certificado_manipulador"
  | "certificado_ddd"
  | "memoria_sanitaria"
  | "appcc"
  | "factura"
  | "albaran"
  | "mantenimiento"
  | "inspeccion"
  | "etiqueta_lote"
  | "termometro"
  | "aceite"
  | "otro";

export type OcrExtractorKind =
  | "albaran"
  | "factura"
  | "etiqueta"
  | "certificado"
  | "termometro"
  | "aceite"
  | "clasificacion";

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

export type OcrProduct = {
  nombre: string;
  cantidad: string;
  lote: string;
  caducidad: string;
  importe?: string;
};

export type OcrAlbaranResult = {
  proveedor: string;
  cif?: string;
  fecha: string;
  numero?: string;
  productos: OcrProduct[];
  temperaturas: string[];
  observaciones: string;
};

export type OcrFacturaResult = {
  proveedor: string;
  cif: string;
  fecha: string;
  numero: string;
  productos: OcrProduct[];
  base_imponible: string;
  iva: string;
  total: string;
};

export type OcrEtiquetaResult = {
  producto: string;
  lote: string;
  caducidad: string;
  fecha_fabricacion: string;
};

export type OcrTermometroResult = {
  temperatura: number | null;
  equipo?: "Arcón frío" | "Arcón congelador" | "Arcón hielo" | "";
};

export type OcrAceiteResult = {
  estado: string;
  compuestos_polares: string;
  correcto: boolean;
  revisar: boolean;
  incidencia: boolean;
  observaciones: string;
};

export type OcrCertificadoResult = {
  tipo_detectado: AiDocumentKind;
  titular: string;
  entidad: string;
  fecha: string;
  caducidad: string;
  observaciones: string;
};

export type OcrResultData =
  | OcrAlbaranResult
  | OcrFacturaResult
  | OcrEtiquetaResult
  | OcrTermometroResult
  | OcrAceiteResult
  | OcrCertificadoResult
  | AiDocumentClassification;

export type OcrUploadInput = {
  kind: OcrExtractorKind;
  filename: string;
  mimeType: string;
  base64?: string;
  pages?: OcrPageInput[];
  extractedText?: string;
};

export type OcrUploadResult = {
  documentName: string;
  requestedKind: OcrExtractorKind;
  detectedType: AiDocumentKind;
  status: "prepared" | "processed";
  result: OcrResultData;
  message: string;
  pages?: OcrPageSummary[];
  rawOpenAIText?: string;
};

export type AiResult<T> = { ok: true; data: T; rawOpenAIText?: string } | { ok: false; error: string; data?: T };

export type OcrPageInput = {
  pageNumber: number;
  totalPages: number;
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  base64: string;
};

export type OcrPageSummary = {
  pageNumber: number;
  totalPages: number;
  text: string;
};

export type OcrProgressEvent =
  | { type: "progress"; message: string; progress: number; pageNumber?: number; totalPages?: number }
  | { type: "done"; data: OcrUploadResult }
  | { type: "error"; error: string; rawOpenAIText?: string };
