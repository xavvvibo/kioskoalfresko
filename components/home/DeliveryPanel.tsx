import { siteConfig } from "@/content/site";
import { ActionButton } from "@/components/ui/ActionButton";

function deliveryHref(value: string, key: string) {
  return value || `[PENDIENTE_${key}]`;
}

export function DeliveryPanel({ compact = false }: { compact?: boolean }) {
  const cards = [
    {
      title: "Glovo",
      body: siteConfig.delivery.glovoUrl ? "Pide Kiosko Alfresko en Glovo." : "URL oficial pendiente de configurar.",
      label: "Pedir en Glovo",
      href: deliveryHref(siteConfig.delivery.glovoUrl, "GLOVO_URL"),
      analyticsEvent: "click_glovo",
      ariaLabel: "Pedir Kiosko Alfresko en Glovo",
    },
    {
      title: "Uber Eats",
      body: siteConfig.delivery.uberEatsUrl ? "Pide Kiosko Alfresko en Uber Eats." : "URL oficial pendiente de configurar.",
      label: "Pedir en Uber Eats",
      href: deliveryHref(siteConfig.delivery.uberEatsUrl, "UBEREATS_URL"),
      analyticsEvent: "click_ubereats",
      ariaLabel: "Pedir Kiosko Alfresko en Uber Eats",
    },
    {
      title: "WhatsApp para recoger",
      body: `Pedido directo al ${siteConfig.contact.whatsappDisplay}.`,
      label: "Pedir por WhatsApp",
      href: siteConfig.contact.orderWhatsappUrl,
      analyticsEvent: "click_whatsapp_pedido",
      newTab: true,
      ariaLabel: "Pedir por WhatsApp para recoger en Kiosko Alfresko",
    },
    {
      title: "Llamar y recoger",
      body: "Llama, encarga y pasa a recoger por el local.",
      label: "Llamar para recoger",
      href: siteConfig.contact.phoneHref,
      analyticsEvent: "click_llamar_recoger",
      ariaLabel: "Llamar a Kiosko Alfresko para pedir y recoger",
    },
  ];

  return (
    <section id="pide-alfresko" className={`rounded-[2rem] border border-stone-950 bg-stone-950 text-white shadow-[0_28px_80px_rgba(0,0,0,0.2)] ${compact ? "p-5" : "p-6 md:p-8"}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#f2c6bb]">Delivery y recogida</p>
          <h2 className="mt-3 text-[2.5rem] font-black uppercase leading-[0.88] tracking-[-0.055em] text-[#fff8ef] md:text-[4rem]">
            Pide Alfresko
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-300 md:text-base">
            Delivery, WhatsApp para recoger, llamada directa e Instagram oficial. Las reservas siguen siendo solo por Qamarero.
          </p>
        </div>
        <ActionButton href={siteConfig.ctas.booking.href} kind="secondary" newTab analyticsEvent="click_reserva_qamarero" analyticsPayload={{ location: "delivery_panel" }}>
          Reserva en Qamarero
        </ActionButton>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <article key={card.title} className="rounded-[1.35rem] border border-white/12 bg-white/6 p-4">
            <h3 className="text-lg font-black uppercase tracking-[-0.03em] text-white">{card.title}</h3>
            <p className="mt-2 min-h-12 text-sm leading-5 text-stone-300">{card.body}</p>
            <div className="mt-4">
              <ActionButton
                href={card.href}
                kind={card.href.includes("[PENDIENTE_") ? "ghost" : "secondary"}
                newTab={card.newTab ?? card.href.startsWith("http")}
                analyticsEvent={card.analyticsEvent}
                analyticsPayload={{ location: "delivery_panel" }}
                ariaLabel={card.ariaLabel}
              >
                {card.label}
              </ActionButton>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/10 pt-5">
        <span className="text-sm font-semibold text-stone-300">También en Instagram:</span>
        <ActionButton href={siteConfig.contact.instagramUrl} kind="ghost" newTab analyticsEvent="click_instagram" analyticsPayload={{ location: "delivery_panel" }}>
          Ver Instagram
        </ActionButton>
      </div>
    </section>
  );
}
