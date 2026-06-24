import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getRecentIncidentRecords } from "@/lib/admin-kiosko/database";
import { saveIncidentRecordAction } from "../actions";
import { BasicRecordForm } from "../_components/BasicRecordForm";
import { RecordPageShell } from "../_components/RecordPageShell";

export const metadata: Metadata = {
  title: "Incidencias sanitarias | Panel interno",
  description: "Registro interno de incidencias sanitarias.",
};

export default async function IncidenciasPage({
  searchParams,
}: {
  searchParams?: Promise<{ saved?: string; error?: string }>;
}) {
  await requireAdminSession();
  const params = await searchParams;
  const records = await getRecentIncidentRecords();

  return (
    <RecordPageShell
      title="Registro de incidencias sanitarias"
      description="Anotación de incidencias, seguimiento y responsable."
      saved={params?.saved === "1"}
      error={params?.error}
      records={records.ok ? records.data : []}
    >
      <BasicRecordForm
        action={saveIncidentRecordAction}
        subjectName="incident_type"
        subjectLabel="Tipo de incidencia"
        options={["Temperatura", "Limpieza", "Producto", "Equipo", "Proveedor", "Otra"]}
      >
        <label className="grid gap-2 text-sm font-semibold text-stone-200">
          Gravedad
          <select name="severity" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30">
            <option>Baja</option>
            <option>Media</option>
            <option>Alta</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-stone-200">
          Acción correctiva
          <textarea name="corrective_action" rows={3} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
        </label>
        <label className="flex items-center gap-3 rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm font-semibold text-stone-200">
          <input name="resolved" type="checkbox" className="h-5 w-5" />
          Incidencia resuelta
        </label>
      </BasicRecordForm>
    </RecordPageShell>
  );
}
