export type ParsedInternalQr =
  | { ok: true; kind: "prep_batch"; qrValue: string; batchCode: string }
  | { ok: false; qrValue: string; error: "invalid_format" | "missing_batch_code" };

const PREP_BATCH_PREFIX = "ERP:prep_batch:";
const QR_ROUTE_MARKER = "/admin-kiosko/qr/";

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

  const batchCode = qrValue.slice(PREP_BATCH_PREFIX.length).trim();
  if (!batchCode) {
    return { ok: false, qrValue, error: "missing_batch_code" };
  }

  return { ok: true, kind: "prep_batch", qrValue, batchCode };
}
