import type { Metadata } from "next";
import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { getRecentInspectionRecords } from "@/lib/admin-kiosko/database";
import { saveInspectionRecordAction } from "../actions";
import { RecordPageShell } from "../_components/RecordPageShell";
import { SelectField, SubmitButton, TextAreaField, TextField } from "../_components/InternalForms";

export const metadata: Metadata = { title: "Inspecciones | Panel interno", description: "Histórico interno de inspecciones sanitarias." };

export default async function InspeccionesPage({ searchParams }: { searchParams?: Promise<{ saved?: string; error?: string }> }) {
  await requireAdminPermission("appcc:manage");
  const params = await searchParams;
  const records = await getRecentInspectionRecords();

  return (
    <RecordPageShell title="Inspecciones" description="Registro de inspecciones, actas, requerimientos y acciones realizadas." saved={params?.saved === "1"} error={params?.error} records={records.ok ? records.data : []}>
      <section className="mb-6 rounded-[1.4rem] border border-white/10 bg-white/6 p-4">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">Histórico de inspecciones</p>
        <h2 className="mt-2 text-xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Expediente de inspección sanitaria</h2>
        <p className="mt-2 text-sm leading-6 text-stone-300">
          Acta o documento asociado, requerimientos, fecha límite, acciones realizadas, estado y responsable interno.
        </p>
      </section>
      <form action={saveInspectionRecordAction} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="inspection_date" label="Fecha" type="date" required />
          <TextField name="inspector" label="Inspector" />
          <TextField name="organization" label="Organismo" />
          <SelectField name="result" label="Resultado" options={["Correcto", "Con requerimientos", "Incidencia"]} />
          <TextField name="deadline" label="Fecha límite" type="date" />
          <SelectField name="status" label="Estado" options={["abierta", "en proceso", "cerrada"]} />
        </div>
        <TextAreaField name="observations" label="Observaciones" />
        <TextAreaField name="requirements" label="Requerimientos" />
        <TextAreaField name="actions_done" label="Acciones realizadas" />
        <TextField name="responsible" label="Responsable" />
        <TextAreaField name="documentation" label="Acta / documento asociado" />
        <SubmitButton />
      </form>
    </RecordPageShell>
  );
}
