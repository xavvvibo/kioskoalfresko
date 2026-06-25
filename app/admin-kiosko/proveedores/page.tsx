import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getRecentSupplierRecords } from "@/lib/admin-kiosko/database";
import { saveSupplierRecordAction } from "../actions";
import { RecordPageShell } from "../_components/RecordPageShell";
import { SubmitButton, TextAreaField, TextField } from "../_components/InternalForms";

export const metadata: Metadata = { title: "Proveedores | Panel interno", description: "Registro interno de proveedores." };

export default async function ProveedoresPage({ searchParams }: { searchParams?: Promise<{ saved?: string; error?: string }> }) {
  await requireAdminSession();
  const params = await searchParams;
  const records = await getRecentSupplierRecords();

  return (
    <RecordPageShell title="Proveedores" description="Datos de proveedores, certificados y observaciones." saved={params?.saved === "1"} error={params?.error} records={records.ok ? records.data : []}>
      <form action={saveSupplierRecordAction} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="supplier" label="Proveedor" required />
          <TextField name="cif" label="CIF" />
          <TextField name="phone" label="Teléfono" />
          <TextField name="email" label="Correo" type="email" />
          <TextField name="category" label="Categoría" />
        </div>
        <TextAreaField name="certificates" label="Certificados" />
        <TextAreaField name="observations" label="Observaciones" />
        <SubmitButton />
      </form>
    </RecordPageShell>
  );
}
