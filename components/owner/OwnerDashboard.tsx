import { ownerSections, seasonalSchedule, siteConfig } from "@/content/site";

export function OwnerDashboard() {
  return (
    <main className="min-h-screen bg-stone-100">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="rounded-3xl border border-amber-300 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          Protección preparada para producción. Aquí falta conectar auth real y control de permisos antes de publicar.
        </div>
        <div className="mt-6 rounded-[2rem] border border-stone-950 bg-white p-8 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#d94b2b]">Owner dashboard</p>
          <h1 className="mt-3 text-4xl font-black uppercase tracking-[-0.04em] text-stone-950">Centro de control Kiosko Alfresko</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-stone-700">
            Base preparada para gestionar horarios actuales, datos de contacto, CTAs, home, landings SEO, carta y estados pendientes.
          </p>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <section className="rounded-[1.8rem] border border-stone-950 bg-stone-950 p-6 text-white shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#efb7a8]">Horario actual</p>
            <h2 className="mt-3 text-2xl font-black uppercase leading-tight tracking-[-0.03em]">Lunes y martes descanso</h2>
            <p className="mt-3 text-sm leading-6 text-stone-300">Miércoles, jueves y domingo de 20:00h a 24:00h.</p>
          </section>
          <section className="rounded-[1.8rem] border border-stone-950 bg-[#d94b2b] p-6 text-white shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/80">Viernes y sábado</p>
            <h2 className="mt-3 text-2xl font-black uppercase leading-tight tracking-[-0.03em]">21:00h a 01:00h</h2>
            <p className="mt-3 text-sm leading-6 text-white/85">Noches ALFRESKO con terraza, tapas y smash burgers.</p>
          </section>
          <section className="rounded-[1.8rem] border border-stone-950 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#d94b2b]">Domingo</p>
            <h2 className="mt-3 text-2xl font-black uppercase leading-tight tracking-[-0.03em] text-stone-950">20:00h a 24:00h</h2>
            <p className="mt-3 text-sm leading-6 text-stone-700">Horario publicado en contenido, home, horarios, reservas y SEO.</p>
          </section>
        </div>
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {ownerSections.map((section) => (
            <section key={section.title} className="rounded-3xl border border-stone-950 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black uppercase tracking-[-0.03em] text-stone-950">{section.title}</h2>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-stone-700">
                {section.items.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </section>
          ))}
        </div>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <section className="rounded-3xl border border-stone-950 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black uppercase tracking-[-0.03em] text-stone-950">Horarios estacionales</h2>
            <div className="mt-4 space-y-3 text-sm text-stone-700">
              {seasonalSchedule.map((item) => (
                <div key={item.month} className="rounded-2xl bg-stone-50 p-3">
                  <div className="font-black uppercase tracking-[0.04em] text-stone-900">{item.month}</div>
                  <div>{item.summary}</div>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-3xl border border-stone-950 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black uppercase tracking-[-0.03em] text-stone-950">CTAs activos</h2>
            <div className="mt-4 space-y-3 text-sm text-stone-700">
              <div className="rounded-2xl bg-stone-50 p-3">Principal: {siteConfig.ctas.primary.label}</div>
              <div className="rounded-2xl bg-stone-50 p-3">Secundario: {siteConfig.ctas.secondary.label}</div>
              <div className="rounded-2xl bg-stone-50 p-3">Móvil: {siteConfig.ctas.call.label}</div>
            </div>
          </section>
          <section className="rounded-3xl border border-stone-950 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black uppercase tracking-[-0.03em] text-stone-950">Estados pendientes</h2>
            <div className="mt-4 space-y-3 text-sm text-stone-700">
              <div className="rounded-2xl bg-stone-50 p-3">Qamarero pendiente de credenciales reales</div>
              <div className="rounded-2xl bg-stone-50 p-3">Teléfono, email y Maps pendientes</div>
              <div className="rounded-2xl bg-stone-50 p-3">Carta final pendiente</div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
