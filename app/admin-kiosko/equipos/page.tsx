import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getRecentEquipmentAssets } from "@/lib/admin-kiosko/database";
import { saveEquipmentAssetAction } from "../actions";
import { RecordPageShell } from "../_components/RecordPageShell";
import { SelectField, SubmitButton, TextAreaField, TextField } from "../_components/InternalForms";

export const metadata: Metadata = { title: "Equipos | Panel interno", description: "Fichas internas de equipos." };

export default async function EquiposPage({ searchParams }: { searchParams?: Promise<{ saved?: string; error?: string }> }) {
  await requireAdminSession();
  const params = await searchParams;
  const records = await getRecentEquipmentAssets();

  return (
    <RecordPageShell title="Equipos" description="Ficha técnica, ubicación, mantenimiento y estado de equipos." saved={params?.saved === "1"} error={params?.error} records={records.ok ? records.data : []}>
      <form action={saveEquipmentAssetAction} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="name" label="Nombre" required />
          <TextField name="brand" label="Marca" />
          <TextField name="model" label="Modelo" />
          <TextField name="serial_number" label="Nº serie" />
          <TextField name="purchase_date" label="Fecha compra" type="date" />
          <TextField name="installation_date" label="Fecha instalación" type="date" />
          <TextField name="location" label="Ubicación" />
          <TextField name="last_maintenance" label="Último mantenimiento" type="date" />
          <TextField name="next_maintenance" label="Próximo mantenimiento" type="date" />
          <SelectField name="status" label="Estado" options={["operativo", "en_revision", "inoperativo"]} />
        </div>
        <TextAreaField name="fault_history" label="Historial averías" />
        <SubmitButton />
      </form>
    </RecordPageShell>
  );
}
