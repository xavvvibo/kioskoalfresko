"use client";

import { useEffect, useState } from "react";

type BridgeStatus = "checking" | "ok" | "error";

type HealthPayload = {
  status?: string;
  printerKey?: string;
  transport?: string;
  details?: {
    printerTcp?: {
      ok?: boolean;
      host?: string;
      port?: number;
      error?: string;
    };
  };
};

export function LocalBridgeStatus() {
  const [status, setStatus] = useState<BridgeStatus>("checking");
  const [detail, setDetail] = useState("Comprobando bridge local...");

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 3500);

    fetch("http://127.0.0.1:8787/health", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json().catch(() => ({} as HealthPayload));
        const printerTcp = body.details?.printerTcp;
        if (response.ok && body.status === "OK") {
          setStatus("ok");
          setDetail(`${body.printerKey || "impresora"} · ${body.transport || "tcp"} · ${printerTcp?.host || "host"}:${printerTcp?.port || 9100}`);
          return;
        }
        setStatus("error");
        setDetail(printerTcp?.error || "Bridge local sin conexión completa con la impresora.");
      })
      .catch((error: unknown) => {
        setStatus("error");
        setDetail(error instanceof Error && error.name === "AbortError"
          ? "Bridge local no responde en 127.0.0.1:8787."
          : "Bridge local no iniciado o bloqueado por CORS/configuración.");
      })
      .finally(() => window.clearTimeout(timeout));

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, []);

  const className = status === "ok"
    ? "border-emerald-300 bg-emerald-50 text-emerald-950"
    : status === "checking"
      ? "border-amber-300 bg-amber-50 text-amber-950"
      : "border-[#d94b2b]/40 bg-[#fff1ed] text-[#9f2d18]";

  return (
    <div className={`rounded-xl border px-3 py-2 text-sm ${className}`}>
      <p className="font-black uppercase tracking-[0.08em]">
        {status === "ok" ? "Bridge local OK" : status === "checking" ? "Comprobando bridge" : "Bridge local no disponible"}
      </p>
      <p className="mt-1 text-xs font-semibold leading-5">{detail}</p>
    </div>
  );
}
