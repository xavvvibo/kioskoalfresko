import type { Metadata } from "next";
import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { AdminHeader } from "../_components/AdminHeader";
import { Label80x50Preview } from "../_components/Label80x50Preview";
import { LocalBridgeStatus } from "../_components/LocalBridgeStatus";
import { PrepLabelForm } from "./PrepLabelForm";

export const metadata: Metadata = {
  title: "Etiquetas preparacion | Panel interno",
  description: "Impresion urgente de etiquetas de subelaboraciones con elaboracion y caducidad.",
};

function madridDateTimeInput(addDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + addDays);

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const hour = values.hour === "24" ? "00" : values.hour;

  return `${values.year}-${values.month}-${values.day}T${hour}:${values.minute}`;
}

export default async function PrepLabelsPage() {
  await requireAdminPermission("labels:basic_print");

  return (
    <main className="min-h-screen bg-stone-50">
      <AdminHeader
        title="Etiquetas preparacion"
        description="Impresion urgente de subelaboraciones con fecha y hora de elaboracion y caducidad."
      />
      <section className="mx-auto grid w-full max-w-3xl gap-5 px-4 py-6">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#d94b2b]">Inspeccion</p>
          <h1 className="mt-1 text-2xl font-black text-stone-950">Etiquetas de preparacion</h1>
          <p className="mt-2 text-sm text-stone-600">
            Impresion directa a GoDEX G500 para subelaboraciones. La etiqueta imprime nombre, elaboracion y caducidad.
          </p>
        </div>

        <LocalBridgeStatus />

        <PrepLabelForm
          defaultProductionDateTime={madridDateTimeInput()}
          defaultExpiryDateTime={madridDateTimeInput(2)}
        />

        <div className="rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-700">
          <p className="font-semibold text-stone-950">Formato impreso</p>
          <div className="mt-3">
            <Label80x50Preview
              title="GUACAMOLE"
              kind="PREPARACION"
              batch="GM-050726-0017"
              productionDate="05/07/26 12:30"
              expiryDate="07/07/26 12:30"
              responsible="J. Bocanegra"
              storage="Refrigerado 0-4 C"
              trace="ERP:prep_batch:GM-050726-0017"
              observations="Refrigerado 0-4 C"
            />
          </div>
          <pre className="mt-4 overflow-x-auto rounded-lg bg-stone-950 p-3 text-xs text-white">
{`KIOSKO ALFRESKO                         PREPARACION

GUACAMOLE
────────────────────────────────
ELAB: 05/07/26 12:30          [QR interno]
CAD: 07/07/26 12:30           ERP:prep_batch:GM-050726-0017
RESPONSABLE: J. Bocanegra
CONSERVACION: Refrigerado 0-4 C
────────────────────────────────
LOTE INTERNO  GM-050726-0017`}
          </pre>
          <p className="mt-2 text-xs text-stone-500">El lote se autogenera desde el nombre y el QR interno queda activo por defecto si hay lote.</p>
        </div>
      </section>
    </main>
  );
}
