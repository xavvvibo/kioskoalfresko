import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getAppccRecords, getOpenEquipmentAlerts, getRecentIncidentRecords, getRecentMaintenanceRecords } from "@/lib/admin-kiosko/database";
import { adminDocuments } from "@/lib/admin-kiosko/documents";
import { temperatureEquipment } from "@/lib/admin-kiosko/temperature-rules";
import { AdminHeader } from "../../_components/AdminHeader";
import { RecentRecords } from "../../_components/RecentRecords";

export const metadata: Metadata = {
  title: "Expediente de equipo | Panel interno",
  description: "Expediente sanitario y técnico de equipo APPCC.",
};

function slugify(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function equipmentType(kind: string, active: boolean) {
  if (!active) return "fuera de servicio";
  return kind === "freezer" ? "congelación/hielo" : "frío positivo";
}

function target(kind: string, active: boolean) {
  if (!active) return "No requiere registro activo";
  return kind === "freezer" ? "-25 ºC a -18 ºC" : "0 ºC a 5 ºC";
}

export default async function EquipmentDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdminSession();
  const { slug } = await params;
  const equipment = temperatureEquipment.find((item) => slugify(item.name) === slug);

  if (!equipment) {
    notFound();
  }

  const [temperatureRecords, alerts, maintenance, incidents] = await Promise.all([
    getAppccRecords({ type: "temperaturas", equipment: equipment.name, includeArchivedEquipment: true }),
    getOpenEquipmentAlerts(),
    getRecentMaintenanceRecords(),
    getRecentIncidentRecords(),
  ]);

  const equipmentTemperatures = temperatureRecords.ok ? temperatureRecords.data.slice(0, 12) : [];
  const equipmentAlerts = alerts.ok ? alerts.data.filter((alert) => alert.equipment === equipment.name) : [];
  const technicalDocuments = adminDocuments.filter((document) => ["plan-mantenimiento", "registros-appcc", "temperaturas"].includes(document.slug));

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title={equipment.name} description="Expediente sanitario y técnico de equipo APPCC." />
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12">
        <div className="grid gap-6">
          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#f2c6bb]">Ficha técnica</p>
                <h2 className="mt-2 text-3xl font-black uppercase tracking-[-0.04em] text-[#fff8ef]">{equipment.name}</h2>
                <p className="mt-3 text-sm leading-6 text-stone-300">Ficha técnica disponible para completar marca, modelo, serie y mantenimiento.</p>
              </div>
              <Link href="/admin-kiosko/equipos" className="inline-flex rounded-full border border-white/12 bg-white/6 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">
                Volver a equipos
              </Link>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Ubicación", equipment.zone],
                ["Tipo", equipmentType(equipment.kind, equipment.active)],
                ["Estado", equipment.active ? "activo" : "fuera de servicio"],
                ["Temperatura objetivo", target(equipment.kind, equipment.active)],
              ].map(([label, value]) => (
                <article key={label} className="rounded-[1.3rem] border border-white/10 bg-white/6 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">{label}</p>
                  <p className="mt-2 text-base font-black text-white">{value}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
              <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Histórico de temperaturas</h2>
              <div className="mt-4 grid gap-3">
                {equipmentTemperatures.length ? equipmentTemperatures.map((record) => (
                  <div key={record.id} className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4">
                    <p className="font-black text-white">{record.main} · {record.status || "Registro disponible"}</p>
                    <p className="mt-1 text-sm text-stone-300">{record.record_date}{record.record_time ? ` · ${record.record_time.slice(0, 5)}` : ""} · {record.responsible || "Responsable no consignado"}</p>
                  </div>
                )) : <p className="text-sm text-stone-300">Último registro no disponible todavía.</p>}
              </div>
            </article>

            <article className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
              <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Histórico de alertas</h2>
              <div className="mt-4 grid gap-3">
                {equipmentAlerts.length ? equipmentAlerts.map((alert) => (
                  <div key={alert.id} className="rounded-[1.2rem] border border-[#d94b2b]/30 bg-[#d94b2b]/10 p-4">
                    <p className="font-black text-[#fff8ef]">{alert.alert_level} · {alert.status}</p>
                    <p className="mt-1 text-sm text-stone-300">{alert.alert_date}{alert.alert_time ? ` · ${alert.alert_time.slice(0, 5)}` : ""} · {alert.temperature ?? "sin lectura"} ºC</p>
                    {alert.corrective_action ? <p className="mt-2 text-sm text-stone-300">{alert.corrective_action}</p> : null}
                  </div>
                )) : <p className="text-sm text-stone-300">No hay alertas técnicas pendientes para este equipo.</p>}
              </div>
            </article>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <RecentRecords records={maintenance.ok ? maintenance.data.filter((record) => record.main.toLowerCase().includes(equipment.name.toLowerCase())) : []} title="Histórico de mantenimiento" />
            <RecentRecords records={incidents.ok ? incidents.data.filter((record) => record.main.toLowerCase().includes(equipment.name.toLowerCase())) : []} title="Incidencias asociadas" />
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
            <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Documentación asociada</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {technicalDocuments.map((document) => (
                <Link key={document.slug} href={document.href} className="rounded-[1.2rem] border border-white/10 bg-[#fffaf4] p-4 text-stone-950">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#d94b2b]">{document.status}</p>
                  <p className="mt-2 font-black">{document.title}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
            <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Observaciones</h2>
            <p className="mt-3 text-sm leading-6 text-stone-300">
              Expediente preparado para completar marca, modelo, número de serie, mantenimiento preventivo, averías y documentación técnica asociada.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
