import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getRecentChecklistRecords } from "@/lib/admin-kiosko/database";
import { saveChecklistRecordAction } from "../actions";
import { BasicRecordForm } from "../_components/BasicRecordForm";
import { RecordPageShell } from "../_components/RecordPageShell";

export const metadata: Metadata = {
  title: "Checklists internos | Panel interno",
  description: "Checklists internos operativos y documentación.",
};

export default async function ChecklistsPage({
  searchParams,
}: {
  searchParams?: Promise<{ saved?: string; error?: string }>;
}) {
  await requireAdminSession();
  const params = await searchParams;
  const records = await getRecentChecklistRecords();

  return (
    <RecordPageShell
      title="Checklists operativos"
      description="Apertura, cierre, revisiones de zonas y documentación interna preparada."
      saved={params?.saved === "1"}
      error={params?.error === "1"}
      records={records.ok ? records.data : []}
    >
      <BasicRecordForm
        action={saveChecklistRecordAction}
        subjectName="checklist_type"
        subjectLabel="Checklist / documento"
        options={["Apertura de cocina", "Cierre de cocina", "Apertura de barra", "Cierre de barra", "Revisión de terraza", "Revisión de baños", "APPCC / Plan sanitario", "Alérgenos", "Proveedores", "Mantenimiento"]}
      >
        <div className="grid gap-3">
          {["Punto 1", "Punto 2", "Punto 3", "Punto 4"].map((label, index) => (
            <label key={label} className="grid gap-2 text-sm font-semibold text-stone-200">
              {label}
              <input name={`item_${index + 1}`} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
            </label>
          ))}
        </div>
        <label className="flex items-center gap-3 rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm font-semibold text-stone-200">
          <input name="completed" type="checkbox" className="h-5 w-5" />
          Checklist completado
        </label>
      </BasicRecordForm>
    </RecordPageShell>
  );
}
