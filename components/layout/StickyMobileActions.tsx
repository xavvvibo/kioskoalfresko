import { siteConfig } from "@/content/site";
import { ActionButton } from "@/components/ui/ActionButton";
import { getQamareroReservationUrl } from "@/lib/integrations/qamarero";

export function StickyMobileActions() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-950 bg-[rgba(245,239,229,0.98)] p-3 shadow-[0_-14px_36px_rgba(0,0,0,0.18)] md:hidden">
      <div className="grid grid-cols-3 gap-2 rounded-[1.4rem] border border-stone-950/12 bg-white/70 p-2 shadow-[0_12px_24px_rgba(0,0,0,0.06)]">
        <ActionButton href={getQamareroReservationUrl("mobile_sticky")} newTab analyticsEvent="click_reserva_qamarero" analyticsPayload={{ location: "mobile_sticky" }}>Reservar</ActionButton>
        <ActionButton href="/carta" kind="secondary" analyticsEvent="click_ver_carta" analyticsPayload={{ location: "mobile_sticky" }}>Carta</ActionButton>
        <ActionButton href={siteConfig.location.mapsUrl} kind="ghost" newTab analyticsEvent="click_como_llegar" analyticsPayload={{ location: "mobile_sticky" }}>Llegar</ActionButton>
      </div>
    </div>
  );
}
