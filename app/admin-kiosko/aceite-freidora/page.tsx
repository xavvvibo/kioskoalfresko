import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { getRecentFryerOilRecords } from "@/lib/admin-kiosko/database";
import { resolveAppccRecordFilters } from "@/lib/admin-kiosko/appcc-record-filters";
import { wasteOilContract } from "@/lib/admin-kiosko/documents";
import { getWasteOilMonthlyControl } from "@/lib/admin-kiosko/waste-oil-documents";
import { saveFryerOilRecordAction } from "../actions";
import { AppccRecordFilters } from "../_components/AppccRecordFilters";
import { BasicRecordForm } from "../_components/BasicRecordForm";
import { RecordPageShell } from "../_components/RecordPageShell";

export const metadata: Metadata = {
  title: "Control de aceite | Panel interno",
  description: "Control interno de aceite de freidora.",
};

export default async function AceiteFreidoraPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  await requireAdminPermission("appcc:manage");
  const params = await searchParams;
  const filters = resolveAppccRecordFilters(params);
  const hasFilters = filters.preset !== "all" || Boolean(filters.subject || filters.status || filters.source || filters.dateFrom || filters.dateTo);
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
  const [records, monthlyRecords, wasteOilControl] = await Promise.all([
    getRecentFryerOilRecords({ ...filters, limit: hasFilters ? 200 : 10 }),
    getRecentFryerOilRecords({ preset: "custom", dateFrom: monthStart, dateTo: monthEnd, limit: 200 }),
    getWasteOilMonthlyControl(now),
  ]);
  const data = records.ok ? records.data : [];
  const monthlyData = monthlyRecords.ok ? monthlyRecords.data : [];
  const monthlyRemovalRecord = monthlyData.find((record) => {
    const text = [record.main, record.observations].filter(Boolean).join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return text.includes("retirada aceite usado") || text.includes("retirada de aceite usado") || text.includes("recogida aceite usado");
  });
  const oilControl = wasteOilControl.ok ? wasteOilControl.data : null;
  const monthlyAlerts = [
    !monthlyRemovalRecord ? `No consta retirada mensual registrada en controles de aceite para ${monthStart.slice(0, 7)}.` : "",
    oilControl && !oilControl.hasMonthlyJustification ? `Falta justificante mensual de retirada en admin_uploaded_documents para ${oilControl.month}.` : "",
    oilControl && !oilControl.hasMonthlyCertificate ? `Falta certificado mensual de recogida/tratamiento en admin_uploaded_documents para ${oilControl.month}.` : "",
    oilControl && !oilControl.hasContract ? "No se ha localizado el contrato asociado en admin_uploaded_documents." : "",
  ].filter(Boolean);
  const fryerOptions = ["Freidora principal", "Freidora auxiliar", "Filtrado de aceite", "Cambio de aceite", "Limpieza de cuba", "Retirada aceite usado"];

  return (
    <RecordPageShell
      title="Control de aceite de freidora"
      description="Revisión del estado del aceite, cambios y observaciones."
      saved={params?.saved === "1"}
      error={params?.error}
      records={data}
      recordsTitle={hasFilters ? "Registros encontrados" : "Últimos 10 registros"}
      recordsIntro="Ordenados siempre de más reciente a más antiguo."
      showRecordResponsible={false}
      beforeRecords={(
        <>
          <section className="mt-6 rounded-[1.4rem] border border-white/10 bg-white/6 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Contrato gestor autorizado</h2>
                <p className="mt-2 text-sm leading-6 text-stone-300">{wasteOilContract.manager}</p>
              </div>
              <Link href="/admin-kiosko/documentacion/contrato-gestor-aceite-usado" className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white">Ver contrato</Link>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                ["Contrato", wasteOilContract.contractNumber],
                ["Frecuencia", wasteOilContract.frequency],
                ["LER/CER", wasteOilContract.lerCer],
                ["Residuo", wasteOilContract.waste],
                ["Bidones", wasteOilContract.drums],
                ["Estado", wasteOilContract.status],
              ].map(([label, value]) => (
                <article key={label} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f2c6bb]">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-white">{value}</p>
                </article>
              ))}
            </div>
            <p className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm font-semibold leading-6 text-stone-200">{wasteOilContract.exclusivity}</p>
            <div className="mt-4 grid gap-2">
              {monthlyAlerts.length ? monthlyAlerts.map((alert) => (
                <p key={alert} className="rounded-2xl border border-amber-300 bg-amber-100 p-3 text-sm font-black text-amber-950">{alert}</p>
              )) : (
                <p className="rounded-2xl border border-emerald-300 bg-emerald-100 p-3 text-sm font-black text-emerald-950">Control mensual de aceite usado completo para {monthStart.slice(0, 7)}.</p>
              )}
              <p className="text-xs font-semibold leading-6 text-stone-400">
                Verificación no destructiva: registros reales de aceite del mes y documentos reales en admin_uploaded_documents. No se generan retiradas automáticas.
              </p>
            </div>
          </section>
          <AppccRecordFilters
            filters={filters}
            subjectLabel="Punto control"
            subjectOptions={fryerOptions.map((fryer) => ({ label: fryer, value: fryer }))}
            statusOptions={[
              { label: "Correcto", value: "correcto" },
              { label: "Revisar", value: "revisar" },
              { label: "Incidencia", value: "incidencia" },
            ]}
            foundCount={data.length}
          />
        </>
      )}
    >
      <BasicRecordForm
        action={saveFryerOilRecordAction}
        subjectName="fryer"
        subjectLabel="Freidora / punto de control"
        options={fryerOptions}
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
