import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getOpenEquipmentAlerts, getRecentTemperatureRecords } from "@/lib/admin-kiosko/database";
import { saveTemperatureRecordAction } from "../actions";
import { TemperatureAlerts } from "../_components/TemperatureAlerts";
import { RecordPageShell } from "../_components/RecordPageShell";
import { TemperatureForm } from "../_components/TemperatureForm";

export const metadata: Metadata = {
  title: "Registro de temperaturas | Panel interno",
  description: "Registro interno de temperaturas de equipos APPCC.",
};

export default async function TemperaturasPage({
  searchParams,
}: {
  searchParams?: Promise<{ saved?: string; error?: string }>;
}) {
  await requireAdminSession();
  const params = await searchParams;
  const [records, alerts] = await Promise.all([
    getRecentTemperatureRecords(),
    getOpenEquipmentAlerts(),
  ]);

  return (
    <RecordPageShell
      title="Registro de temperaturas"
      description="Equipos APPCC de frío, congelación e hielo."
      saved={params?.saved === "1"}
      error={params?.error}
      records={records.ok ? records.data : []}
    >
      <TemperatureForm action={saveTemperatureRecordAction} />
      <TemperatureAlerts alerts={alerts.ok ? alerts.data : []} />
    </RecordPageShell>
  );
}
