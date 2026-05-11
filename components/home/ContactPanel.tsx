import { siteConfig } from "@/content/site";
import { ActionButton } from "@/components/ui/ActionButton";

export function ContactPanel() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <article className="rounded-[1.75rem] border border-stone-950 bg-white p-6">
        <h3 className="text-2xl font-black uppercase tracking-[-0.03em] text-stone-950">Llamas.</h3>
        <p className="mt-3 text-sm leading-6 text-stone-700">Si quieres resolverlo rápido antes de salir. Teléfono directo: {siteConfig.contact.phoneDisplay}.</p>
        <div className="mt-5"><ActionButton href={siteConfig.contact.phoneHref} analyticsEvent="click_llamar" analyticsPayload={{ location: "contact_panel" }}>Llamar ahora</ActionButton></div>
      </article>
      <article className="rounded-[1.75rem] border border-stone-950 bg-[#d94b2b] p-6 text-white">
        <h3 className="text-2xl font-black uppercase tracking-[-0.03em]">Escribes.</h3>
        <p className="mt-3 text-sm leading-6 text-white/85">WhatsApp directo para preguntar rápido o confirmar antes de venir. {siteConfig.contact.whatsappDisplay}.</p>
        <div className="mt-5"><ActionButton href={siteConfig.contact.whatsappUrl} kind="secondary" newTab analyticsEvent="click_whatsapp" analyticsPayload={{ location: "contact_panel" }}>WhatsApp ahora</ActionButton></div>
      </article>
      <article className="rounded-[1.75rem] border border-stone-950 bg-stone-950 p-6 text-white">
        <h3 className="text-2xl font-black uppercase tracking-[-0.03em]">Lo confirmas.</h3>
        <p className="mt-3 text-sm leading-6 text-stone-300">Instagram y correo para estado real del sábado, clima o dudas generales. {siteConfig.contact.email}.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <ActionButton href={siteConfig.contact.instagramUrl} kind="secondary" newTab analyticsEvent="click_instagram" analyticsPayload={{ location: "contact_panel" }}>Instagram en directo</ActionButton>
          <ActionButton href={siteConfig.contact.emailHref} kind="ghost">Email</ActionButton>
        </div>
      </article>
    </div>
  );
}
