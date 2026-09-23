import { ActionButton } from "@/components/ui/ActionButton";
import { siteConfig } from "@/content/site";

export function StickyMobileActions() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-950 bg-[rgba(245,239,229,0.98)] p-3 shadow-[0_-14px_36px_rgba(0,0,0,0.18)] md:hidden">
      <div className="grid grid-cols-3 gap-2 rounded-[1.4rem] border border-stone-950/12 bg-white/70 p-2 shadow-[0_12px_24px_rgba(0,0,0,0.06)]">
        <ActionButton href="/carta" kind="secondary" analyticsEvent="click_ver_carta" analyticsPayload={{ location: "mobile_sticky" }}>SMASH LAB</ActionButton>
        <ActionButton href={siteConfig.contact.instagramUrl} newTab analyticsEvent="click_instagram" analyticsPayload={{ location: "mobile_sticky" }}>Instagram</ActionButton>
        <ActionButton href={siteConfig.contact.whatsappUrl} kind="ghost" newTab analyticsEvent="click_whatsapp" analyticsPayload={{ location: "mobile_sticky" }}>WhatsApp</ActionButton>
      </div>
    </div>
  );
}
