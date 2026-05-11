type AnalyticsValue = string | number | boolean | null | undefined;

type AnalyticsPayload = Record<string, AnalyticsValue>;

declare global {
  interface Window {
    gtag?: (
      command: "event",
      eventName: string,
      params?: AnalyticsPayload,
    ) => void;
    dataLayer?: Array<Record<string, AnalyticsValue>>;
  }
}

export function trackEvent(eventName: string, params: AnalyticsPayload = {}) {
  if (typeof window === "undefined") return;

  try {
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, params);
    }

    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({
        event: eventName,
        ...params,
      });
    }
  } catch {
    // fallback silencioso
  }
}

