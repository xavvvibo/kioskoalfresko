export type ParsedInternalQr =
  | { ok: true; kind: "prep_batch"; qrValue: string; identifier: string; identifierType: "id" | "batch_code"; batchCode?: string; batchId?: string }
  | { ok: false; qrValue: string; error: "invalid_format" | "missing_identifier" };

const PREP_BATCH_PREFIX = "ERP:prep_batch:";
const QR_ROUTE_MARKER = "/admin-kiosko/qr/";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function decodeRepeated(value: string) {
  let decoded = value.trim();

  for (let index = 0; index < 3; index += 1) {
    try {
      const next = decodeURIComponent(decoded).trim();
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }

  return decoded;
}

function extractQrPayload(value: string) {
  const decoded = decodeRepeated(value);
  if (!decoded) return "";

  try {
    const url = new URL(decoded);
    const markerIndex = url.pathname.indexOf(QR_ROUTE_MARKER);
    if (markerIndex >= 0) {
      return decodeRepeated(url.pathname.slice(markerIndex + QR_ROUTE_MARKER.length));
    }
  } catch {
    // Not a full URL; continue with route/raw parsing.
  }

  const markerIndex = decoded.indexOf(QR_ROUTE_MARKER);
  if (markerIndex >= 0) {
    return decodeRepeated(decoded.slice(markerIndex + QR_ROUTE_MARKER.length));
  }

  return decoded;
}

export function parseInternalQrValue(value: string): ParsedInternalQr {
  const qrValue = extractQrPayload(value);
  if (!qrValue.startsWith(PREP_BATCH_PREFIX)) {
    return { ok: false, qrValue, error: "invalid_format" };
  }

  const identifier = qrValue.slice(PREP_BATCH_PREFIX.length).trim();
  if (!identifier) {
    return { ok: false, qrValue, error: "missing_identifier" };
  }

  if (isUuid(identifier)) {
    return { ok: true, kind: "prep_batch", qrValue, identifier, identifierType: "id", batchId: identifier };
  }

  return { ok: true, kind: "prep_batch", qrValue, identifier, identifierType: "batch_code", batchCode: identifier };
}
