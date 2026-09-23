import { siteConfig } from "@/content/site";
import { buildMetadata } from "@/lib/metadata";
import { ActionButton } from "@/components/ui/ActionButton";

export const metadata = buildMetadata({
  title: "Temporada 2026 cerrada | Kiosko Alfresko",
  description: "Kiosko Alfresko ha cerrado su temporada 2026. Sigue Instagram y WhatsApp para recibir novedades de la nueva apertura en Granada.",
  path: "/horarios",
});

export const dynamic = "force-dynamic";

export default function HorariosPage() {
  return (
    <main className="bg-[#f5efe5]">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 md:py-24">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#566137]">Temporada 2026</p>
        <h1 className="mt-3 text-4xl font-black uppercase tracking-[-0.04em] text-stone-950 md:text-5xl">
          Kiosko Alfresko ha cerrado su temporada
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-stone-700">
          {siteConfig.schedule.currentSummary}
        </p>

        <section className="mt-8 rounded-[2rem] border border-stone-950 bg-white p-6 shadow-sm">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#566137]">Estado actual</p>
          <h2 className="mt-3 text-2xl font-black uppercase tracking-[-0.03em] text-stone-950">
            La historia continúa
          </h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {siteConfig.schedule.rows.map((item) => (
              <article key={item.day} className="rounded-[1.35rem] border border-stone-950/10 bg-[#f8f1e7] p-4">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-lg font-black uppercase tracking-[-0.03em] text-stone-950">{item.day}</h3>
                  <p className="text-lg font-black text-[#566137]">{item.hours}</p>
                </div>
              </article>
            ))}
          </div>
          <p className="mt-5 text-sm leading-6 text-stone-700">{siteConfig.schedule.note}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ActionButton href={siteConfig.contact.instagramUrl} newTab analyticsEvent="click_instagram" analyticsPayload={{ location: "horarios" }}>
              Instagram
            </ActionButton>
            <ActionButton href={siteConfig.contact.whatsappUrl} kind="secondary" newTab analyticsEvent="click_whatsapp" analyticsPayload={{ location: "horarios" }}>
              WhatsApp
            </ActionButton>
            <ActionButton href="/carta" kind="ghost" analyticsEvent="click_ver_carta" analyticsPayload={{ location: "horarios" }}>
              Descubre SMASH LAB
            </ActionButton>
          </div>
        </section>
      </div>
    </main>
  );
}
