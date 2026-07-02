import "server-only";

export type GodexPrintRequest = {
  ezpl: string;
  jobName?: string;
  copies?: number;
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

export type GodexPrintResult =
  | {
      ok: true;
      jobId?: string;
      durationMs: number;
      serviceUrl: string;
    }
  | {
      ok: false;
      error: string;
      durationMs: number;
      serviceUrl?: string;
    };

const defaultTimeoutMs = 8_000;

function printServiceUrl() {
  return process.env.PRINT_SERVICE_URL?.trim() || "";
}

export async function sendGodexEzplToPrintService(input: GodexPrintRequest, timeoutMs = defaultTimeoutMs): Promise<GodexPrintResult> {
  const serviceUrl = printServiceUrl();
  const started = Date.now();

  if (!serviceUrl) {
    return {
      ok: false,
      error: "PRINT_SERVICE_URL no está configurado en el entorno del servidor.",
      durationMs: Date.now() - started,
    };
  }

  if (!input.ezpl.trim()) {
    return {
      ok: false,
      error: "La etiqueta EZPL está vacía.",
      durationMs: Date.now() - started,
      serviceUrl,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(new URL("/print", serviceUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.PRINT_SERVICE_API_KEY ? { "X-Print-Service-Key": process.env.PRINT_SERVICE_API_KEY } : {}),
      },
      body: JSON.stringify({ ezpl: input.ezpl }),
      signal: controller.signal,
    });

    const durationMs = Date.now() - started;
    const body = await response.json().catch(() => ({})) as { success?: boolean; error?: string; jobId?: string };

    if (!response.ok || !body.success) {
      const error = body.error || `Servicio de impresión respondió HTTP ${response.status}.`;
      console.error("[GODEX PRINT ERROR]", { error, status: response.status, durationMs });
      return { ok: false, error, durationMs, serviceUrl };
    }

    return { ok: true, jobId: body.jobId, durationMs, serviceUrl };
  } catch (error) {
    const durationMs = Date.now() - started;
    const message = error instanceof Error && error.name === "AbortError"
      ? "Tiempo de espera agotado conectando con el servicio local de impresión Godex."
      : error instanceof Error ? error.message : "No se ha podido conectar con el servicio local de impresión Godex.";
    console.error("[GODEX PRINT ERROR]", { error: message, durationMs });
    return { ok: false, error: message, durationMs, serviceUrl };
  } finally {
    clearTimeout(timeout);
  }
}
