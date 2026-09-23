import { siteConfig } from "@/content/site";
import { ActionButton } from "@/components/ui/ActionButton";

export function ContactPanel() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <article className="rounded-[1.75rem] border border-stone-950/90 bg-white p-6">
        <h3 className="text-2xl font-black tracking-[-0.03em] text-stone-950">Teléfono</h3>
        <p className="mt-3 text-sm leading-6 text-stone-700">Contacto directo de Kiosko Alfresko: {siteConfig.contact.phoneDisplay}.</p>
        <div className="mt-5"><ActionButton href={siteConfig.contact.phoneHref} analyticsEvent="click_llamar" analyticsPayload={{ location: "contact_panel" }}>Llamar</ActionButton></div>
      </article>
      <article className="rounded-[1.75rem] border border-stone-950/10 bg-[#566137] p-6 text-white">
        <h3 className="text-2xl font-black tracking-[-0.03em]">WhatsApp</h3>
        <p className="mt-3 text-sm leading-6 text-white/85">Escribenos para recibir novedades de la nueva apertura. {siteConfig.contact.whatsappDisplay}.</p>
        <div className="mt-5"><ActionButton href={siteConfig.contact.whatsappUrl} kind="secondary" newTab analyticsEvent="click_whatsapp" analyticsPayload={{ location: "contact_panel" }}>Recibir novedades</ActionButton></div>
      </article>
      <article className="rounded-[1.75rem] border border-stone-950/90 bg-stone-950 p-6 text-white">
        <h3 className="text-2xl font-black tracking-[-0.03em]">Instagram y correo</h3>
        <p className="mt-3 text-sm leading-6 text-stone-300">El primer sitio donde contaremos lo que viene. {siteConfig.contact.email}.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <ActionButton href={siteConfig.contact.instagramUrl} kind="secondary" newTab analyticsEvent="click_instagram" analyticsPayload={{ location: "contact_panel" }}>Ver Instagram</ActionButton>
          <ActionButton href={siteConfig.contact.emailHref} kind="ghost">Email</ActionButton>
        </div>
      </article>
    </div>
  );
}
