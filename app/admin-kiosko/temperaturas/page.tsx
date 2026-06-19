import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { RecordPageShell } from "../_components/RecordPageShell";
import { TemperatureForm } from "../_components/TemperatureForm";

export const metadata: Metadata = {
  title: "Registro de temperaturas | Panel interno",
  description: "Registro interno de temperaturas de cámaras y equipos.",
};

export default async function TemperaturasPage() {
  await requireAdminSession();

  return (
    <RecordPageShell
      title="Registro de temperaturas"
      description="Cámaras, congeladores, botelleros y equipos de frío."
    >
      <TemperatureForm />
    </RecordPageShell>
  );
}
