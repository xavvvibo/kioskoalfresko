import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getRecentAnnualVerificationRecords } from "@/lib/admin-kiosko/database";
import { saveAnnualVerificationAction } from "../actions";
import { RecordPageShell } from "../_components/RecordPageShell";
import { CheckField, SubmitButton, TextAreaField, TextField } from "../_components/InternalForms";

export const metadata: Metadata = { title: "Verificación anual | Panel interno", description: "Checklist anual APPCC." };

const checks = [
  ["appcc_reviewed", "APPCC revisado"],
  ["health_memory_reviewed", "Memoria sanitaria revisada"],
  ["allergens_reviewed", "Alérgenos revisados"],
  ["suppliers_reviewed", "Proveedores revisados"],
  ["cleaning_products_reviewed", "Productos limpieza revisados"],
  ["equipment_reviewed", "Equipos revisados"],
  ["handler_training", "Formación manipuladores"],
  ["documentation_complete", "Documentación completa"],
];

export default async function VerificacionAnualPage({ searchParams }: { searchParams?: Promise<{ saved?: string; error?: string }> }) {
  await requireAdminSession();
  const params = await searchParams;
  const records = await getRecentAnnualVerificationRecords();

  return (
    <RecordPageShell title="Verificación anual" description="Revisión anual de documentación, proveedores, equipos y formación." saved={params?.saved === "1"} error={params?.error} records={records.ok ? records.data : []}>
      <form action={saveAnnualVerificationAction} className="grid gap-4">
        <TextField name="record_date" label="Fecha" type="date" required />
        <div className="grid gap-3">
          {checks.map(([name, label]) => <CheckField key={name} name={name} label={label} />)}
        </div>
        <TextField name="responsible" label="Responsable" />
        <TextAreaField name="observations" label="Observaciones" />
        <SubmitButton />
      </form>
    </RecordPageShell>
  );
}
