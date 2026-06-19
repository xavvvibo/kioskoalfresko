import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { BasicRecordForm } from "../_components/BasicRecordForm";
import { RecordPageShell } from "../_components/RecordPageShell";

export const metadata: Metadata = {
  title: "Incidencias sanitarias | Panel interno",
  description: "Registro interno de incidencias sanitarias.",
};

export default async function IncidenciasPage() {
  await requireAdminSession();

  return (
    <RecordPageShell
      title="Registro de incidencias sanitarias"
      description="Anotación de incidencias, seguimiento y responsable."
    >
      <BasicRecordForm
        subjectLabel="Tipo de incidencia"
        options={["Temperatura", "Limpieza", "Producto", "Equipo", "Proveedor", "Otra"]}
      />
    </RecordPageShell>
  );
}
