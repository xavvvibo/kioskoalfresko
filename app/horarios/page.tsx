import { maySalesFocus, maySchedule, maySpecialEvents, seasonalSchedule, siteConfig } from "@/content/site";
import { buildMetadata } from "@/lib/metadata";
import { ActionButton } from "@/components/ui/ActionButton";
import { CorpusClosureNotice } from "@/components/marketing/CorpusClosureNotice";

export const metadata = buildMetadata({
  title: "Horarios de Kiosko Alfresko | Ogíjares",
  description: "Horario actual de Kiosko Alfresko en Ogíjares: lunes y martes descanso; miércoles, jueves y domingo de 20:00h a 24:00h; viernes y sábado de 21:00h a 01:00h.",
  path: "/horarios",
});

export default function HorariosPage() {
  return (
    <main className="bg-[#f5efe5]">
      <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 md:py-28">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#d94b2b]">Horarios</p>
        <h1 className="mt-3 text-4xl font-black uppercase tracking-[-0.04em] text-stone-950 md:text-5xl">Horario actual de Kiosko Alfresko</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-stone-700">Lunes y martes descanso. Miércoles y jueves de 20:00h a 24:00h. Viernes y sábado de 21:00h a 01:00h. Domingo de 20:00h a 24:00h.</p>
        <div className="mt-8">
          <CorpusClosureNotice />
        </div>
        <div className="mt-8 rounded-[2rem] border border-stone-950 bg-white p-6 shadow-sm">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#d94b2b]">Horario de verano</p>
          <p className="mt-2 text-sm text-stone-700">Horario actual para terraza, tapas, smash burgers y noches al fresko en Ogíjares.</p>
          <h2 className="text-2xl font-black leading-tight tracking-[-0.03em] text-stone-950">{siteConfig.schedule.currentSummary}</h2>
          <p className="mt-4 text-lg font-semibold tracking-[-0.02em] text-stone-950">{maySchedule.normalHours}</p>
          <p className="mt-4 inline-flex rounded-full border border-[#d94b2b] bg-[#d94b2b] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white">
            {maySchedule.weekendNotice}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {maySalesFocus.microcopy.map((item) => (
              <span key={item} className="rounded-full border border-stone-950/10 bg-[#f8f1e7] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-stone-950">
                {item}
              </span>
            ))}
          </div>
          <p className="mt-3 text-sm leading-6 text-stone-700">{siteConfig.schedule.note}</p>
          <p className="mt-4 text-sm text-stone-700">Ya puedes reservar tus noches ALFRESKO.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ActionButton href={siteConfig.ctas.booking.href} newTab analyticsEvent="click_reserva_qamarero" analyticsPayload={{ location: "horarios_main" }}>Reservar mesa</ActionButton>
            <ActionButton href={siteConfig.location.mapsUrl} kind="secondary" newTab>Cómo llegar</ActionButton>
          </div>
        </div>
        <div className="mt-8 rounded-[2rem] border border-stone-950 bg-stone-950 p-6 text-white shadow-[0_24px_60px_rgba(0,0,0,0.16)]">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f2c6bb]">Horario confirmado</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {maySpecialEvents.map((item) => (
              <article key={item.date} className="rounded-[1.6rem] border border-white/12 bg-white/6 p-5">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#f2c6bb]">{item.date}</p>
                <h2 className="mt-3 text-2xl font-black tracking-[-0.03em] text-[#fff8ef]">{item.title}</h2>
                <p className="mt-4 text-lg font-semibold tracking-[-0.02em] text-white">{item.hours}</p>
                {item.note ? <p className="mt-3 text-sm leading-6 text-stone-300">{item.note}</p> : null}
              </article>
            ))}
            <article className="rounded-[1.6rem] border border-white/12 bg-white/6 p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#f2c6bb]">Instagram</p>
              <h2 className="mt-3 text-2xl font-black tracking-[-0.03em] text-[#fff8ef]">Ambiente en directo</h2>
              <p className="mt-3 text-sm leading-6 text-stone-300">Síguenos para ver el ambiente de terraza y las noches ALFRESKO de esta temporada.</p>
              <div className="mt-5">
                <ActionButton href={siteConfig.contact.instagramUrl} kind="secondary" newTab>Ver Instagram ahora</ActionButton>
              </div>
            </article>
          </div>
        </div>
        <div className="mt-8 rounded-[2rem] border border-stone-950/12 bg-stone-100 p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-stone-500">Horario por meses</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {seasonalSchedule
              .map((item) => (
                <article key={item.month} className="rounded-[1.7rem] border border-stone-950/10 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-black uppercase tracking-[-0.03em] text-stone-950">{item.month}</h2>
                  <p className="mt-3 text-sm font-semibold text-stone-900">{item.summary}</p>
                  <p className="mt-2 text-sm leading-6 text-stone-700">{item.note}</p>
                </article>
              ))}
          </div>
        </div>
      </div>
    </main>
  );
}
