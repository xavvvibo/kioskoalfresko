import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { BasicRecordForm } from "../_components/BasicRecordForm";
import { RecordPageShell } from "../_components/RecordPageShell";

export const metadata: Metadata = {
  title: "Checklists internos | Panel interno",
  description: "Checklists internos operativos y documentación.",
};

export default async function ChecklistsPage() {
  await requireAdminSession();

  return (
    <RecordPageShell
      title="Checklists operativos"
      description="Apertura, cierre, revisiones de zonas y documentación interna preparada."
    >
      <BasicRecordForm
        subjectLabel="Checklist / documento"
        options={["Apertura de cocina", "Cierre de cocina", "Apertura de barra", "Cierre de barra", "Revisión de terraza", "Revisión de baños", "APPCC / Plan sanitario", "Alérgenos", "Proveedores", "Mantenimiento"]}
      />
    </RecordPageShell>
  );
}
