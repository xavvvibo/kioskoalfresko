import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getRecentCleaningRecords } from "@/lib/admin-kiosko/database";
import { resolveAppccRecordFilters } from "@/lib/admin-kiosko/appcc-record-filters";
import { saveCleaningRecordAction } from "../actions";
import { AppccRecordFilters } from "../_components/AppccRecordFilters";
import { BasicRecordForm } from "../_components/BasicRecordForm";
import { RecordPageShell } from "../_components/RecordPageShell";

export const metadata: Metadata = {
  title: "Registro de limpieza | Panel interno",
  description: "Registro interno de limpieza diaria.",
};

export default async function LimpiezaPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  await requireAdminSession();
  const params = await searchParams;
  const filters = resolveAppccRecordFilters(params);
  const hasFilters = filters.preset !== "all" || Boolean(filters.subject || filters.status || filters.source || filters.dateFrom || filters.dateTo);
  const records = await getRecentCleaningRecords({ ...filters, limit: hasFilters ? 200 : 10 });
  const data = records.ok ? records.data : [];
  const areaOptions = ["Barra", "Cocina", "Plancha", "Freidoras", "Campana/extracción", "Cámaras", "Congeladores", "Mesas de trabajo", "Utensilios", "Almacén", "Terraza", "Baños", "Cubos/residuos", "TPV/superficies de contacto", "Cierre APPCC diario"];

  return (
    <RecordPageShell
      title="Registro de limpieza diaria"
      description="Control de limpieza por zonas, turnos y responsable."
      saved={params?.saved === "1"}
      error={params?.error}
      records={data}
      recordsTitle={hasFilters ? "Registros encontrados" : "Últimos 10 registros"}
      recordsIntro="Ordenados siempre de más reciente a más antiguo."
      showRecordResponsible={false}
      beforeRecords={(
        <AppccRecordFilters
          filters={filters}
          subjectLabel="Zona"
          subjectOptions={areaOptions.map((area) => ({ label: area, value: area }))}
          statusOptions={[
            { label: "Correcto", value: "correcto" },
            { label: "Revisar", value: "revisar" },
            { label: "Incidencia", value: "incidencia" },
          ]}
          foundCount={data.length}
        />
      )}
    >
      <BasicRecordForm
        action={saveCleaningRecordAction}
        subjectName="area"
        subjectLabel="Zona revisada"
        options={areaOptions.filter((area) => area !== "Cierre APPCC diario")}
      >
        <label className="grid gap-2 text-sm font-semibold text-stone-200">
          Turno
          <select name="shift" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30">
            <option>Apertura</option>
            <option>Servicio</option>
            <option>Cierre</option>
          </select>
        </label>
        <label className="flex items-center gap-3 rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm font-semibold text-stone-200">
          <input name="cleaning_done" type="checkbox" className="h-5 w-5" />
          Limpieza realizada
        </label>
        <label className="grid gap-2 text-sm font-semibold text-stone-200">
          Productos usados
          <input name="products_used" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-stone-200">
          Método aplicado
          <input name="cleaning_method" placeholder="Retirada de restos, lavado, desinfección, aclarado si aplica..." className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-stone-200">
          Verificación
          <input name="verification" placeholder="Visual correcto, superficie seca, sin restos, olor correcto..." className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
        </label>
      </BasicRecordForm>
    </RecordPageShell>
  );
}
