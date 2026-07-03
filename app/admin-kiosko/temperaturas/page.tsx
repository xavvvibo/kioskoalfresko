import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getOpenEquipmentAlerts, getRecentTemperatureRecords } from "@/lib/admin-kiosko/database";
import { resolveAppccRecordFilters } from "@/lib/admin-kiosko/appcc-record-filters";
import { temperatureEquipment } from "@/lib/admin-kiosko/temperature-rules";
import { saveTemperatureRecordAction } from "../actions";
import { AppccRecordFilters } from "../_components/AppccRecordFilters";
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
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  await requireAdminSession();
  const params = await searchParams;
  const filters = resolveAppccRecordFilters(params);
  const hasFilters = filters.preset !== "all" || Boolean(filters.subject || filters.status || filters.source || filters.dateFrom || filters.dateTo);
  const [records, alerts] = await Promise.all([
    getRecentTemperatureRecords({ ...filters, limit: hasFilters ? 200 : 10 }),
    getOpenEquipmentAlerts(),
  ]);
  const data = records.ok ? records.data : [];

  return (
    <RecordPageShell
      title="Registro de temperaturas"
      description="Equipos APPCC de frío, congelación e hielo."
      saved={params?.saved === "1"}
      error={params?.error}
      records={data}
      recordsTitle={hasFilters ? "Registros encontrados" : "Últimos 10 registros"}
      recordsIntro="Ordenados siempre de más reciente a más antiguo."
      showRecordResponsible={false}
      beforeRecords={(
        <AppccRecordFilters
          filters={filters}
          subjectLabel="Equipo"
          subjectOptions={temperatureEquipment.filter((equipment) => equipment.active).map((equipment) => ({ label: equipment.name, value: equipment.name }))}
          statusOptions={[
            { label: "Correcto", value: "correcto" },
            { label: "Revisar", value: "revisar" },
            { label: "Incidencia", value: "incidencia" },
          ]}
          foundCount={data.length}
        />
      )}
    >
      <TemperatureForm action={saveTemperatureRecordAction} />
      <TemperatureAlerts alerts={alerts.ok ? alerts.data : []} />
    </RecordPageShell>
  );
}
