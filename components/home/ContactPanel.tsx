import { siteConfig } from "@/content/site";
import { ActionButton } from "@/components/ui/ActionButton";

export function ContactPanel() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <article className="rounded-[1.75rem] border border-stone-950 bg-white p-6">
        <h3 className="text-2xl font-black uppercase tracking-[-0.03em] text-stone-950">Llamas.</h3>
        <p className="mt-3 text-sm leading-6 text-stone-700">Para reservar, confirmar mesa o preguntar por el horario antes de venir. Teléfono directo: {siteConfig.contact.phoneDisplay}.</p>
        <div className="mt-5"><ActionButton href={siteConfig.contact.phoneHref} analyticsEvent="click_llamar" analyticsPayload={{ location: "contact_panel" }}>Llamar ahora</ActionButton></div>
      </article>
      <article className="rounded-[1.75rem] border border-stone-950 bg-[#d94b2b] p-6 text-white">
        <h3 className="text-2xl font-black uppercase tracking-[-0.03em]">Escribes.</h3>
        <p className="mt-3 text-sm leading-6 text-white/85">WhatsApp directo para venir sobre seguro, pedir ubicación o cerrar una reserva rápida. {siteConfig.contact.whatsappDisplay}.</p>
        <div className="mt-5"><ActionButton href={siteConfig.contact.whatsappUrl} kind="secondary" newTab analyticsEvent="click_whatsapp" analyticsPayload={{ location: "contact_panel" }}>WhatsApp ahora</ActionButton></div>
      </article>
      <article className="rounded-[1.75rem] border border-stone-950 bg-stone-950 p-6 text-white">
        <h3 className="text-2xl font-black uppercase tracking-[-0.03em]">Lo confirmas.</h3>
        <p className="mt-3 text-sm leading-6 text-stone-300">Instagram y correo para ver ambiente, novedades del día o resolver cualquier duda antes de llegar. {siteConfig.contact.email}.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <ActionButton href={siteConfig.contact.instagramUrl} kind="secondary" newTab analyticsEvent="click_instagram" analyticsPayload={{ location: "contact_panel" }}>Ver Instagram</ActionButton>
          <ActionButton href={siteConfig.contact.emailHref} kind="ghost">Email</ActionButton>
        </div>
      </article>
    </div>
  );
}
