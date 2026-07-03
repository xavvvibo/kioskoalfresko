import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getRecentFryerOilRecords } from "@/lib/admin-kiosko/database";
import { saveFryerOilRecordAction } from "../actions";
import { BasicRecordForm } from "../_components/BasicRecordForm";
import { RecordPageShell } from "../_components/RecordPageShell";

export const metadata: Metadata = {
  title: "Control de aceite | Panel interno",
  description: "Control interno de aceite de freidora.",
};

export default async function AceiteFreidoraPage({
  searchParams,
}: {
  searchParams?: Promise<{ saved?: string; error?: string }>;
}) {
  await requireAdminSession();
  const params = await searchParams;
  const records = await getRecentFryerOilRecords();

  return (
    <RecordPageShell
      title="Control de aceite de freidora"
      description="Revisión del estado del aceite, cambios y observaciones."
      saved={params?.saved === "1"}
      error={params?.error}
      records={records.ok ? records.data : []}
    >
      <BasicRecordForm
        action={saveFryerOilRecordAction}
        subjectName="fryer"
        subjectLabel="Freidora / punto de control"
        options={["Freidora principal", "Freidora auxiliar", "Filtrado de aceite", "Cambio de aceite", "Limpieza de cuba", "Retirada aceite usado"]}
      >
        <label className="grid gap-2 text-sm font-semibold text-stone-200">
          Estado del aceite
          <select required name="oil_status" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30">
            <option>Correcto</option>
            <option>Revisar</option>
            <option>Cambiar</option>
          </select>
        </label>
        <label className="flex items-center gap-3 rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm font-semibold text-stone-200">
          <input name="oil_changed" type="checkbox" className="h-5 w-5" />
          Aceite cambiado
        </label>
        <label className="grid gap-2 text-sm font-semibold text-stone-200">
          Compuestos polares
          <input name="polar_compounds" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-stone-200">
          Color / olor
          <input name="color_smell_check" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
        </label>
        <label className="flex items-center gap-3 rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm font-semibold text-stone-200">
          <input name="oil_filtered" type="checkbox" className="h-5 w-5" />
          Aceite filtrado
        </label>
        <label className="flex items-center gap-3 rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm font-semibold text-stone-200">
          <input name="waste_oil_removed" type="checkbox" className="h-5 w-5" />
          Retirada de aceite usado registrada
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-stone-200">
            Gestor autorizado
            <input name="waste_oil_manager" placeholder="Empresa gestora" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-stone-200">
            Contrato / referencia
            <input name="waste_oil_contract" placeholder="Nº contrato, cliente o referencia" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-stone-200">
            Teléfono/email gestor
            <input name="waste_oil_contact" placeholder="Contacto operativo" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-stone-200">
            Fecha retirada
            <input name="waste_oil_pickup_date" type="date" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
          </label>
        </div>
        <label className="grid gap-2 text-sm font-semibold text-stone-200">
          Justificante/documento asociado
          <input name="waste_oil_document" placeholder="Referencia del justificante o documento subido en Inbox" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
        </label>
      </BasicRecordForm>
    </RecordPageShell>
  );
}
