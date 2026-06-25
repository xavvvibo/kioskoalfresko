import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getAdminDashboardSummary, getRecentEquipmentAssets } from "@/lib/admin-kiosko/database";
import { temperatureEquipment } from "@/lib/admin-kiosko/temperature-rules";
import { saveEquipmentAssetAction } from "../actions";
import { AdminHeader } from "../_components/AdminHeader";
import { RecentRecords } from "../_components/RecentRecords";
import { SelectField, SubmitButton, TextAreaField, TextField } from "../_components/InternalForms";

export const metadata: Metadata = { title: "Equipos | Panel interno", description: "Expediente sanitario y técnico de equipos." };

function slugify(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function equipmentType(name: string, active: boolean, kind: string) {
  if (!active) return "fuera de servicio";
  return kind === "freezer" ? "congelación/hielo" : "frío positivo";
}

function target(kind: string, active: boolean) {
  if (!active) return "No requiere registro activo";
  return kind === "freezer" ? "-25 ºC a -18 ºC" : "0 ºC a 5 ºC";
}

export default async function EquiposPage({ searchParams }: { searchParams?: Promise<{ saved?: string; error?: string }> }) {
  await requireAdminSession();
  const params = await searchParams;
  const [records, dashboard] = await Promise.all([getRecentEquipmentAssets(), getAdminDashboardSummary()]);
  const latest = dashboard.ok ? dashboard.data.latestByEquipment : [];

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Equipos APPCC" description="Expediente sanitario y técnico de equipos de KIOSKO ALFRESKO." />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12">
        <div className="grid gap-6">
          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
            <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Fichas de equipos</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {temperatureEquipment.map((equipment) => {
                const last = latest.find((record) => record.equipment === equipment.name);
                return (
                  <article key={equipment.name} className="rounded-[1.5rem] border border-white/10 bg-[#fffaf4] p-5 text-stone-950">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#d94b2b]">{equipment.zone}</p>
                    <h3 className="mt-3 text-2xl font-black uppercase tracking-[-0.03em]">{equipment.name}</h3>
                    <div className="mt-4 grid gap-2 text-sm text-stone-700">
                      <p>Ubicación: {equipment.zone}</p>
                      <p>Tipo: {equipmentType(equipment.name, equipment.active, equipment.kind)}</p>
                      <p>Estado: {equipment.active ? "activo" : "fuera de servicio"}</p>
                      <p>Temperatura objetivo: {target(equipment.kind, equipment.active)}</p>
                      <p>Última temperatura: {last?.temperature !== null && last ? `${last.temperature} ºC · ${last.record_date}${last.record_time ? ` ${last.record_time.slice(0, 5)}` : ""}` : "Sin registro todavía"}</p>
                      <p>Última revisión: {last?.record_date || "Pendiente"}</p>
                      <p>Último mantenimiento: Pendiente de registrar</p>
                      <p>Próximo mantenimiento: Pendiente de planificar</p>
                      <p>Incidencias abiertas: 0</p>
                    </div>
                    <Link href={`/admin-kiosko/equipos/${slugify(equipment.name)}`} className="mt-5 inline-flex rounded-full border border-stone-950 bg-stone-950 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Ver expediente</Link>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
            <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Completar ficha técnica</h2>
            <form action={saveEquipmentAssetAction} className="mt-5 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField name="name" label="Nombre" required />
                <TextField name="brand" label="Marca" />
                <TextField name="model" label="Modelo" />
                <TextField name="serial_number" label="Nº serie" />
                <TextField name="purchase_date" label="Fecha compra" type="date" />
                <TextField name="installation_date" label="Fecha instalación" type="date" />
                <TextField name="location" label="Ubicación" />
                <TextField name="last_maintenance" label="Último mantenimiento" type="date" />
                <TextField name="next_maintenance" label="Próximo mantenimiento" type="date" />
                <SelectField name="status" label="Estado" options={["operativo", "en_revision", "inoperativo"]} />
              </div>
              <TextAreaField name="fault_history" label="Historial averías" />
              <SubmitButton />
            </form>
            <RecentRecords records={records.ok ? records.data : []} title="Fichas técnicas guardadas" />
            {params?.error ? <p className="mt-4 text-sm text-[#f2c6bb]">{params.error}</p> : null}
          </section>
        </div>
      </section>
    </main>
  );
}
