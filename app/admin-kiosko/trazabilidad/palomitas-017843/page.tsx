import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import {
  buildPalomitasLabelData,
  PALOMITAS_TRACEABILITY,
  palomitasTraceabilityService,
  type PalomitasLabelData,
  type PalomitasLotRow,
} from "@/lib/admin-kiosko/domain/palomitas-traceability.service";
import { Label80x50Preview } from "../../_components/Label80x50Preview";
import { AdminHeader } from "../../_components/AdminHeader";
import { registerPalomitasTraceabilitySplitAction } from "../../actions";
import { PalomitasPrintButton } from "./PalomitasPrintButton";

export const metadata: Metadata = {
  title: "Trazabilidad Carnicería Palomitas #017843 | Panel interno",
  description: "Split APPCC de lote congelado/descongelando y etiquetas GoDEX 80x50.",
};

function madridDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function displayLot(lot: PalomitasLotRow) {
  return [
    lot.product_name || "Producto sin nombre",
    `lote ${lot.batch_number || "sin lote"}`,
    `${lot.current_quantity ?? 0} ${lot.unit || "ud"}`,
    lot.supplier_name || "proveedor no consignado",
  ].join(" · ");
}

function labelRows(label: PalomitasLabelData) {
  return [
    ["Producto", label.productName || "PENDIENTE"],
    ["Cantidad", label.quantityText],
    ["Proveedor", label.supplierName],
    ["Ticket/ref", label.ticketRef],
    ["Compra", label.purchaseDate],
    ["Congelación", label.freezingDate],
    ["Cad. orig. fresco", label.originalFreshExpiryDate],
    ["Salida descongelar", label.defrostedAt || "-"],
    ["Límite uso", label.useBy || "-"],
    ["Conservación", label.storage],
    ["Aviso", label.warning],
    ["Responsable", label.responsible],
    ["Lote interno", label.batchCode || "PENDIENTE"],
    ["Traza", label.traceValue],
  ];
}

function AppccLabelCard({ label, ready, parentLotId }: { label: PalomitasLabelData; ready: boolean; parentLotId: string }) {
  return (
    <article className="grid gap-4 rounded-[1.2rem] border border-white/10 bg-white/6 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">{label.title}</p>
          <h2 className="mt-1 text-xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">{label.state}</h2>
        </div>
        <span className="rounded-full border border-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-stone-200">GoDEX 80x50</span>
      </div>
      <Label80x50Preview
        title={label.productName || "Producto pendiente"}
        kind={label.state}
        batch={label.batchCode}
        productionDate={label.defrostedAt || label.freezingDate}
        expiryDate={label.useBy || label.originalFreshExpiryDate}
        quantity={label.quantityText}
        responsible={label.responsible}
        storage={label.storage}
        trace={label.traceValue}
        observations={label.warning}
      />
      <div className="grid gap-1 text-xs text-stone-300">
        {labelRows(label).map(([name, value]) => (
          <p key={name} className="grid gap-1 sm:grid-cols-[9rem_1fr]">
            <span className="font-black uppercase tracking-[0.08em] text-stone-500">{name}</span>
            <span className="break-words font-semibold text-stone-100">{value}</span>
          </p>
        ))}
      </div>
      <PalomitasPrintButton
        parentLotId={parentLotId}
        variant={label.variant}
        responsible={label.responsible}
        disabled={!ready || !label.productName || !label.batchCode}
      />
      {!ready ? (
        <p className="rounded-xl border border-amber-200/30 bg-amber-100/10 px-3 py-2 text-xs font-semibold text-amber-100">
          Registra primero el split para imprimir con trazabilidad completa de lote padre, lote descongelando y movimientos.
        </p>
      ) : null}
    </article>
  );
}

