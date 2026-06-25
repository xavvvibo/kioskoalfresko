import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getRecentSupplierRecords } from "@/lib/admin-kiosko/database";
import { saveSupplierRecordAction } from "../actions";
import { RecordPageShell } from "../_components/RecordPageShell";
import { SubmitButton, TextAreaField, TextField } from "../_components/InternalForms";

export const metadata: Metadata = { title: "Proveedores | Panel interno", description: "Registro interno de proveedores." };

export default async function ProveedoresPage({ searchParams }: { searchParams?: Promise<{ saved?: string; error?: string }> }) {
  await requireAdminSession();
  const params = await searchParams;
  const records = await getRecentSupplierRecords();
  const hasSuppliers = records.ok && records.data.length > 0;

  return (
    <RecordPageShell title="Proveedores" description="Datos de proveedores, certificados y observaciones." saved={params?.saved === "1"} error={params?.error} records={records.ok ? records.data : []}>
      <section className="mb-6 grid gap-3 sm:grid-cols-2">
        <article className="rounded-[1.4rem] border border-white/10 bg-white/6 p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">Expediente proveedor</p>
          <h2 className="mt-2 text-xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">
            {hasSuppliers ? "Proveedores registrados" : "Pendiente de completar proveedor"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-stone-300">
            CIF/NIF, registro sanitario, contacto, certificados, productos habituales y recepciones asociadas.
          </p>
        </article>
        <article className="rounded-[1.4rem] border border-white/10 bg-white/6 p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">Seguimiento sanitario</p>
          <h2 className="mt-2 text-xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Certificados y recepciones</h2>
          <p className="mt-2 text-sm leading-6 text-stone-300">
            Últimos documentos, últimas recepciones de mercancía e incidencias asociadas al proveedor.
          </p>
        </article>
      </section>
      <form action={saveSupplierRecordAction} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="supplier" label="Proveedor" required />
          <TextField name="cif" label="CIF" />
          <TextField name="category" label="Productos habituales / categoría" />
          <TextField name="phone" label="Teléfono" />
          <TextField name="email" label="Correo" type="email" />
        </div>
        <TextAreaField name="certificates" label="Registro sanitario, certificados y últimos documentos" />
        <TextAreaField name="observations" label="Contacto, últimas recepciones, incidencias asociadas y observaciones" />
        <SubmitButton />
      </form>
    </RecordPageShell>
  );
}
