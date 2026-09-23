import { siteConfig } from "@/content/site";
import { buildMetadata } from "@/lib/metadata";
import { ActionButton } from "@/components/ui/ActionButton";

export const metadata = buildMetadata({
  title: "Contacto y novedades | Kiosko Alfresko",
  description:
    "Contacto oficial de Kiosko Alfresko tras el cierre de temporada 2026. Sigue Instagram y WhatsApp para recibir novedades de la nueva apertura.",
  path: "/reservas-contacto",
});

export const dynamic = "force-dynamic";

export default function ReservasContactoPage() {
  return (
    <main className="bg-[#fffaf4]">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 md:py-24">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#566137]">Contacto y novedades</p>
        <h1 className="mt-3 text-4xl font-black uppercase tracking-[-0.04em] text-stone-950 md:text-5xl">
          Sigue la nueva apertura
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-stone-700">
          Kiosko Alfresko ha cerrado su temporada 2026. Instagram y WhatsApp son ahora los canales principales para recibir novedades.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="rounded-[1.75rem] border border-stone-950 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-stone-950">Novedades</h2>
            <p className="mt-4 text-sm leading-6 text-stone-700">
              Muy pronto podrás seguir disfrutando de la esencia de Kiosko Alfresko, de SMASH LAB y de muchas cosas ricas más en pleno centro de Granada.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ActionButton href={siteConfig.contact.instagramUrl} newTab analyticsEvent="click_instagram" analyticsPayload={{ location: "contacto_novedades" }}>
                Instagram
              </ActionButton>
              <ActionButton href={siteConfig.contact.whatsappUrl} kind="secondary" newTab analyticsEvent="click_whatsapp" analyticsPayload={{ location: "contacto_novedades" }}>WhatsApp</ActionButton>
            </div>
          </article>

          <article className="rounded-[1.75rem] border border-stone-950/10 bg-stone-950 p-6 text-white shadow-sm">
            <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Datos directos</h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-stone-300">
              <p>Teléfono: <a href={siteConfig.contact.phoneHref} className="font-semibold text-white">{siteConfig.contact.phoneDisplay}</a></p>
              <p>WhatsApp: <a href={siteConfig.contact.whatsappUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-white">{siteConfig.contact.whatsappDisplay}</a></p>
              <p>Email: <a href={siteConfig.contact.emailHref} className="font-semibold text-white">{siteConfig.contact.email}</a></p>
              <p>Instagram: <a href={siteConfig.contact.instagramUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-white">{siteConfig.contact.instagramHandle}</a></p>
            </div>
          </article>
        </div>

        <article className="mt-8 rounded-[1.75rem] border border-stone-950 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-stone-950">Temporada cerrada</h2>
          <p className="mt-4 text-sm leading-6 text-stone-700">
            {siteConfig.location.area}, {siteConfig.location.city}, {siteConfig.location.province}.{" "}
            {siteConfig.schedule.currentSummary}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ActionButton href="/carta" kind="secondary" analyticsEvent="click_ver_carta" analyticsPayload={{ location: "reservas_contacto_location" }}>
              Descubre SMASH LAB
            </ActionButton>
            <ActionButton href={siteConfig.contact.instagramUrl} kind="ghost" newTab analyticsEvent="click_instagram" analyticsPayload={{ location: "reservas_contacto_location" }}>
              Ver Instagram
            </ActionButton>
          </div>
        </article>
      </div>
    </main>
  );
}