export default async function PalomitasTraceabilityPage({
  searchParams,
}: {
  searchParams?: Promise<{ lot?: string; error?: string; split?: string }>;
}) {
  await requireAdminPermission("traceability:manage");
  const params = await searchParams || {};
  const today = madridDate();
  const responsible = "F. Javier Bocanegra Sanjuan";
  const candidatesResult = await palomitasTraceabilityService.findCandidateLots();
  const candidates = candidatesResult.ok ? candidatesResult.data : [];
  const selectedLotId = params.lot || candidates[0]?.id || "";
  const splitStateResult = selectedLotId ? await palomitasTraceabilityService.getSplitState(selectedLotId) : { ok: true as const, data: null };
  const splitState = splitStateResult.ok ? splitStateResult.data : null;
  const selectedLot = splitState?.parentLot || candidates.find((lot) => lot.id === selectedLotId) || null;
  const thawedLot = splitState?.thawedLot || null;
  const splitReady = Boolean(selectedLot && thawedLot);
  const defrostingLabel = selectedLot
    ? buildPalomitasLabelData({ variant: "defrosting", parentLot: selectedLot, thawedLot, responsible, registerDate: today })
    : null;
  const frozenLabel = selectedLot
    ? buildPalomitasLabelData({ variant: "frozen", parentLot: selectedLot, thawedLot, responsible, registerDate: today })
    : null;

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader
        title="Trazabilidad Palomitas #017843"
        description="Split APPCC de producto de carniceria congelado y etiquetas GoDEX 80x50 sin impresion automatica."
      />
      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-8 sm:px-6 md:py-12">
        <section className="rounded-[1.4rem] border border-white/10 bg-[#151515] p-5">
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">Caso operativo</p>
              <h1 className="mt-1 text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Carnicería Palomitas · ticket #017843</h1>
              <div className="mt-3 grid gap-1 text-sm text-stone-300 sm:grid-cols-2">
                <p>Proveedor: {PALOMITAS_TRACEABILITY.supplierName}</p>
                <p>NIF/CIF: {PALOMITAS_TRACEABILITY.supplierTaxId}</p>
                <p>Puesto: {PALOMITAS_TRACEABILITY.stall}</p>
                <p>Compra: 17/06/2026 · {PALOMITAS_TRACEABILITY.ticketTime}</p>
                <p>Total ticket: {PALOMITAS_TRACEABILITY.ticketTotal}</p>
                <p>Caducidad original fresco: 30/06/2026</p>
              </div>
            </div>
            <div className="rounded-xl border border-amber-200/30 bg-amber-100/10 p-4 text-sm text-amber-100">
              <p className="font-black uppercase tracking-[0.08em]">Regla APPCC aplicada</p>
              <p className="mt-2 leading-6">
                La parte descongelando queda refrigerada 0-4 C, con aviso NO RECONGELAR y límite operativo conservador de 24 horas desde las 00:00 del día de registro.
              </p>
            </div>
          </div>
        </section>

        {params.error ? (
          <p className="rounded-xl border border-[#d94b2b]/40 bg-[#3b1510] px-4 py-3 text-sm font-semibold text-[#ffd6cc]">{params.error}</p>
        ) : null}
        {params.split === "ok" ? (
          <p className="rounded-xl border border-emerald-400/30 bg-emerald-950/30 px-4 py-3 text-sm font-semibold text-emerald-50">
            Split registrado. Ya puedes revisar preview e imprimir etiqueta A y B.
          </p>
        ) : null}
        {!candidatesResult.ok ? (
          <p className="rounded-xl border border-amber-200/30 bg-amber-100/10 px-4 py-3 text-sm font-semibold text-amber-100">
            No se pudo consultar Supabase: {candidatesResult.error}
          </p>
        ) : null}

        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.3fr]">
          <div className="grid content-start gap-5">
            <form className="rounded-[1.4rem] border border-white/10 bg-[#151515] p-5">
              <h2 className="text-xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Lote origen</h2>
              <label className="mt-4 grid gap-2 text-xs font-black uppercase tracking-[0.12em] text-stone-300">
                Candidato localizado
                <select name="lot" defaultValue={selectedLotId} className="rounded-xl border border-white/12 bg-white px-3 py-2 text-sm normal-case tracking-normal text-stone-950">
                  <option value="">Selecciona un lote existente</option>
                  {candidates.map((lot) => (
                    <option key={lot.id} value={lot.id}>{displayLot(lot)}</option>
                  ))}
                </select>
              </label>
              <button className="mt-3 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-white">Cargar lote</button>
              {!candidates.length ? (
                <p className="mt-4 rounded-xl border border-amber-200/30 bg-amber-100/10 px-3 py-2 text-xs font-semibold text-amber-100">
                  No hay coincidencias runtime. Registra o revisa primero el lote real; no se crea producto ficticio.
                </p>
              ) : null}
            </form>

            <form action={registerPalomitasTraceabilitySplitAction} className="rounded-[1.4rem] border border-white/10 bg-[#151515] p-5">
              <h2 className="text-xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Registrar split</h2>
              <input type="hidden" name="parent_lot_id" value={selectedLotId} />
              <label className="mt-4 grid gap-2 text-xs font-black uppercase tracking-[0.12em] text-stone-300">
                Fecha registro
                <input name="register_date" type="date" defaultValue={today} className="rounded-xl border border-white/12 bg-white px-3 py-2 text-sm normal-case tracking-normal text-stone-950" />
              </label>
              <label className="mt-3 grid gap-2 text-xs font-black uppercase tracking-[0.12em] text-stone-300">
                Responsable
                <input name="responsible" defaultValue={responsible} className="rounded-xl border border-white/12 bg-white px-3 py-2 text-sm normal-case tracking-normal text-stone-950" />
              </label>
              <div className="mt-4 rounded-xl border border-white/10 bg-white/6 p-3 text-xs leading-5 text-stone-300">
                <p>1,000 kg pasan a DESCONGELANDO / EN USO a las 00:00.</p>
                <p>1,800 kg permanecen CONGELADO / RESERVA.</p>
                <p>La validación exige stock actual total 2,800 kg.</p>
              </div>
              <button disabled={!selectedLot || splitReady} className="mt-4 w-full rounded-xl border border-[#d94b2b] bg-[#d94b2b] px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-white disabled:cursor-not-allowed disabled:opacity-50">
                {splitReady ? "Split ya registrado" : "Registrar división APPCC"}
              </button>
            </form>

            {selectedLot ? (
              <section className="rounded-[1.4rem] border border-white/10 bg-[#151515] p-5 text-sm text-stone-300">
                <h2 className="text-xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Estado lote</h2>
                <div className="mt-3 grid gap-1">
                  <p>Producto: {selectedLot.product_name || "falta nombre"}</p>
                  <p>Lote: {selectedLot.batch_number || "falta lote"}</p>
                  <p>Stock actual lote origen: {selectedLot.current_quantity ?? 0} {selectedLot.unit || "ud"}</p>
                  <p>Ubicación: {selectedLot.location || "-"}</p>
                  <p>Caducidad registrada: {selectedLot.expiry_date || "-"}</p>
                  <p>Lote descongelando: {thawedLot ? `${thawedLot.batch_number} · ${thawedLot.current_quantity} ${thawedLot.unit}` : "pendiente"}</p>
                </div>
              </section>
            ) : null}
          </div>

          <div className="grid gap-5">
            {defrostingLabel && frozenLabel ? (
              <>
                <AppccLabelCard label={defrostingLabel} ready={splitReady} parentLotId={selectedLotId} />
                <AppccLabelCard label={frozenLabel} ready={splitReady} parentLotId={selectedLotId} />
              </>
            ) : (
              <section className="rounded-[1.4rem] border border-white/10 bg-[#151515] p-5">
                <h2 className="text-xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Preview pendiente</h2>
                <p className="mt-2 text-sm text-stone-300">Selecciona un lote real para preparar las dos etiquetas.</p>
              </section>
            )}
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link href="/admin-kiosko/trazabilidad" className="rounded-full border border-white/20 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Abrir trazabilidad</Link>
          <Link href="/admin-kiosko/impresiones?sourceType=palomitas_traceability_split" className="rounded-full border border-white/20 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Ver cola impresión</Link>
        </div>
      </section>
    </main>
  );
}
