import { DeliveryPanel } from "@/components/home/DeliveryPanel";
import { siteConfig } from "@/content/site";
import { getQamareroReservationUrl, getReservationEntryPoint } from "@/lib/integrations/qamarero";
import { buildMetadata } from "@/lib/metadata";
import { ActionButton } from "@/components/ui/ActionButton";

export const metadata = buildMetadata({
  title: "Reservas, pedidos y contacto | Kiosko Alfresko Ogíjares",
  description:
    "Reserva mesa en Qamarero o pide Kiosko Alfresko para recoger. SMASH LAB by Alfresko, delivery, WhatsApp, teléfono e Instagram oficial.",
  path: "/reservas-contacto",
});

export default function ReservasContactoPage() {
  const reservation = getReservationEntryPoint("contact_page");

  return (
    <main className="bg-[#fffaf4]">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 md:py-24">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#d94b2b]">Reservas y contacto</p>
        <h1 className="mt-3 text-4xl font-black uppercase tracking-[-0.04em] text-stone-950 md:text-5xl">
          Reserva mesa o pide para recoger
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-stone-700">
          Qamarero es el sistema oficial de reservas. WhatsApp y teléfono son para pedidos de recogida y contacto directo.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="rounded-[1.75rem] border border-stone-950 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-stone-950">Reservas</h2>
            <p className="mt-4 text-sm leading-6 text-stone-700">
              Reserva tu mesa en Kiosko Alfresko mediante Qamarero. No usamos WhatsApp, Glovo ni Uber Eats para reservas.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ActionButton href={getQamareroReservationUrl("contact_page")} newTab analyticsEvent="click_reserva_qamarero" analyticsPayload={{ location: "reservas_contacto" }}>
                Reserva en Qamarero
              </ActionButton>
              <ActionButton href="/horarios" kind="secondary">Ver horarios</ActionButton>
            </div>
          </article>

          <article className="rounded-[1.75rem] border border-stone-950/10 bg-stone-950 p-6 text-white shadow-sm">
            <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Datos directos</h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-stone-300">
              <p>Teléfono: <a href={siteConfig.contact.phoneHref} className="font-semibold text-white">{siteConfig.contact.phoneDisplay}</a></p>
              <p>WhatsApp: <a href={siteConfig.contact.orderWhatsappUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-white">{siteConfig.contact.whatsappDisplay}</a></p>
              <p>Email: <a href={siteConfig.contact.emailHref} className="font-semibold text-white">{siteConfig.contact.email}</a></p>
              <p>Instagram: <a href={siteConfig.contact.instagramUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-white">{siteConfig.contact.instagramHandle}</a></p>
            </div>
          </article>
        </div>

        <section className="mt-8">
          <DeliveryPanel compact />
        </section>

        <article className="mt-8 rounded-[1.75rem] border border-stone-950 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-stone-950">Estamos en el parque</h2>
          <p className="mt-4 text-sm leading-6 text-stone-700">
            {siteConfig.location.area}, {siteConfig.location.city}, {siteConfig.location.province}. {siteConfig.schedule.currentSummary}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ActionButton href={siteConfig.location.mapsUrl} newTab analyticsEvent="click_como_llegar" analyticsPayload={{ location: "reservas_contacto_location" }}>
              Llegar ahora
            </ActionButton>
            <ActionButton href="/carta" kind="secondary" analyticsEvent="click_ver_carta" analyticsPayload={{ location: "reservas_contacto_location" }}>
              Ver carta
            </ActionButton>
            <ActionButton href={siteConfig.contact.instagramUrl} kind="ghost" newTab analyticsEvent="click_instagram" analyticsPayload={{ location: "reservas_contacto_location" }}>
              Ver Instagram
            </ActionButton>
          </div>
        </article>

        {reservation.url ? (
          <article className="mt-8 rounded-[1.75rem] border border-stone-950/10 bg-[#f8f1e7] p-6">
            <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-stone-950">Reserva online</h2>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-stone-700">
              Abre Qamarero para gestionar la reserva. Los pedidos para recoger se hacen por teléfono o WhatsApp.
            </p>
            <div className="mt-6">
              <ActionButton href={reservation.url} newTab analyticsEvent="click_reserva_qamarero" analyticsPayload={{ location: "reservas_contacto_online" }}>
                Abrir reservas online
              </ActionButton>
            </div>
          </article>
        ) : null}
      </div>
    </main>
  );
}
