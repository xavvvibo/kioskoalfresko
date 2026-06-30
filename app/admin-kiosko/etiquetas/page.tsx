import type { Metadata } from "next";
import Image from "next/image";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getLabelRecords } from "@/lib/admin-kiosko/database";
import { AdminHeader } from "../_components/AdminHeader";
import { saveLabelRecordAction } from "../actions";
import { PrintButton } from "./PrintButton";

export const metadata: Metadata = {
  title: "Etiquetas APPCC | Panel interno",
  description: "Etiquetas APPCC listas para impresión térmica o A4.",
};

const models = ["Elaboración", "Apertura", "Congelación", "Descongelación", "Caducidad", "Lote"];

function labelFromParams(params: Record<string, string>) {
  return {
    model: params.model || "Elaboración",
    product: params.product || "",
    batch: params.batch || "",
    supplier: params.supplier || "",
    elaboration_date: params.elaboration_date || "",
    opening_date: params.opening_date || "",
    freezing_date: params.freezing_date || "",
    defrosting_date: params.defrosting_date || "",
    best_before_date: params.best_before_date || "",
    responsible: params.responsible || "F. Javier Bocanegra Sanjuan",
    print_format: params.print_format || "a4",
    copies: Number(params.copies || 8),
    qr_payload: params.qr_payload || JSON.stringify({ type: "appcc-label", product: params.product || "", batch: params.batch || "", supplier: params.supplier || "" }),
  };
}

function LabelCard({ label }: { label: ReturnType<typeof labelFromParams> }) {
  const qr = `/admin-kiosko/etiquetas/qr?p=${encodeURIComponent(label.qr_payload)}`;
  return (
    <article className="break-inside-avoid rounded-xl border-2 border-stone-950 bg-white p-4 text-stone-950">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-black uppercase tracking-[0.08em]">KIOSKO ALFRESKO</p>
          <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-[#d94b2b]">{label.model}</p>
        </div>
        <Image src={qr} alt="QR APPCC" width={80} height={80} className="h-20 w-20 border border-stone-950 bg-white" unoptimized />
      </div>
      <div className="mt-3 grid gap-1 text-sm">
        <p><strong>Producto:</strong> {label.product || "-"}</p>
        <p><strong>Lote:</strong> {label.batch || "-"}</p>
        <p><strong>Proveedor:</strong> {label.supplier || "-"}</p>
        <p><strong>Elaboración:</strong> {label.elaboration_date || "-"}</p>
        <p><strong>Apertura:</strong> {label.opening_date || "-"}</p>
        <p><strong>Congelación:</strong> {label.freezing_date || "-"}</p>
        <p><strong>Descongelación:</strong> {label.defrosting_date || "-"}</p>
        <p><strong>Consumir antes de:</strong> {label.best_before_date || "-"}</p>
        <p><strong>Responsable:</strong> {label.responsible || "-"}</p>
      </div>
    </article>
  );
}

export default async function EtiquetasPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string>>;
}) {
  await requireAdminSession();
  const params = await searchParams || {};
  const historyResult = await getLabelRecords(20);
  const history = historyResult.ok ? historyResult.data : [];
  const selected = history.find((record) => record.id === params.id);
  const current = selected
    ? {
        model: selected.model,
        product: selected.product || "",
        batch: selected.batch || "",
        supplier: selected.supplier || "",
        elaboration_date: selected.elaboration_date || "",
        opening_date: selected.opening_date || "",
        freezing_date: selected.freezing_date || "",
        defrosting_date: selected.defrosting_date || "",
        best_before_date: selected.best_before_date || "",
        responsible: selected.responsible || "F. Javier Bocanegra Sanjuan",
        print_format: selected.print_format || "a4",
        copies: selected.copies || 8,
        qr_payload: selected.qr_payload || "",
      }
    : labelFromParams(params);
  const copies = Math.max(1, Math.min(48, current.copies || 8));

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Etiquetas APPCC" description="Generador de etiquetas con historial e impresión A4 o térmica." />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12">
        <div className="grid gap-6 lg:grid-cols-[25rem_1fr]">
          <div className="grid gap-6 print:hidden">
            <form action={saveLabelRecordAction} className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
              <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Datos etiqueta</h2>
              <div className="mt-5 grid gap-4">
                <label className="grid gap-2 text-sm font-semibold text-stone-200">Modelo
                  <select name="model" defaultValue={current.model} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950">
                    {models.map((model) => <option key={model}>{model}</option>)}
                  </select>
                </label>
                {[
                  ["product", "Producto", current.product],
                  ["batch", "Lote", current.batch],
                  ["supplier", "Proveedor", current.supplier],
                  ["elaboration_date", "Fecha elaboración", current.elaboration_date],
                  ["opening_date", "Fecha apertura", current.opening_date],
                  ["freezing_date", "Fecha congelación", current.freezing_date],
                  ["defrosting_date", "Fecha descongelación", current.defrosting_date],
                  ["best_before_date", "Consumir antes de", current.best_before_date],
                  ["responsible", "Responsable", current.responsible],
                ].map(([name, label, value]) => (
                  <label key={name} className="grid gap-2 text-sm font-semibold text-stone-200">{label}
                    <input name={name} defaultValue={value} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950" />
                  </label>
                ))}
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-semibold text-stone-200">Formato
                    <select name="print_format" defaultValue={current.print_format} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950">
                      <option value="a4">A4</option>
                      <option value="termica">Térmica</option>
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-stone-200">Copias
                    <input name="copies" type="number" min="1" max="48" defaultValue={copies} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950" />
                  </label>
                </div>
                <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white">Guardar etiqueta</button>
              </div>
            </form>

            <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
              <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Historial</h2>
              <div className="mt-4 grid gap-3">
                {history.map((record) => (
                  <a key={record.id} href={`/admin-kiosko/etiquetas?id=${record.id}`} className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4 text-sm text-stone-200 transition hover:border-[#d94b2b]">
                    <span className="block font-black text-white">{record.model} · {record.product || "Producto no consignado"}</span>
                    <span className="mt-1 block text-xs text-stone-400">Lote {record.batch || "no consignado"} · {record.created_at.slice(0, 10)}</span>
                  </a>
                ))}
                {!history.length ? <p className="text-sm text-stone-400">Historial preparado para próximas etiquetas.</p> : null}
              </div>
            </section>
          </div>

          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6 print:border-0 print:bg-white print:p-0">
            <div className="flex items-center justify-between gap-4 print:hidden">
              <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Vista imprimible</h2>
              <PrintButton />
            </div>
            <div className={current.print_format === "termica" ? "mt-6 grid max-w-[26rem] gap-3 print:mt-0" : "mt-6 grid gap-4 md:grid-cols-2 print:mt-0 print:grid-cols-2"}>
              {Array.from({ length: copies }).map((_, index) => <LabelCard key={index} label={current} />)}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
