import { siteConfig } from "@/content/site";
import { buildMetadata } from "@/lib/metadata";
import { ActionButton } from "@/components/ui/ActionButton";

export const metadata = buildMetadata({
  title: "Horarios de Kiosko Alfresko | Ogíjares",
  description: "Horario actual de Kiosko Alfresko en Ogíjares: lunes cerrado; martes, miércoles, jueves y domingo de 21:00h a 24:00h; viernes y sábado de 21:00h a 01:30h.",
  path: "/horarios",
});

export default function HorariosPage() {
  return (
    <main className="bg-[#f5efe5]">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 md:py-24">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#d94b2b]">Horarios</p>
        <h1 className="mt-3 text-4xl font-black uppercase tracking-[-0.04em] text-stone-950 md:text-5xl">
          Horario actual de Kiosko Alfresko
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-stone-700">
          {siteConfig.schedule.currentSummary}
        </p>

        <section className="mt-8 rounded-[2rem] border border-stone-950 bg-white p-6 shadow-sm">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#d94b2b]">Horario oficial</p>
          <h2 className="mt-3 text-2xl font-black uppercase tracking-[-0.03em] text-stone-950">
            SMASH LAB, terraza, delivery y recogida
          </h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {siteConfig.schedule.rows.map((item) => (
              <article key={item.day} className="rounded-[1.35rem] border border-stone-950/10 bg-[#f8f1e7] p-4">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-lg font-black uppercase tracking-[-0.03em] text-stone-950">{item.day}</h3>
                  <p className="text-lg font-black text-[#d94b2b]">{item.hours}</p>
                </div>
              </article>
            ))}
          </div>
          <p className="mt-5 text-sm leading-6 text-stone-700">{siteConfig.schedule.note}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ActionButton href={siteConfig.ctas.booking.href} newTab analyticsEvent="click_reserva_qamarero" analyticsPayload={{ location: "horarios" }}>
              Reservar mesa
            </ActionButton>
            <ActionButton href="/carta" kind="secondary" analyticsEvent="click_ver_carta" analyticsPayload={{ location: "horarios" }}>
              Ver carta
            </ActionButton>
            <ActionButton href={siteConfig.contact.instagramUrl} kind="ghost" newTab analyticsEvent="click_instagram" analyticsPayload={{ location: "horarios" }}>
              Ver Instagram
            </ActionButton>
          </div>
        </section>
      </div>
    </main>
  );
}
