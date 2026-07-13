import type { StaffComplianceAlert } from "@/lib/admin-kiosko/repositories/staff-compliance.repository";

export function ComplianceAlerts({ alerts }: { alerts: StaffComplianceAlert[] }) {
  return (
    <section className="grid gap-3">
      {alerts.length ? alerts.map((alert) => (
        <article key={alert.id} className="rounded-2xl border border-white/10 bg-[#151515] p-4">
          <p className="font-black text-white">{alert.title} · {alert.severity}</p>
          <p className="mt-1 text-sm text-stone-300">{alert.description || alert.category}</p>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-[#f2c6bb]">{alert.status} · {alert.due_at ? new Date(alert.due_at).toLocaleDateString("es-ES") : "sin fecha"}</p>
        </article>
      )) : <p className="rounded-2xl border border-white/10 bg-[#151515] p-5 text-stone-300">Sin alertas de cumplimiento.</p>}
    </section>
  );
}
