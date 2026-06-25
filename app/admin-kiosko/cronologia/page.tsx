import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import {
  getAppccRecords,
  getRecentAiProcessingLogs,
  getRecentAiSupplierDocuments,
  getRecentInspectionRecords,
  getRecentMaintenanceRecords,
  getRecentWaterRecords,
  type RecentAdminRecord,
} from "@/lib/admin-kiosko/database";
import { AdminHeader } from "../_components/AdminHeader";

export const metadata: Metadata = {
  title: "Cronología APPCC | Panel interno",
  description: "Vista cronológica de actividad sanitaria.",
};

type TimelineItem = {
  id: string;
  date: string;
  time: string | null;
  type: string;
  description: string;
  responsible: string | null;
  status: string | null;
};

function mapRecent(record: RecentAdminRecord, type: string): TimelineItem {
  return {
    id: `${type}-${record.id}`,
    date: record.record_date,
    time: record.record_time,
    type,
    description: record.main,
    responsible: record.responsible,
    status: record.status,
  };
}

export default async function CronologiaPage() {
  await requireAdminSession();
  const [records, maintenance, inspections, water, aiLogs, aiDocuments] = await Promise.all([
    getAppccRecords({ type: "todos", includeArchivedEquipment: false }),
    getRecentMaintenanceRecords(),
    getRecentInspectionRecords(),
    getRecentWaterRecords(),
    getRecentAiProcessingLogs(20),
    getRecentAiSupplierDocuments(20),
  ]);

  const items: TimelineItem[] = [
    ...(records.ok ? records.data.map((record) => ({
      id: `${record.type}-${record.id}`,
      date: record.record_date,
      time: record.record_time,
      type: record.typeLabel,
      description: `${record.subject} · ${record.main}`,
      responsible: record.responsible,
      status: record.status,
    })) : []),
    ...(maintenance.ok ? maintenance.data.map((record) => mapRecent(record, "Mantenimiento")) : []),
    ...(inspections.ok ? inspections.data.map((record) => mapRecent(record, "Inspecciones")) : []),
    ...(water.ok ? water.data.map((record) => mapRecent(record, "Agua")) : []),
    ...(aiLogs.ok ? aiLogs.data.map((record) => ({
      id: `ia-log-${record.id}`,
      date: record.created_at.slice(0, 10),
      time: record.created_at.slice(11, 16),
      type: "OCR IA",
      description: `${record.document_name || "Documento"} · ${record.summary || record.detected_type || "Procesado"}`,
      responsible: "F. Javier Bocanegra Sanjuan",
      status: record.status,
    })) : []),
    ...(aiDocuments.ok ? aiDocuments.data.map((record) => ({
      id: `ia-doc-${record.id}`,
      date: record.document_date || record.created_at.slice(0, 10),
      time: record.created_at.slice(11, 16),
      type: "Recepción IA",
      description: `${record.supplier_name || "Proveedor"} · ${record.document_type || "Documento"}${record.document_number ? ` · ${record.document_number}` : ""}`,
      responsible: "F. Javier Bocanegra Sanjuan",
      status: record.ocr_status,
    })) : []),
  ].sort((a, b) => `${b.date} ${b.time || ""}`.localeCompare(`${a.date} ${a.time || ""}`)).slice(0, 120);

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Cronología APPCC" description="Vista cronológica de actividad sanitaria: temperaturas, limpieza, aceite, mercancías, incidencias, mantenimiento, inspecciones y agua." />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12">
        <div className="rounded-[2rem] border border-white/10 bg-[#151515] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.18)] sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#f2c6bb]">Actividad sanitaria</p>
              <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Últimos movimientos APPCC</h2>
            </div>
            <p className="text-sm text-stone-300">{items.length} movimientos recientes</p>
          </div>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-[54rem] w-full border-separate border-spacing-y-2 text-left text-sm">
              <thead className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f2c6bb]">
                <tr>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Hora</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Descripción</th>
                  <th className="px-3 py-2">Responsable</th>
                  <th className="px-3 py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="bg-[#fffaf4] text-stone-950">
                    <td className="rounded-l-2xl px-3 py-3 font-black">{item.date}</td>
                    <td className="px-3 py-3">{item.time ? item.time.slice(0, 5) : "-"}</td>
                    <td className="px-3 py-3 font-black">{item.type}</td>
                    <td className="px-3 py-3">{item.description}</td>
                    <td className="px-3 py-3">{item.responsible || "Sin responsable"}</td>
                    <td className="rounded-r-2xl px-3 py-3">{item.status || "Sin estado"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!items.length ? <p className="mt-6 text-sm text-stone-300">Todavía no hay actividad sanitaria registrada.</p> : null}
        </div>
      </section>
    </main>
  );
}
