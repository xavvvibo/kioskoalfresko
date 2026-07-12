import type { Metadata } from "next";
import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { getRecentMaintenanceRecords } from "@/lib/admin-kiosko/database";
import { saveMaintenanceRecordAction } from "../actions";
import { RecordPageShell } from "../_components/RecordPageShell";
import { SubmitButton, TextAreaField, TextField } from "../_components/InternalForms";

export const metadata: Metadata = { title: "Mantenimiento | Panel interno", description: "Registro interno de mantenimiento." };

export default async function MantenimientoPage({ searchParams }: { searchParams?: Promise<{ saved?: string; error?: string }> }) {
  await requireAdminPermission("appcc:manage");
  const params = await searchParams;
  const records = await getRecentMaintenanceRecords();

  return (
    <RecordPageShell title="Mantenimiento" description="Intervenciones, empresas, facturas y observaciones." saved={params?.saved === "1"} error={params?.error} records={records.ok ? records.data : []}>
      <form action={saveMaintenanceRecordAction} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="record_date" label="Fecha" type="date" required />
          <TextField name="equipment" label="Equipo" />
          <TextField name="intervention" label="Intervención" />
          <TextField name="company" label="Empresa" />
          <TextField name="invoice" label="Factura" />
          <TextField name="responsible" label="Responsable" />
        </div>
        <TextAreaField name="observations" label="Observaciones" />
        <SubmitButton />
      </form>
    </RecordPageShell>
  );
}
