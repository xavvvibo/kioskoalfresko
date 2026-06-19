import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { BasicRecordForm } from "../_components/BasicRecordForm";
import { RecordPageShell } from "../_components/RecordPageShell";

export const metadata: Metadata = {
  title: "Registro de limpieza | Panel interno",
  description: "Registro interno de limpieza diaria.",
};

export default async function LimpiezaPage() {
  await requireAdminSession();

  return (
    <RecordPageShell
      title="Registro de limpieza diaria"
      description="Control de limpieza por zonas, turnos y responsable."
    >
      <BasicRecordForm
        subjectLabel="Zona revisada"
        options={["Cocina", "Barra", "Terraza", "Baños", "Almacén", "Zona común"]}
      />
    </RecordPageShell>
  );
}
