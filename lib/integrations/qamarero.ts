export type QamareroMode = "external_url" | "iframe" | "api";

export type QamareroConfig = {
  mode: QamareroMode;
  publicUrl?: string;
  iframeUrl?: string;
  apiBaseUrl?: string;
  venueId?: string;
  apiKey?: string;
};

export type ReservationRequest = {
  date: string;
  time: string;
  guests: number;
  name: string;
  phone: string;
};

export function getQamareroConfig(): QamareroConfig {
  return {
    mode: (process.env.NEXT_PUBLIC_QAMARERO_MODE as QamareroMode) || "external_url",
    publicUrl: process.env.NEXT_PUBLIC_QAMARERO_PUBLIC_URL,
    iframeUrl: process.env.NEXT_PUBLIC_QAMARERO_IFRAME_URL,
    apiBaseUrl: process.env.QAMARERO_API_BASE_URL,
    venueId: process.env.QAMARERO_VENUE_ID,
    apiKey: process.env.QAMARERO_API_KEY,
  };
}

export function getReservationEntryPoint() {
  const config = getQamareroConfig();
  if (config.mode === "iframe" && config.iframeUrl) return { type: "iframe" as const, url: config.iframeUrl };
  if (config.publicUrl) return { type: "external" as const, url: config.publicUrl };
  return { type: "pending" as const, url: null };
}

export async function createQamareroReservation(_payload: ReservationRequest) {
  const config = getQamareroConfig();
  if (config.mode !== "api" || !config.apiBaseUrl || !config.apiKey || !config.venueId) {
    throw new Error("Qamarero API no configurada");
  }
  throw new Error("Integración API pendiente de credenciales y contrato real de Qamarero");
}
