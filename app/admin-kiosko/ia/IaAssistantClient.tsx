"use client";

import { useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { OcrExtractorKind, OcrUploadResult } from "@/lib/ai/types";

type Card = {
  kind: OcrExtractorKind;
  icon: string;
  title: string;
  description: string;
};

const cards: Card[] = [
  {
    kind: "albaran",
    icon: "📦",
    title: "Escanear albarán",
    description: "Extrae proveedor, fecha, productos, lotes, caducidades, temperatura y observaciones.",
  },
  {
    kind: "factura",
    icon: "🧾",
    title: "Escanear factura",
    description: "Prepara proveedor, fecha, importe y productos para revisión documental.",
  },
  {
    kind: "etiqueta",
    icon: "🏷",
    title: "Escanear etiqueta de lote",
    description: "Lee producto, lote, caducidad y fecha de fabricación visibles.",
  },
  {
    kind: "termometro",
    icon: "🌡",
    title: "Leer temperatura mediante fotografía",
    description: "Preparado para displays digitales de Arcón frío, Arcón congelador y Arcón hielo.",
  },
  {
    kind: "aceite",
    icon: "🍟",
    title: "Leer control de aceite mediante fotografía",
    description: "Detecta estado, compuestos polares, revisión, incidencia y observaciones.",
  },
];

type ApiResponse = { ok: true; data: OcrUploadResult } | { ok: false; error: string };

function labelForKind(kind: string) {
  return kind.replaceAll("_", " ");
}

function asText(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value, null, 2);
}

function EditableResult({ result }: { result: OcrUploadResult }) {
  const data = result.result as Record<string, unknown>;
  const products = Array.isArray(data.productos) ? data.productos : [];
  const simpleEntries = Object.entries(data).filter(([key]) => key !== "productos");

  return (
    <section className="mt-8 rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
      <div className="flex flex-col gap-3 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f2c6bb]">Pantalla de revisión</p>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">{result.documentName}</h2>
          <p className="mt-2 text-sm leading-6 text-stone-300">
            Tipo detectado: {labelForKind(result.detectedType)} · Estado: {result.status === "processed" ? "procesado" : "preparado"}
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full border border-amber-300/30 bg-amber-100 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-amber-950">
          Confirmación requerida
        </span>
      </div>

      <form className="mt-6 grid gap-5">
        <div className="grid gap-4 md:grid-cols-2">
          {simpleEntries.map(([key, value]) => (
            <label key={key} className="grid gap-2 text-sm font-semibold text-stone-200">
              {labelForKind(key)}
              {String(key).includes("observaciones") || asText(value).length > 80 ? (
                <textarea
                  name={key}
                  defaultValue={asText(value)}
                  rows={4}
                  className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30"
                />
              ) : (
                <input
                  name={key}
                  defaultValue={asText(value)}
                  className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30"
                />
              )}
            </label>
          ))}
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-[#0d0d0d] p-4">
          <h3 className="text-lg font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Productos, lotes y caducidades</h3>
          <div className="mt-4 grid gap-3">
            {products.length ? products.map((product, index) => {
              const item: Record<string, unknown> = typeof product === "object" && product !== null ? product as Record<string, unknown> : { producto: product };
              return (
                <div key={`${result.documentName}-${index}`} className="grid gap-3 rounded-[1.2rem] border border-white/10 bg-white/6 p-3 md:grid-cols-4">
                  {["nombre", "cantidad", "lote", "caducidad"].map((field) => (
                    <label key={field} className="grid gap-2 text-xs font-black uppercase tracking-[0.12em] text-stone-300">
                      {field}
                      <input
                        name={`productos_${index}_${field}`}
                        defaultValue={asText(item[field] ?? item.producto)}
                        className="rounded-2xl border border-white/12 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30"
                      />
                    </label>
                  ))}
                </div>
              );
            }) : (
              <p className="rounded-[1.2rem] border border-white/10 bg-white/6 px-4 py-3 text-sm font-semibold text-stone-300">
                Sin productos detectados todavía. La revisión queda preparada para completar manualmente.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="rounded-full border border-white/20 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:border-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => window.confirm("¿Confirmas que quieres registrar esta recepción cuando se conecte con las acciones APPCC?")}
            className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-stone-950"
          >
            Registrar recepción
          </button>
        </div>
      </form>
    </section>
  );
}

export function IaAssistantClient() {
  const [activeKind, setActiveKind] = useState<OcrExtractorKind | null>(null);
  const [result, setResult] = useState<OcrUploadResult | null>(null);
  const [error, setError] = useState("");
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const isUploading = activeKind !== null;

  const uploadLabel = useMemo(() => activeKind ? cards.find((card) => card.kind === activeKind)?.title : "", [activeKind]);

  async function upload(kind: OcrExtractorKind, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setActiveKind(kind);
    setError("");

    const formData = new FormData();
    formData.append("kind", kind);
    formData.append("file", file);

    try {
      const response = await fetch("/admin-kiosko/api/ocr", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json() as ApiResponse;

      if (!payload.ok) {
        setError(payload.error);
        return;
      }

      setResult(payload.data);
    } catch {
      setError("No se ha podido completar la subida OCR.");
    } finally {
      setActiveKind(null);
      event.target.value = "";
    }
  }

  return (
    <>
      <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.18)] sm:p-6">
        <div className="flex flex-col gap-3 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f2c6bb]">OCR desde servidor</p>
            <h2 className="mt-2 text-3xl font-black uppercase tracking-[-0.04em] text-[#fff8ef]">Asistente APPCC inteligente</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
              Subida segura de fotografías y PDF para preparar extracción, revisión editable y registro APPCC con confirmación.
            </p>
          </div>
          <a
            href="/admin-kiosko/ia/historial"
            className="inline-flex w-fit items-center justify-center rounded-full border border-white/20 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:border-[#d94b2b] hover:text-[#f2c6bb]"
          >
            Historial IA
          </a>
        </div>

        {error ? (
          <p className="mt-5 rounded-[1.3rem] border border-[#d94b2b]/40 bg-[#d94b2b]/12 px-4 py-3 text-sm font-semibold text-[#f2c6bb]">
            {error}
          </p>
        ) : null}

        {isUploading ? (
          <p className="mt-5 rounded-[1.3rem] border border-amber-300/30 bg-amber-100 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-amber-950">
            Procesando: {uploadLabel}
          </p>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <article key={card.kind} className="flex min-h-[17rem] flex-col rounded-[1.5rem] border border-white/10 bg-[#fffaf4] p-5 text-stone-950 shadow-[0_14px_34px_rgba(0,0,0,0.18)]">
              <div className="flex items-start justify-between gap-3">
                <span className="text-4xl" aria-hidden="true">{card.icon}</span>
                <span className="rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-900">
                  Server-only
                </span>
              </div>
              <h3 className="mt-5 text-2xl font-black uppercase leading-tight tracking-[-0.03em]">{card.title}</h3>
              <p className="mt-3 text-sm leading-6 text-stone-700">{card.description}</p>
              <div className="mt-auto pt-6">
                <input
                  ref={(node) => {
                    inputs.current[card.kind] = node;
                  }}
                  type="file"
                  accept="image/*,application/pdf"
                  className="sr-only"
                  onChange={(event) => upload(card.kind, event)}
                />
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => inputs.current[card.kind]?.click()}
                  className="inline-flex w-full items-center justify-center rounded-full border border-stone-950 bg-stone-950 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-[#d94b2b] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Subir fotografía
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {result ? <EditableResult result={result} /> : null}
    </>
  );
}
