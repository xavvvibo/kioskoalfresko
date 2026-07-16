export type TraceabilityQrLinks = {
  qrValue: string;
  qrRoute: string;
  qrUrl: string;
  isAbsolute: boolean;
  missingBaseUrl: boolean;
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/[\r\n\t]/g, "") : "";
}

function normalizeBaseUrl(value: unknown) {
  const raw = cleanText(value).replace(/\/+$/, "");
  if (!raw) return "";

  try {
    const url = new URL(raw);
    return url.protocol === "https:" && url.hostname ? url.toString().replace(/\/+$/, "") : "";
  } catch {
    return "";
  }
}

function normalizeAbsoluteHttpsUrl(value: unknown) {
  const raw = cleanText(value);
  if (!raw) return "";

  try {
    const url = new URL(raw);
    return url.protocol === "https:" && url.hostname ? url.toString() : "";
  } catch {
    return "";
  }
}

function routeFromAbsoluteUrl(value: string) {
  try {
    const url = new URL(value);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "";
  }
}

export function buildTraceabilityQrLinks(input: { qrValue?: unknown; baseUrl?: unknown }): TraceabilityQrLinks {
  const qrValue = cleanText(input.qrValue);
  if (!qrValue) {
    return { qrValue: "", qrRoute: "", qrUrl: "", isAbsolute: false, missingBaseUrl: false };
  }

  const absoluteQrUrl = normalizeAbsoluteHttpsUrl(qrValue);
  if (absoluteQrUrl) {
    return {
      qrValue: absoluteQrUrl,
      qrRoute: routeFromAbsoluteUrl(absoluteQrUrl) || absoluteQrUrl,
      qrUrl: absoluteQrUrl,
      isAbsolute: true,
      missingBaseUrl: false,
    };
  }

  const qrRoute = `/admin-kiosko/qr/${encodeURIComponent(qrValue)}`;
  const baseUrl = normalizeBaseUrl(input.baseUrl);
  return {
    qrValue,
    qrRoute,
    qrUrl: baseUrl ? `${baseUrl}${qrRoute}` : "",
    isAbsolute: false,
    missingBaseUrl: !baseUrl,
  };
}
