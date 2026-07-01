import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getExecutiveDashboardMetrics } from "@/lib/admin-kiosko/database";
import { AdminHeader } from "../_components/AdminHeader";

export const metadata: Metadata = {
  title: "Panel empleado APPCC | Panel interno",
  description: "Registros diarios, etiquetas, mermas y producción.",
};

const actions = [
  ["Registrar temperaturas", "/admin-kiosko/temperaturas", "Control de equipos de frío y caliente."],
  ["Registrar limpieza", "/admin-kiosko/limpieza", "Zonas, turno y responsable."],
  ["Registrar aceite", "/admin-kiosko/aceite-freidora", "Control diario de freidora."],
  ["Registrar recepción", "/admin-kiosko/recepcion-mercancia", "Entrada de mercancía y conformidad."],
  ["Escanear albarán/factura", "/admin-kiosko/ia", "OCR guiado para compras."],
  ["Producción interna", "/admin-kiosko/produccion", "Elaboraciones y lotes internos."],
  ["Congelar / descongelar", "/admin-kiosko/produccion#lotes", "Movimientos rápidos de lote."],
  ["Imprimir etiqueta", "/admin-kiosko/etiquetas", "Etiquetas Zebra desde lote."],
  ["Registrar merma", "/admin-kiosko/produccion#lotes", "Merma trazable sin borrar lote."],
  ["Registrar incidencia", "/admin-kiosko/incidencias", "Acción correctora y seguimiento."],
];

export default async function EmpleadoPage() {
  await requireAdminSession();
  const metricsResult = await getExecutiveDashboardMetrics();
  const metrics = metricsResult.ok ? metricsResult.data : null;

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Panel de trabajo diario" description="Acciones esenciales para registrar controles APPCC durante la jornada." role="employee" />
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12">
        <div className="grid gap-6">
          <section className="rounded-[2rem] border border-amber-300/30 bg-amber-100 p-5 text-amber-950">
            <h2 className="text-2xl font-black uppercase tracking-[-0.03em]">Pendientes de hoy</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {(metrics?.dailyPending.length ? metrics.dailyPending : []).map((alert) => (
                <Link key={alert.id} href={alert.href} className="rounded-[1.2rem] border border-amber-300 bg-white p-4 text-sm font-semibold text-amber-950">
                  <span className="block font-black">{alert.title}</span>
                  <span className="mt-1 block">{alert.detail}</span>
                </Link>
              ))}
              {!metrics?.dailyPending.length ? <p className="text-sm font-semibold">Controles principales sin alertas de registro.</p> : null}
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {actions.map(([title, href, text]) => (
              <Link key={href + title} href={href} className="min-h-40 rounded-[1.6rem] border border-white/10 bg-[#fffaf4] p-5 text-stone-950 transition hover:border-[#d94b2b]">
                <h2 className="text-2xl font-black uppercase tracking-[-0.03em]">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-stone-700">{text}</p>
              </Link>
            ))}
          </section>
        </div>
      </section>
    </main>
  );
}
