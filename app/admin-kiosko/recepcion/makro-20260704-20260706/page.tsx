import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import {
  buildMakroLabels,
  makroInvoices,
  makroOmittedItems,
  makroReceptionItems,
  type MakroLabel,
  type MakroReceptionItem,
} from "@/lib/admin-kiosko/domain/makro-reception-202607.service";
import { AdminHeader } from "../../_components/AdminHeader";
import { Label80x50Preview } from "../../_components/Label80x50Preview";
import {
  registerMakroChickenMarinade202607Action,
  registerMakroOpenings202607Action,
  registerMakroReception202607Action,
} from "../../actions";
import { MakroPrintButton } from "./MakroPrintButton";

export const metadata: Metadata = {
  title: "Recepcion Makro 03/07, 04/07 y 06/07 | Panel interno",
  description: "Recepcion APPCC Makro, regularizacion documental, aperturas, marinado y etiquetas GoDEX 80x50.",
};

function timeMadrid() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function Section({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[1.4rem] border border-white/10 bg-[#151515] p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ItemTable({ items }: { items: MakroReceptionItem[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[58rem] text-left text-sm">
        <thead className="bg-white/6 text-[10px] uppercase tracking-[0.12em] text-stone-400">
          <tr>
            <th className="px-4 py-3">Producto</th>
            <th className="px-4 py-3">Factura/ref</th>
            <th className="px-4 py-3">Cantidad</th>
            <th className="px-4 py-3">Lote proveedor</th>
            <th className="px-4 py-3">Conservacion</th>
            <th className="px-4 py-3">Nota</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {items.map((item) => (
            <tr key={item.key} className="align-top text-stone-200">
              <td className="px-4 py-4 font-black text-white">{item.productName}</td>
              <td className="px-4 py-4">{item.invoiceRef}</td>
              <td className="px-4 py-4">{item.displayQuantity}</td>
              <td className="px-4 py-4">{item.supplierLot || "no consta en factura"}</td>
              <td className="px-4 py-4">{item.conservation}</td>
              <td className="px-4 py-4">{item.notes || "Caducidad original: revisar envase"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LabelPreviewCard({
  label,
  operativeDate,
  operativeTime,
  responsible,
}: {
  label: MakroLabel;
  operativeDate: string;
  operativeTime: string;
  responsible: string;
}) {
  const kind = label.kind === "opening" ? "ABIERTO" : label.kind === "marinated" ? "MARINADO/CRUDO" : "RECEPCION";
  const previewResponsible = label.responsible.toUpperCase().includes("JAVIER") ? "FJB" : label.responsible;
  const previewStorage = label.conservation.toUpperCase().includes("REFRIG") ? "REFRIG. 0-4C" : label.conservation;
  return (
    <article className="grid gap-3 rounded-[1rem] border border-white/10 bg-white/6 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-white">{label.title}</p>
          <p className="mt-1 text-xs text-stone-400">{label.productName}</p>
        </div>
        <span className="rounded-full border border-white/15 px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-stone-200">
          GoDEX 80x50
        </span>
      </div>
      <Label80x50Preview
        title={label.productName}
        kind={kind}
        batch={label.internalLot}
        productionDate={`Recep. factura: ${label.receivedDate}`}
        expiryDate={label.kind === "reception" ? label.originalExpiry : label.useBy}
        quantity={label.quantityText}
        responsible={previewResponsible}
        storage={previewStorage}
        trace={label.traceValue}
        observations={label.warning}
      />
      <div className="grid gap-1 rounded-xl border border-white/10 bg-black/20 p-3 text-xs leading-5 text-stone-300">
        <p><span className="font-black text-white">Estado:</span> {label.state}</p>
        <p><span className="font-black text-white">Proveedor:</span> {label.supplierName} · {label.invoiceRef}</p>
        <p><span className="font-black text-white">Lote interno:</span> {label.internalLot}</p>
        <p><span className="font-black text-white">Caducidad original:</span> {label.originalExpiry}</p>
        {label.supplierLot ? <p><span className="font-black text-white">Lote proveedor:</span> {label.supplierLot}</p> : null}
        {label.openedAt ? <p><span className="font-black text-white">{label.kind === "marinated" ? "Marinado:" : "Apertura:"}</span> {label.openedAt}</p> : null}
        {label.useBy ? <p><span className="font-black text-white">Limite interno:</span> {label.useBy}</p> : null}
        <p><span className="font-black text-white">Aviso:</span> {label.warning}</p>
        <p><span className="font-black text-white">Nota:</span> {label.note}</p>
      </div>
      <MakroPrintButton
        labelKeys={[label.key]}
        label="Imprimir esta etiqueta"
        operativeDate={operativeDate}
        operativeTime={operativeTime}
        responsible={responsible}
        variant="secondary"
      />
    </article>
  );
}

export default async function MakroReceptionPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  await requireAdminSession();
  const params = await searchParams || {};
  const operativeDate = params.operative_date || "2026-07-08";
  const operativeTime = params.operative_time || timeMadrid();
  const responsible = params.responsible || "F. Javier Bocanegra Sanjuan";
  const labels = buildMakroLabels({ operativeDate, operativeTime, responsible });
  const receptionLabels = labels.filter((label) => label.kind === "reception");
  const openingLabels = labels.filter((label) => label.kind === "opening");
  const marinatedLabels = labels.filter((label) => label.kind === "marinated");
  const appccItems = makroReceptionItems.filter((item) => item.kind === "appcc");
  const openedItems = makroReceptionItems.filter((item) => item.openedToday);
  const transformedItems = makroReceptionItems.filter((item) => item.transformToday);
  const stockItems = makroReceptionItems.filter((item) => item.kind === "stock" || ["patatas-aro", "tortilla-chips"].includes(item.key));

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader
        title="Recepcion Makro 03/07, 04/07 y 06/07"
        description="Recepcion interna, regularizacion documental, aperturas, marinado y etiquetas APPCC GoDEX 80x50 sin impresion automatica."
      />
      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-8 sm:px-6 md:py-12">
        {params.error ? (
          <p className="rounded-xl border border-[#d94b2b]/40 bg-[#3b1510] px-4 py-3 text-sm font-semibold text-[#ffd6cc]">{params.error}</p>
        ) : null}
        {params.reception || params.openings || params.marinade ? (
          <p className="rounded-xl border border-emerald-300/30 bg-emerald-100/10 px-4 py-3 text-sm font-semibold text-emerald-100">
            Registro actualizado. Los botones son idempotentes y no duplican lotes/aperturas/transformacion si ya existen.
          </p>
        ) : null}

        <section className="rounded-[1.4rem] border border-white/10 bg-[#151515] p-5">
          <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">Facturas origen</p>
              <h1 className="mt-1 text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Makro Granada</h1>
              <div className="mt-3 grid gap-2 text-sm text-stone-300">
                {makroInvoices.map((invoice) => (
                  <p key={invoice.ref}>
                    <span className="font-black text-white">{invoice.ref}</span> · factura {invoice.invoiceNumber} · entrega {invoice.deliveredAt}
                  </p>
                ))}
              </div>
            </div>
            <div className="grid gap-3 rounded-xl border border-white/10 bg-white/6 p-4">
              <form action={registerMakroReception202607Action}>
                <button className="w-full rounded-xl border border-[#d94b2b] bg-[#d94b2b] px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-[#b83d22]">
                  Registrar recepcion
                </button>
              </form>
              <form action={registerMakroOpenings202607Action} className="grid gap-2">
                <input type="date" name="operative_date" defaultValue={operativeDate} className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" />
                <input type="time" name="operative_time" defaultValue={operativeTime} className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" />
                <input name="responsible" defaultValue={responsible} className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" />
                <button className="rounded-xl border border-white/20 bg-white/6 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-white/10">
                  Registrar aperturas
                </button>
              </form>
              <form action={registerMakroChickenMarinade202607Action} className="grid gap-2">
                <input type="hidden" name="operative_date" value={operativeDate} />
                <input type="hidden" name="operative_time" value={operativeTime} />
                <input type="hidden" name="responsible" value={responsible} />
                <label className="grid gap-1 text-xs font-semibold text-stone-300">
                  Cantidad pollo marinado kg
                  <input name="quantity" defaultValue="1,846" className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" />
                </label>
                <button className="rounded-xl border border-white/20 bg-white/6 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-white/10">
                  Registrar transformacion pollo
                </button>
              </form>
            </div>
          </div>
        </section>

        <Section eyebrow="APPCC completo" title="Productos a recepcionar APPCC">
          <ItemTable items={appccItems} />
        </Section>

        <Section eyebrow="Aperturas" title="Productos abiertos hoy">
          <ItemTable items={openedItems} />
        </Section>

        <Section eyebrow="Transformados hoy" title="Pollo contramuslo a marinado">
          <ItemTable items={transformedItems} />
        </Section>

        <Section eyebrow="Stock y control basico" title="Productos solo stock">
          <ItemTable items={stockItems} />
        </Section>

        <Section eyebrow="Omitidos" title="Productos no recepcionados">
          <ul className="grid gap-2 text-sm text-stone-300">
            {makroOmittedItems.map((item) => <li key={item} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">{item}</li>)}
          </ul>
        </Section>

        <section className="rounded-[1.4rem] border border-white/10 bg-[#151515] p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">Preview e impresion manual</p>
              <h2 className="mt-1 text-xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Etiquetas preparadas</h2>
              <p className="mt-2 text-sm leading-6 text-stone-300">
                La pantalla no imprime al cargar. Cada boton pide confirmacion y crea trabajos nuevos en la cola GoDEX 80x50.
              </p>
            </div>
            <div className="grid gap-2">
              <MakroPrintButton
                labelKeys={receptionLabels.map((label) => label.key)}
                label={`Imprimir recepcion APPCC (${receptionLabels.length})`}
                operativeDate={operativeDate}
                operativeTime={operativeTime}
                responsible={responsible}
              />
              <MakroPrintButton
                labelKeys={openingLabels.map((label) => label.key)}
                label={`Imprimir aperturas (${openingLabels.length})`}
                operativeDate={operativeDate}
                operativeTime={operativeTime}
                responsible={responsible}
                variant="secondary"
              />
              <MakroPrintButton
                labelKeys={marinatedLabels.map((label) => label.key)}
                label="Imprimir pollo marinado"
                operativeDate={operativeDate}
                operativeTime={operativeTime}
                responsible={responsible}
                variant="secondary"
              />
            </div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {labels.map((label) => (
              <LabelPreviewCard
                key={label.key}
                label={label}
                operativeDate={operativeDate}
                operativeTime={operativeTime}
                responsible={responsible}
              />
            ))}
          </div>
        </section>

        <section className="rounded-[1.4rem] border border-white/10 bg-[#151515] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">Validaciones APPCC</p>
          <div className="mt-4 grid gap-2 text-sm leading-6 text-stone-300 md:grid-cols-2">
            <p>No se insertan omitidos: Yopro, jamon reserva y pavo quedan solo visibles.</p>
            <p>Caducidad original no inventada: se imprime &quot;revisar envase&quot; si no consta.</p>
            <p>Lote proveedor obligatorio para picadillo chorizo, picadillo morcilla y pollo.</p>
            <p>Aperturas del mismo lote en la misma fecha no se duplican; reimpresion crea evento de etiqueta.</p>
            <p>Marinado de pollo 26002392 en la misma fecha y cantidad no se duplica.</p>
            <p>Corn Flakes y Panko incluyen advertencia de no reutilizar sobrante que haya tocado pollo crudo.</p>
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link href="/admin-kiosko/impresiones?sourceType=makro_reception_202607" className="rounded-full border border-white/20 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Ver cola impresion</Link>
          <Link href="/admin-kiosko/inventario" className="rounded-full border border-white/20 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Abrir inventario</Link>
        </div>
      </section>
    </main>
  );
}
