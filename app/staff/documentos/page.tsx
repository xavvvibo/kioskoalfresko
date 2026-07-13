import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getStaffEmployeeByAuthUserId } from "@/lib/admin-kiosko/repositories/staff.repository";
import { listStaffDocuments } from "@/lib/admin-kiosko/repositories/staff-records.repository";
import { staffDownloadDocumentAction } from "../actions";

export default async function StaffDocumentsPage() {
  const session = await requireAdminSession("/staff/documentos");
  if (!session.id) return <Empty text="Accede con un usuario nominal vinculado a empleado." />;
  const employee = await getStaffEmployeeByAuthUserId(session.id);
  if (!employee.ok || !employee.data) return <Empty text={employee.ok ? "No hay empleado vinculado." : employee.error} />;
  const documents = await listStaffDocuments(employee.data.id, false);

  return (
    <main className="min-h-screen bg-[#0d0d0d] px-4 py-6 text-white">
      <div className="mx-auto grid max-w-4xl gap-5">
        <Link href="/staff" className="text-sm font-bold text-[#f2c6bb]">Volver</Link>
        <h1 className="text-4xl font-black uppercase tracking-[-0.05em]">Mis documentos</h1>
        <section className="grid gap-3">
          {documents.ok && documents.data.length ? documents.data.map((document) => (
            <form key={document.id} action={staffDownloadDocumentAction} className="rounded-2xl border border-white/10 bg-[#151515] p-4">
              <input type="hidden" name="documentId" value={document.id} />
              <p className="font-black text-white">{document.visible_name}</p>
              <p className="mt-1 text-sm text-stone-300">{document.category} · v{document.version} · firma {document.signature_status}</p>
              <button className="mt-3 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white">Descargar</button>
            </form>
          )) : <p className="rounded-2xl border border-white/10 bg-[#151515] p-5 text-stone-300">No hay documentos visibles.</p>}
        </section>
      </div>
    </main>
  );
}

function Empty({ text }: { text: string }) {
  return <main className="min-h-screen bg-[#0d0d0d] p-6 text-white">{text}</main>;
}
