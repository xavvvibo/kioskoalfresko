import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getStaffEmployeeByAuthUserId } from "@/lib/admin-kiosko/repositories/staff.repository";
import { listStaffDocuments, listStaffSignatures } from "@/lib/admin-kiosko/repositories/staff-records.repository";
import { SignatureCanvas } from "@/components/staff/SignatureCanvas";
import { staffSignDocumentAction } from "../actions";

export default async function StaffSignaturesPage() {
  const session = await requireAdminSession("/staff/firmas");
  if (!session.id) return <Empty text="Accede con un usuario nominal vinculado a empleado." />;
  const employee = await getStaffEmployeeByAuthUserId(session.id);
  if (!employee.ok || !employee.data) return <Empty text={employee.ok ? "No hay empleado vinculado." : employee.error} />;
  const [documents, signatures] = await Promise.all([listStaffDocuments(employee.data.id, false), listStaffSignatures(employee.data.id)]);
  const pending = documents.ok ? documents.data.filter((document) => document.signature_status === "pending" && document.visible_to_employee) : [];
  return (
    <main className="min-h-screen bg-[#0d0d0d] px-4 py-6 text-white">
      <div className="mx-auto grid max-w-4xl gap-5">
        <Link href="/staff" className="text-sm font-bold text-[#f2c6bb]">Volver</Link>
        <h1 className="text-4xl font-black uppercase tracking-[-0.05em]">Firmas</h1>
        {pending.map((document) => (
          <form key={document.id} action={staffSignDocumentAction} className="grid gap-3 rounded-[1.6rem] border border-white/10 bg-[#151515] p-5">
            <input type="hidden" name="documentId" value={document.id} />
            <p className="text-sm font-bold text-stone-300">Firma manuscrita y evidencia interna. No es firma electrónica cualificada.</p>
            <p className="font-black text-white">{document.visible_name} · versión {document.version}</p>
            <SignatureCanvas />
            <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Firmar documento</button>
          </form>
        ))}
        <section className="grid gap-3">
          {signatures.ok && signatures.data.length ? signatures.data.map((signature) => (
            <article key={signature.id} className="rounded-2xl border border-white/10 bg-[#151515] p-4">
              <p className="font-black text-white">{signature.signed_entity_type} · {signature.status}</p>
              <p className="mt-1 text-sm text-stone-300">{new Date(signature.signed_at).toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}</p>
            </article>
          )) : <p className="rounded-2xl border border-white/10 bg-[#151515] p-5 text-stone-300">No hay firmas registradas.</p>}
        </section>
      </div>
    </main>
  );
}

function Empty({ text }: { text: string }) {
  return <main className="min-h-screen bg-[#0d0d0d] p-6 text-white">{text}</main>;
}
