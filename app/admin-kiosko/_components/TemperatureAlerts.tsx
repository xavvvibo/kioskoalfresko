import type { EquipmentAlert } from "@/lib/admin-kiosko/database";
import { updateEquipmentAlertStatusAction } from "../actions";

export function TemperatureAlerts({ alerts }: { alerts: EquipmentAlert[] }) {
  return (
    <section className="mt-6 rounded-[1.7rem] border border-[#d94b2b]/30 bg-[#d94b2b]/10 p-4">
      <h2 className="text-lg font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Seguimiento técnico</h2>
      {alerts.length ? (
        <div className="mt-4 grid gap-3">
          {alerts.map((alert) => (
            <article key={alert.id} className="rounded-[1.2rem] border border-white/10 bg-[#151515] p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-black text-white">{alert.equipment}</p>
                  <p className="mt-1 text-xs font-semibold text-stone-300">
                    {alert.alert_date}{alert.alert_time ? ` · ${alert.alert_time.slice(0, 5)}` : ""} · {alert.temperature ?? "-"} ºC
                  </p>
                  <p className="mt-2 text-sm leading-6 text-stone-300">{alert.description || "Seguimiento técnico pendiente."}</p>
                </div>
                <span className="w-fit rounded-full border border-[#d94b2b]/40 bg-[#d94b2b]/12 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">
                  {alert.alert_level} · {alert.status}
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <form action={updateEquipmentAlertStatusAction} className="grid gap-2">
                  <input type="hidden" name="id" value={alert.id} />
                  <input type="hidden" name="status" value="en_proceso" />
                  <input name="corrective_action" placeholder="Acción técnica / aviso" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-sm text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
                  <button type="submit" className="rounded-full border border-white/12 bg-white/10 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-white/16">
                    Marcar en proceso
                  </button>
                </form>
                <form action={updateEquipmentAlertStatusAction} className="grid gap-2">
                  <input type="hidden" name="id" value={alert.id} />
                  <input type="hidden" name="status" value="solventado" />
                  <input name="resolved_by" placeholder="Resuelto por" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-sm text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
                  <button type="submit" className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-stone-950">
                    Marcar solventado
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm leading-6 text-stone-300">No hay seguimientos técnicos abiertos.</p>
      )}
    </section>
  );
}
