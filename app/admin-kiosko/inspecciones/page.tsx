import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getRecentInspectionRecords } from "@/lib/admin-kiosko/database";
import { saveInspectionRecordAction } from "../actions";
import { RecordPageShell } from "../_components/RecordPageShell";
import { SelectField, SubmitButton, TextAreaField, TextField } from "../_components/InternalForms";

export const metadata: Metadata = { title: "Inspecciones | Panel interno", description: "Histórico interno de inspecciones sanitarias." };

export default async function InspeccionesPage({ searchParams }: { searchParams?: Promise<{ saved?: string; error?: string }> }) {
  await requireAdminSession();
  const params = await searchParams;
  const records = await getRecentInspectionRecords();

  return (
    <RecordPageShell title="Inspecciones" description="Registro de inspecciones, requerimientos y acciones realizadas." saved={params?.saved === "1"} error={params?.error} records={records.ok ? records.data : []}>
      <form action={saveInspectionRecordAction} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="inspection_date" label="Fecha" type="date" required />
          <TextField name="inspector" label="Inspector" />
          <TextField name="organization" label="Organismo" />
          <SelectField name="result" label="Resultado" options={["Correcto", "Con requerimientos", "Incidencia"]} />
          <TextField name="deadline" label="Fecha límite" type="date" />
          <SelectField name="status" label="Estado" options={["pendiente", "en_proceso", "solventado"]} />
        </div>
        <TextAreaField name="observations" label="Observaciones" />
        <TextAreaField name="requirements" label="Requerimientos" />
        <TextAreaField name="actions_done" label="Acciones realizadas" />
        <TextField name="responsible" label="Responsable" />
        <TextAreaField name="documentation" label="Documentación asociada" />
        <SubmitButton />
      </form>
    </RecordPageShell>
  );
}
