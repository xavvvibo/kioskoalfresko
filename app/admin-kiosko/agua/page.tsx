import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getRecentWaterRecords } from "@/lib/admin-kiosko/database";
import { saveWaterRecordAction } from "../actions";
import { RecordPageShell } from "../_components/RecordPageShell";
import { SelectField, SubmitButton, TextAreaField, TextField } from "../_components/InternalForms";

export const metadata: Metadata = { title: "Control de agua | Panel interno", description: "Registro interno de control de agua." };

export default async function AguaPage({ searchParams }: { searchParams?: Promise<{ saved?: string; error?: string }> }) {
  await requireAdminSession();
  const params = await searchParams;
  const records = await getRecentWaterRecords();

  return (
    <RecordPageShell title="Agua" description="Control organoléptico y cloro si aplica." saved={params?.saved === "1"} error={params?.error} records={records.ok ? records.data : []}>
      <form action={saveWaterRecordAction} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="record_date" label="Fecha" type="date" required />
          <SelectField name="color" label="Color" options={["Correcto", "Revisar", "Incidencia"]} />
          <SelectField name="smell" label="Olor" options={["Correcto", "Revisar", "Incidencia"]} />
          <SelectField name="taste" label="Sabor" options={["Correcto", "Revisar", "Incidencia"]} />
          <TextField name="chlorine" label="Cloro si aplica" />
          <TextField name="responsible" label="Responsable" />
        </div>
        <TextAreaField name="observations" label="Observaciones" />
        <SubmitButton />
      </form>
    </RecordPageShell>
  );
}
