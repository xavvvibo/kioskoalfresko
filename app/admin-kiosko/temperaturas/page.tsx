import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getRecentTemperatureRecords } from "@/lib/admin-kiosko/database";
import { saveTemperatureRecordAction } from "../actions";
import { RecordPageShell } from "../_components/RecordPageShell";
import { TemperatureForm } from "../_components/TemperatureForm";

export const metadata: Metadata = {
  title: "Registro de temperaturas | Panel interno",
  description: "Registro interno de temperaturas de cámaras y equipos.",
};

export default async function TemperaturasPage({
  searchParams,
}: {
  searchParams?: Promise<{ saved?: string; error?: string }>;
}) {
  await requireAdminSession();
  const params = await searchParams;
  const records = await getRecentTemperatureRecords();

  return (
    <RecordPageShell
      title="Registro de temperaturas"
      description="Cámaras, congeladores, botelleros y equipos de frío."
      saved={params?.saved === "1"}
      error={params?.error === "1"}
      records={records.ok ? records.data : []}
    >
      <TemperatureForm action={saveTemperatureRecordAction} />
    </RecordPageShell>
  );
}
