import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { BasicRecordForm } from "../_components/BasicRecordForm";
import { RecordPageShell } from "../_components/RecordPageShell";

export const metadata: Metadata = {
  title: "Control de aceite | Panel interno",
  description: "Control interno de aceite de freidora.",
};

export default async function AceiteFreidoraPage() {
  await requireAdminSession();

  return (
    <RecordPageShell
      title="Control de aceite de freidora"
      description="Revisión del estado del aceite, cambios y observaciones."
    >
      <BasicRecordForm
        subjectLabel="Freidora / punto de control"
        options={["Freidora principal", "Freidora auxiliar", "Cambio de aceite", "Limpieza de cuba"]}
      />
    </RecordPageShell>
  );
}
