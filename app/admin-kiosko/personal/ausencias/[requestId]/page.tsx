import { notFound } from "next/navigation";
import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { getLeaveRequestById, listShiftAbsenceImpacts } from "@/lib/admin-kiosko/repositories/staff-leave.repository";
import { getStaffEmployeeById } from "@/lib/admin-kiosko/repositories/staff.repository";
import { AdminHeader } from "../../../_components/AdminHeader";
import { decideLeaveRequestAction } from "../actions";

export default async function LeaveRequestDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  await requireAdminPermission("staff:absence:read");
  const { requestId } = await params;
  const [request, impacts] = await Promise.all([getLeaveRequestById(requestId), listShiftAbsenceImpacts(requestId)]);
  if (!request.ok || !request.data) notFound();
  const employee = await getStaffEmployeeById(request.data.employee_id);
  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Solicitud de ausencia" description="Detalle, conflictos, saldo, turnos afectados e historial de resolución." />
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6">
        <article className="rounded-[1.6rem] border border-white/10 bg-[#151515] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">Solicitud</p>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-[-0.04em]">{employee.ok ? employee.data?.display_name : request.data.employee_id}</h2>
          <p className="mt-2 text-sm text-stone-300">{request.data.absence_type} · {request.data.status} · {request.data.requested_amount} {request.data.requested_unit}</p>
          <p className="mt-2 text-sm text-stone-300">{request.data.starts_at} - {request.data.ends_at}</p>
        </article>
        <section className="grid gap-3 md:grid-cols-2">
          {impacts.ok && impacts.data.length ? impacts.data.map((impact) => (
            <article key={impact.id} className="rounded-2xl border border-white/10 bg-[#151515] p-4">
              <p className="font-black text-white">Turno afectado</p>
              <p className="mt-1 text-sm text-stone-300">{impact.proposed_action} · {impact.resolution_status}</p>
            </article>
          )) : <p className="rounded-2xl border border-white/10 bg-[#151515] p-5 text-stone-300">Sin impactos de turno registrados.</p>}
        </section>
        <form action={decideLeaveRequestAction} className="grid gap-3 rounded-[1.6rem] border border-white/10 bg-[#151515] p-5">
          <input type="hidden" name="requestId" value={request.data.id} />
          <textarea name="comment" required placeholder="Comentario" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
          <div className="flex flex-wrap gap-2">
            <button name="decision" value="approve" className="rounded-full border border-emerald-400 bg-emerald-500 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-stone-950">Aprobar</button>
            <button name="decision" value="partially_approve" className="rounded-full border border-amber-300 bg-amber-300 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-stone-950">Aprobar parcial</button>
            <button name="decision" value="reject" className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white">Rechazar</button>
          </div>
        </form>
      </section>
    </main>
  );
}
