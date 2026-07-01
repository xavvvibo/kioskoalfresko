import type { Metadata } from "next";
import Link from "next/link";
import { getAdminDashboardSummary, getExecutiveDashboardMetrics } from "@/lib/admin-kiosko/database";
import { requireOwnerRole } from "@/lib/admin-kiosko/roles";
import { AdminHeader } from "../_components/AdminHeader";

export const metadata: Metadata = {
  title: "Panel Owner APPCC | Panel interno",
  description: "Gestión completa del ERP APPCC interno.",
};

const areas = [
  ["Operativa diaria", "/admin-kiosko/operativa", "Registros, jornada, controles y acciones rápidas."],
  ["Compras y proveedores", "/admin-kiosko/compras", "OCR, recepciones, proveedores, inventario y documentos."],
  ["Producción y trazabilidad", "/admin-kiosko/produccion", "Recetas, lotes internos, mermas, etiquetas y FEFO."],
  ["Inspección y APPCC", "/admin-kiosko/inspeccion", "Vista sanitaria, documentación, registros e informes."],
  ["Contabilidad", "/admin-kiosko/contabilidad", "Facturas, albaranes, IVA, conciliación y compras."],
  ["Configuración", "/admin-kiosko/configuracion", "Impresoras, equipos, calendario operativo y parámetros."],
];

export default async function OwnerPage() {
  await requireOwnerRole();
  const [dashboard, metricsResult] = await Promise.all([
    getAdminDashboardSummary(),
    getExecutiveDashboardMetrics(),
  ]);
  const summary = dashboard.ok ? dashboard.data : null;
  const metrics = metricsResult.ok ? metricsResult.data : null;

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Panel Owner" description="Gestión completa del ERP APPCC interno." role="owner" />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12">
        <div className="grid gap-6">
          <section className="grid gap-3 md:grid-cols-4 xl:grid-cols-6">
            {[
              ["Estado APPCC", metrics?.healthStatus || "Correcto"],
              ["APPCC %", `${Math.max(0, 100 - ((metrics?.alerts.filter((alert) => alert.severity === "incidencia").length || 0) * 20))}%`],
              ["Alertas", metrics?.alerts.length || 0],
              ["Documentación pendiente", metrics?.pendingDocuments || 0],
              ["Stock bajo", metrics?.lowStockProducts || 0],
              ["Caducidades", metrics?.expiringProducts || 0],
              ["Producciones hoy", metrics?.productionToday || 0],
              ["Recepciones mes", metrics?.receptionsThisMonth || 0],
              ["Incidencias", summary?.openIncidents || 0],
              ["OCR revisar", metrics?.ocrToReview || 0],
              ["Equipos fuera rango", metrics?.outOfRangeEquipment || 0],
              ["Agua hoy", metrics?.waterToday || 0],
            ].map(([label, value]) => (
              <article key={label} className="rounded-[1.3rem] border border-white/10 bg-[#151515] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">{label}</p>
                <p className="mt-2 text-2xl font-black text-white">{value}</p>
              </article>
            ))}
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {areas.map(([title, href, text]) => (
              <Link key={href} href={href} className="rounded-[1.5rem] border border-white/10 bg-[#fffaf4] p-5 text-stone-950 transition hover:border-[#d94b2b]">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#d94b2b]">Área APPCC</p>
                <h2 className="mt-3 text-2xl font-black uppercase tracking-[-0.03em]">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-stone-700">{text}</p>
              </Link>
            ))}
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
            <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Alertas sanitarias</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {metrics?.alerts.slice(0, 10).map((alert) => (
                <Link key={alert.id} href={alert.href} className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4 text-sm text-stone-200">
                  <span className="block font-black text-white">{alert.title}</span>
                  <span className="mt-1 block">{alert.detail}</span>
                </Link>
              ))}
              {!metrics?.alerts.length ? <p className="text-sm text-stone-400">No hay alertas activas.</p> : null}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
