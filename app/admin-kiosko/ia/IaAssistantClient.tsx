"use client";

import { useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { OcrExtractorKind, OcrProgressEvent, OcrUploadResult } from "@/lib/ai/types";
import { buildZebraLabelZpl } from "@/lib/admin-kiosko/zebra";
import { ZebraPrintButton } from "../_components/ZebraPrintButton";
import { saveAiReceptionAction } from "../actions";

type SupplierOption = {
  id: string;
  name: string;
  tax_id: string | null;
  status: string | null;
  health_register: string | null;
  appcc: string | null;
};

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

function labelForKind(kind: string) {
  return kind.replaceAll("_", " ");
}

function asText(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value, null, 2);
}

function firstText(data: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
  }

  return "";
}

function normalizeForMatch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function normalizedProducts(data: Record<string, unknown>) {
  const products = Array.isArray(data.productos) ? data.productos : [];

  return products.map<Record<string, unknown>>((product) => typeof product === "object" && product !== null
    ? product as Record<string, unknown>
    : { nombre: product });
}

function EditableResult({ result, suppliers }: { result: OcrUploadResult; suppliers: SupplierOption[] }) {
  const data = result.result as Record<string, unknown>;
  const products = normalizedProducts(data);
  const supplier = firstText(data, ["proveedor", "supplier", "supplier_name"]);
  const registeredSupplier = supplier
    ? suppliers.find((item) => normalizeForMatch(item.name) === normalizeForMatch(supplier) || (item.tax_id && normalizeForMatch(item.tax_id) === normalizeForMatch(firstText(data, ["cif", "CIF", "supplier_tax_id"]))))
    : undefined;
  const resolvedSupplier = registeredSupplier?.name || supplier;
  const cif = firstText(data, ["cif", "CIF", "supplier_tax_id"]);
  const documentDate = firstText(data, ["fecha", "document_date"]);
  const documentNumber = firstText(data, ["numero", "número", "document_number"]);
  const totalAmount = firstText(data, ["total", "importe", "total_amount"]);
  const observations = firstText(data, ["observaciones", "summary"]);
  const temperature = Array.isArray(data.temperaturas) ? data.temperaturas.join(", ") : firstText(data, ["temperatura"]);
  const batches = products.map((product) => asText(product.lote ?? product.batch_number)).filter(Boolean);
  const expiries = products.map((product) => asText(product.caducidad ?? product.expiry_date)).filter(Boolean);
  const missingNotes = [
    !batches.length ? "Lote no visible en el documento. Revisar si aplica." : "",
    !expiries.length ? "Caducidad no visible en el documento. Revisar si aplica." : "",
    !temperature ? "Temperatura no visible en el documento. Revisar si aplica." : "",
  ].filter(Boolean);
  const reviewComplete = supplier && documentDate && products.length && batches.length && expiries.length && temperature;
  const firstProduct = products[0] || {};
  const receptionProduct = asText(firstProduct.nombre ?? firstProduct.producto);
  const receptionBatch = asText(firstProduct.lote ?? firstProduct.batch_number);
  const receptionExpiry = asText(firstProduct.caducidad ?? firstProduct.expiry_date);
  const receptionZpl = buildZebraLabelZpl({
    template: "recepcion",
    product: receptionProduct,
    batch: receptionBatch,
    supplier: resolvedSupplier,
    sourceBatch: receptionBatch,
    receptionDate: documentDate,
    expiryDate: receptionExpiry,
    copies: 1,
  });

  return (
    <section className="mt-8 rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
      <div className="flex flex-col gap-3 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f2c6bb]">Pantalla de revisión</p>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">{result.documentName}</h2>
          <p className="mt-2 text-sm leading-6 text-stone-300">
            Tipo detectado: {labelForKind(result.detectedType)} · Estado: {result.status === "processed" ? "procesado" : "recibido"}
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full border border-amber-300/30 bg-amber-100 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-amber-950">
          Confirmación requerida
        </span>
      </div>
      {receptionProduct || resolvedSupplier ? (
        <div className="mt-5 rounded-[1.3rem] border border-white/10 bg-white/6 p-4">
          <p className="mb-3 text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">Etiqueta recepción</p>
          <ZebraPrintButton
            zpl={receptionZpl}
            filename={`${receptionBatch || receptionProduct || "recepcion-appcc"}.zpl`}
            label="Imprimir etiqueta recepción"
            historyPayload={{
              model: "Recepción",
              template: "recepcion",
              product: receptionProduct,
              batch: receptionBatch,
              supplier: resolvedSupplier,
              expiry_date: receptionExpiry,
              copies: 1,
            }}
          />
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 rounded-[1.5rem] border border-white/10 bg-[#0d0d0d] p-4 md:grid-cols-4">
        {[
          ["Proveedor", registeredSupplier ? `${registeredSupplier.name} · Proveedor registrado` : supplier ? `${supplier} · Proveedor detectado no registrado. Añadir proveedor al confirmar.` : "No visible"],
          ["CIF", cif || "No visible"],
          ["Fecha documento", documentDate || "No visible"],
          ["Número", documentNumber || "No visible"],
          ["Productos detectados", String(products.length)],
          ["Lotes detectados", batches.length ? batches.join(", ") : "No visibles"],
          ["Caducidades detectadas", expiries.length ? expiries.join(", ") : "No visibles"],
          ["Temperatura recepción", temperature || "No visible"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/6 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f2c6bb]">{label}</p>
            <p className="mt-2 text-sm font-semibold text-white">{value}</p>
          </div>
        ))}
        <div className="rounded-2xl border border-white/10 bg-white/6 p-3 md:col-span-4">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f2c6bb]">Estado revisión</p>
          <p className="mt-2 text-sm font-black uppercase tracking-[0.12em] text-white">
            {reviewComplete ? "Completo" : "Revisión manual requerida"}
          </p>
          {missingNotes.length ? (
            <div className="mt-3 grid gap-2">
              {missingNotes.map((note) => (
                <p key={note} className="rounded-xl border border-amber-300/30 bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-950">
                  {note}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <form action={saveAiReceptionAction} className="mt-6 grid gap-5">
        <input type="hidden" name="ocr_json" value={JSON.stringify(result.result)} />
        <input type="hidden" name="original_filename" value={result.documentName} />
        <input type="hidden" name="uploaded_document_id" value={result.originalDocument?.id || ""} />
        <input type="hidden" name="original_storage_status" value={result.originalDocument?.storage_status || "metadata_only"} />
        <input type="hidden" name="detected_type" value={result.detectedType} />
        <input type="hidden" name="document_type" value={result.detectedType} />
        <input type="hidden" name="product_count" value={products.length} />
        <input type="hidden" name="supplier_id" value={registeredSupplier?.id || (supplier ? "__new__" : "")} />

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-stone-200">
            Proveedor autorizado
            <input name="supplier_name" defaultValue={resolvedSupplier} list="ocr-suppliers" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
          </label>
          <datalist id="ocr-suppliers">
            {suppliers.map((item) => <option key={item.id} value={item.name} />)}
          </datalist>
          <label className="grid gap-2 text-sm font-semibold text-stone-200">
            CIF
            <input name="supplier_tax_id" defaultValue={cif} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-stone-200">
            Fecha documento
            <input name="document_date" defaultValue={documentDate} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-stone-200">
            Número factura/albarán
            <input name="document_number" defaultValue={documentNumber} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-stone-200">
            Importe total
            <input name="total_amount" defaultValue={totalAmount} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-stone-200">
            Base imponible
            <input name="taxable_base" defaultValue={firstText(data, ["base_imponible", "taxable_base"])} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-stone-200">
            IVA
            <input name="vat_amount" defaultValue={firstText(data, ["iva", "vat_amount"])} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-stone-200">
            Temperatura recepción
            <input name="temperature" defaultValue={temperature} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-stone-200 md:col-span-2">
            Observaciones
            <textarea name="observations" defaultValue={observations} rows={4} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
          </label>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-[#0d0d0d] p-4">
          <h3 className="text-lg font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Productos, lotes y caducidades</h3>
          <div className="mt-4 grid gap-3">
            {products.length ? products.map((item, index) => (
                <div key={`${result.documentName}-${index}`} className="grid gap-3 rounded-[1.2rem] border border-white/10 bg-white/6 p-3 md:grid-cols-4">
                  {([
                    ["name", "nombre", item.nombre ?? item.producto],
                    ["quantity", "cantidad", item.cantidad],
                    ["batch", "lote", item.lote],
                    ["expiry", "caducidad", item.caducidad],
                    ["price", "precio compra", item.importe],
                    ["location", "ubicación", "Almacén"],
                  ] as Array<[string, string, unknown]>).map(([field, label, value]) => (
                    <label key={field} className="grid gap-2 text-xs font-black uppercase tracking-[0.12em] text-stone-300">
                      {label}
                      <input name={`product_${index}_${field}`} defaultValue={asText(value)} className="rounded-2xl border border-white/12 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
                    </label>
                  ))}
                  <input type="hidden" name={`product_${index}_accepted`} value="true" />
                </div>
            )) : (
              <p className="rounded-[1.2rem] border border-white/10 bg-white/6 px-4 py-3 text-sm font-semibold text-stone-300">
                No se han detectado productos en el documento. Completa la revisión manualmente antes de registrar.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <a href="/admin-kiosko/ia" className="rounded-full border border-white/20 px-5 py-3 text-center text-sm font-black uppercase tracking-[0.14em] text-white transition hover:border-white">Cancelar</a>
          <button
            type="submit"
            onClick={(event) => {
              if (!window.confirm("¿Confirmas que quieres registrar esta recepción APPCC?")) {
                event.preventDefault();
              }
            }}
            className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-stone-950"
          >
            Registrar recepción
          </button>
        </div>
      </form>
    </section>
  );
}

export function IaAssistantClient({ saved, errorMessage, suppliers }: { saved?: boolean; errorMessage?: string; suppliers: SupplierOption[] }) {
  const [activeKind, setActiveKind] = useState<OcrExtractorKind | null>(null);
  const [result, setResult] = useState<OcrUploadResult | null>(null);
  const [error, setError] = useState("");
  const [rawDiagnostic, setRawDiagnostic] = useState("");
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const isUploading = activeKind !== null;

  const uploadLabel = useMemo(() => activeKind ? cards.find((card) => card.kind === activeKind)?.title : "", [activeKind]);

  async function upload(kind: OcrExtractorKind, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setActiveKind(kind);
    setError("");
    setRawDiagnostic("");
    setProgress(5);
    setProgressMessage("Subiendo...");

    const formData = new FormData();
    formData.append("kind", kind);
    formData.append("file", file);

    try {
      const response = await fetch("/admin-kiosko/api/ocr", {
        method: "POST",
        body: formData,
      });

      if (!response.body) {
        throw new Error(`OCR request failed with HTTP ${response.status}`);
      }

      await readProgressStream(response.body, (event) => {
        if (event.type === "progress") {
          setProgress(event.progress);
          setProgressMessage(event.message);
          return;
        }

        if (event.type === "error") {
          setError(event.error);
          setRawDiagnostic(event.rawOpenAIText || "");
          return;
        }

        setProgress(100);
        setProgressMessage("Preparando revisión...");
        setRawDiagnostic(event.data.rawOpenAIText || "");
        setResult(event.data);
      });
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "OCR upload request failed";
      setError(message);
    } finally {
      setActiveKind(null);
      event.target.value = "";
    }
  }

  return (
    <>
      {saved ? (
        <section className="mb-8 rounded-[2rem] border border-emerald-300/30 bg-emerald-100 p-5 text-emerald-950 sm:p-6">
          <h2 className="text-xl font-black uppercase tracking-[-0.03em]">Recepción registrada correctamente.</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <a href="/admin-kiosko/recepcion-mercancia" className="rounded-full border border-emerald-950 px-5 py-3 text-sm font-black uppercase tracking-[0.14em]">Ver recepción</a>
            <a href="/admin-kiosko/registros" className="rounded-full border border-emerald-950 px-5 py-3 text-sm font-black uppercase tracking-[0.14em]">Ver registros</a>
            <a href="/admin-kiosko/ia" className="rounded-full border border-emerald-950 bg-emerald-950 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white">Escanear otro documento</a>
          </div>
        </section>
      ) : null}

      {errorMessage ? (
        <p className="mb-8 rounded-[1.3rem] border border-[#d94b2b]/40 bg-[#d94b2b]/12 px-4 py-3 text-sm font-semibold text-[#f2c6bb]">
          {errorMessage}
        </p>
      ) : null}

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
          <div className="mt-5 rounded-[1.3rem] border border-[#d94b2b]/40 bg-[#d94b2b]/12 px-4 py-3 text-sm font-semibold text-[#f2c6bb]">
            <p>{error}</p>
            {rawDiagnostic ? (
              <textarea
                readOnly
                value={rawDiagnostic}
                rows={8}
                className="mt-4 w-full rounded-2xl border border-white/12 bg-white px-4 py-3 font-mono text-xs text-stone-950 outline-none"
              />
            ) : null}
          </div>
        ) : null}

        {isUploading ? (
          <div className="mt-5 rounded-[1.3rem] border border-amber-300/30 bg-amber-100 px-4 py-3 text-amber-950">
            <div className="flex items-center justify-between gap-3 text-sm font-black uppercase tracking-[0.14em]">
              <span>{progressMessage || `Procesando: ${uploadLabel}`}</span>
              <span>{progress}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-amber-950/15">
              <div
                className="h-full rounded-full bg-[#d94b2b] transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
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
                  Subir archivo
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {result ? <EditableResult result={result} suppliers={suppliers} /> : null}
    </>
  );
}

async function readProgressStream(stream: ReadableStream<Uint8Array>, onEvent: (event: OcrProgressEvent) => void) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      onEvent(JSON.parse(line) as OcrProgressEvent);
    }
  }

  if (buffer.trim()) {
    onEvent(JSON.parse(buffer) as OcrProgressEvent);
  }
}
