import type { Metadata } from "next";
import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { getRecentSupplierRecords, getSupplierProfiles } from "@/lib/admin-kiosko/database";
import { saveSupplierRecordAction } from "../actions";
import { RecordPageShell } from "../_components/RecordPageShell";
import { SubmitButton, TextAreaField, TextField } from "../_components/InternalForms";

export const metadata: Metadata = { title: "Proveedores | Panel interno", description: "Registro interno de proveedores." };

function supplierStatus(profile: { status: string | null; cif: string | null; certificates?: string | null; health_register?: string | null; appcc?: string | null }) {
  if (profile.status === "autorizado" || (profile.cif && profile.certificates && profile.health_register && profile.appcc)) {
    return { label: "Autorizado / completo", className: "border-emerald-300 bg-emerald-100 text-emerald-950" };
  }

  if (!profile.certificates && !profile.health_register) {
    return { label: "Pendiente certificado sanitario", className: "border-amber-300 bg-amber-100 text-amber-950" };
  }

  if (!profile.cif) {
    return { label: "Pendiente de datos administrativos", className: "border-amber-300 bg-amber-100 text-amber-950" };
  }

  return { label: "Pendiente revisión", className: "border-sky-300 bg-sky-100 text-sky-950" };
}

export default async function ProveedoresPage({ searchParams }: { searchParams?: Promise<{ saved?: string; error?: string; q?: string }> }) {
  await requireAdminPermission("settings:manage");
  const params = await searchParams;
  const [records, profilesResult] = await Promise.all([
    getRecentSupplierRecords(),
    getSupplierProfiles(params?.q),
  ]);
  const profiles = profilesResult.ok ? profilesResult.data : [];

  return (
    <RecordPageShell title="Proveedores" description="Facturas, albaranes, OCR, recepciones, incidencias y productos por proveedor." saved={params?.saved === "1"} error={params?.error} records={records.ok ? records.data : []}>
      <section className="mb-6 grid gap-6">
        <form className="grid gap-3 md:grid-cols-[1fr_auto]">
          <input name="q" defaultValue={params?.q || ""} placeholder="Buscar proveedor, CIF o categoría" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b]" />
          <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white">Buscar</button>
        </form>

        <div className="grid gap-4">
          {profiles.map((profile) => {
            const status = supplierStatus(profile);

            return (
            <article key={profile.id} className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">Proveedor</p>
                  <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">{profile.supplier}</h2>
                  <p className="mt-2 text-sm text-stone-300">{profile.cif || "CIF pendiente de aportar"} · {profile.category || "Categoría no consignada"}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${status.className}`}>{status.label}</span>
                    {!profile.cif ? <span className="rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-950">Información administrativa pendiente</span> : null}
                    {!profile.certificates ? <span className="rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-950">Certificados sanitarios pendientes</span> : null}
                  </div>
                </div>
                <a href={`/admin-kiosko/trazabilidad?q=${encodeURIComponent(profile.supplier)}`} className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Abrir trazabilidad</a>
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-4">
                {[
                  ["Documentos OCR", profile.documents.map((item) => `${item.document_type || "Documento"} · ${item.document_number || item.document_date || "-"}`)],
                  ["Recepciones", profile.receptions.map((item) => `${item.record_date} · ${item.main}`)],
                  ["Incidencias", profile.incidents.map((item) => `${item.record_date} · ${item.main}`)],
                  ["Productos", profile.products.map((item) => `${item.name} · stock ${item.current_stock ?? 0} ${item.unit || "ud"}`)],
                ].map(([title, values]) => (
                  <section key={title as string} className="rounded-[1.4rem] border border-white/10 bg-white/6 p-4">
                    <h3 className="text-sm font-black uppercase tracking-[0.14em] text-[#f2c6bb]">{title as string}</h3>
                    <div className="mt-3 grid gap-2">
                      {(values as string[]).slice(0, 5).map((value) => <p key={value} className="rounded-xl border border-white/10 bg-[#0d0d0d] px-3 py-2 text-sm text-stone-200">{value}</p>)}
                      {!(values as string[]).length ? <p className="text-sm text-stone-400">Último registro no disponible todavía.</p> : null}
                    </div>
                  </section>
                ))}
              </div>
            </article>
          );
          })}
        </div>
      </section>

      <form action={saveSupplierRecordAction} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="supplier" label="Proveedor" required />
          <TextField name="cif" label="CIF" />
          <label className="grid gap-2 text-sm font-semibold text-stone-200">
            Estado
            <select name="status" defaultValue="pendiente_datos_administrativos" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b]">
              <option value="autorizado">Autorizado / completo</option>
              <option value="pendiente_datos_administrativos">Pendiente de datos administrativos</option>
              <option value="pendiente_certificado_sanitario">Pendiente certificado sanitario</option>
              <option value="pendiente_revision">Pendiente revisión</option>
            </select>
          </label>
          <TextField name="contact" label="Contacto" />
          <TextField name="phone" label="Teléfono" />
          <TextField name="email" label="Correo" type="email" />
          <TextField name="responsible_person" label="Persona responsable" />
          <TextField name="schedule" label="Horario" />
          <TextField name="category" label="Categoría" />
          <TextField name="usual_products" label="Productos habituales" />
        </div>
        <TextAreaField name="certificates" label="Certificados" />
        <TextAreaField name="health_register" label="Registro sanitario" />
        <TextAreaField name="appcc" label="APPCC proveedor" />
        <TextAreaField name="invoices" label="Facturas" />
        <TextAreaField name="delivery_notes" label="Albaranes" />
        <TextAreaField name="ocr_documents" label="Documentos OCR" />
        <TextAreaField name="receptions" label="Recepciones" />
        <TextAreaField name="incidents" label="Incidencias" />
        <TextAreaField name="reception_temperatures" label="Temperaturas recepción" />
        <TextAreaField name="ai_history" label="Historial IA" />
        <TextAreaField name="observations" label="Observaciones" />
        <SubmitButton />
      </form>
    </RecordPageShell>
  );
}
