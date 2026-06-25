import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getRecentChecklistRecords } from "@/lib/admin-kiosko/database";
import { saveChecklistOpeningAction } from "../../actions";
import { RecordPageShell } from "../../_components/RecordPageShell";
import { CheckField, SubmitButton, TextAreaField, TextField } from "../../_components/InternalForms";

export const metadata: Metadata = {
  title: "Checklist apertura APPCC | Panel interno",
  description: "Checklist interno de apertura APPCC.",
};

const checks = [
  "Cámara refrigeración correcta",
  "Congelador correcto",
  "Lavamanos operativo",
  "Productos etiquetados",
  "Limpieza realizada",
  "Termómetros revisados",
  "Sin incidencias",
];

export default async function ChecklistAperturaPage({ searchParams }: { searchParams?: Promise<{ saved?: string; error?: string }> }) {
  await requireAdminSession();
  const params = await searchParams;
  const records = await getRecentChecklistRecords();

  return (
    <RecordPageShell title="Checklist apertura APPCC" description="Control operativo antes de iniciar servicio." saved={params?.saved === "1"} error={params?.error} records={records.ok ? records.data : []}>
      <form action={saveChecklistOpeningAction} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="record_date" label="Fecha" type="date" required />
          <TextField name="record_time" label="Hora" type="time" required />
        </div>
        <div className="grid gap-3">
          {checks.map((check, index) => <CheckField key={check} name={`check_${index}`} label={check} />)}
        </div>
        <TextField name="responsible" label="Responsable" required />
        <TextAreaField name="observations" label="Observaciones" />
        <SubmitButton />
      </form>
    </RecordPageShell>
  );
}
