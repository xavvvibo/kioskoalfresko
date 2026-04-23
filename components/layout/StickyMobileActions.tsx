import { siteConfig } from "@/content/site";
import { ActionButton } from "@/components/ui/ActionButton";

export function StickyMobileActions() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-950 bg-[rgba(245,239,229,0.98)] p-3 shadow-[0_-14px_36px_rgba(0,0,0,0.18)] md:hidden">
      <div className="grid grid-cols-3 gap-2 rounded-[1.4rem] border border-stone-950/12 bg-white/70 p-2 shadow-[0_12px_24px_rgba(0,0,0,0.06)]">
        <ActionButton href={siteConfig.ctas.call.href} kind="ghost">Llamar</ActionButton>
        <ActionButton href="/carta" kind="secondary">Carta</ActionButton>
        <ActionButton href="/ubicacion-ogijares">Ir ahora</ActionButton>
      </div>
    </div>
  );
}
