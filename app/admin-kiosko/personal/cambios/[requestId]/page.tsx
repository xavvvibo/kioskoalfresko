import Link from "next/link";
import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { getShiftChangeRequestById, listShiftChangeParticipants } from "@/lib/admin-kiosko/repositories/staff-shift-change.repository";
import { AdminHeader } from "../../../_components/AdminHeader";

export default async function ShiftChangeDetailPage({ params }: { params: Promise<{ requestId: string }> }) {
  await requireAdminPermission("staff:shift-change:read");
  const { requestId } = await params;
  const [request, participants] = await Promise.all([getShiftChangeRequestById(requestId), listShiftChangeParticipants(requestId)]);
  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Detalle de cambio" description="Historial, participantes y trazabilidad de la solicitud." />
      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link href="/admin-kiosko/personal/cambios" className="text-sm font-bold text-[#f2c6bb]">Volver</Link>
        {request.ok && request.data ? (
          <article className="mt-4 rounded-2xl border border-white/10 bg-[#151515] p-5">
            <p className="font-black text-white">{request.data.request_type} · {request.data.status}</p>
            <p className="mt-2 text-sm text-stone-300">{request.data.reason}</p>
            <pre className="mt-4 overflow-auto rounded-2xl bg-black/30 p-3 text-xs text-stone-300">{JSON.stringify(request.data.history, null, 2)}</pre>
          </article>
        ) : <p className="mt-4 text-stone-300">Solicitud no encontrada.</p>}
        <section className="mt-4 grid gap-3">
          {(participants.ok ? participants.data : []).map((participant) => (
            <article key={participant.id} className="rounded-2xl border border-white/10 bg-[#151515] p-4">
              <p className="font-black text-white">{participant.role} · {participant.response || "sin respuesta"}</p>
              <p className="text-sm text-stone-300">{participant.employee_id}</p>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
