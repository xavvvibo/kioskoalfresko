import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getRecentCleaningRecords } from "@/lib/admin-kiosko/database";
import { saveCleaningRecordAction } from "../actions";
import { BasicRecordForm } from "../_components/BasicRecordForm";
import { RecordPageShell } from "../_components/RecordPageShell";

export const metadata: Metadata = {
  title: "Registro de limpieza | Panel interno",
  description: "Registro interno de limpieza diaria.",
};

export default async function LimpiezaPage({
  searchParams,
}: {
  searchParams?: Promise<{ saved?: string; error?: string }>;
}) {
  await requireAdminSession();
  const params = await searchParams;
  const records = await getRecentCleaningRecords();

  return (
    <RecordPageShell
      title="Registro de limpieza diaria"
      description="Control de limpieza por zonas, turnos y responsable."
      saved={params?.saved === "1"}
      error={params?.error}
      records={records.ok ? records.data : []}
    >
      <BasicRecordForm
        action={saveCleaningRecordAction}
        subjectName="area"
        subjectLabel="Zona revisada"
        options={["Barra", "Cocina", "Plancha", "Freidoras", "Campana/extracción", "Cámaras", "Congeladores", "Mesas de trabajo", "Utensilios", "Almacén", "Terraza", "Baños", "Cubos/residuos", "TPV/superficies de contacto"]}
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
