import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { BasicRecordForm } from "../_components/BasicRecordForm";
import { RecordPageShell } from "../_components/RecordPageShell";

export const metadata: Metadata = {
  title: "Recepción de mercancía | Panel interno",
  description: "Control interno de recepción de mercancía y trazabilidad.",
};

export default async function RecepcionMercanciaPage() {
  await requireAdminSession();

  return (
    <RecordPageShell
      title="Recepción de mercancía"
      description="Entrada de producto, conformidad, temperatura y trazabilidad."
    >
      <BasicRecordForm
        subjectLabel="Tipo de mercancía"
        options={["Refrigerado", "Congelado", "Seco", "Bebidas", "Producto fresco", "Otro"]}
      />
    </RecordPageShell>
  );
}
