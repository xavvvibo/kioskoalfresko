"use client";

import type { MenuPromo } from "@/types/site";
import { ActionButton } from "@/components/ui/ActionButton";

type SmashPromoCTAProps = {
  promo: MenuPromo;
  size?: "sm" | "md" | "lg";
  theme?: "dark" | "red";
  compact?: boolean;
  primaryAction?: {
    label: "Ver carta" | "Pedir ahora";
    href: string;
  };
  secondaryAction?: {
    label: string;
    href: string;
  };
};

export function SmashPromoCTA({
  promo,
  primaryAction,
  secondaryAction,
}: SmashPromoCTAProps) {
  return (
    <section
      className="group relative overflow-hidden rounded-[2.2rem] border border-white/10 bg-black text-white shadow-[0_28px_70px_rgba(0,0,0,0.22)]"
      style={{
        backgroundImage: promo.image?.src
          ? `linear-gradient(90deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.75) 45%, rgba(0,0,0,0.2) 100%), url(${promo.image.src})`
          : undefined,
        backgroundSize: "cover",
        backgroundPosition: "75% center",
      }}
    >
      <div className="relative z-10 p-6 md:p-10 max-w-[680px]">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#f2c6bb]">
          {promo.claim}
        </p>

        <h2 className="mt-3 font-black uppercase leading-[0.9] tracking-[-0.05em] text-[2.8rem] md:text-[5rem]">
          {promo.title}
        </h2>

        <p className="mt-3 text-white/85 font-semibold">
          {promo.subtitle}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-[#f0d28f]/40 bg-[#f0d28f]/12 px-4 py-2 text-[1.8rem] font-black">
            {promo.price}
          </span>

          <span className="text-sm font-black uppercase tracking-[0.18em] text-[#f2c6bb]">
            {promo.variants.join(" · ")}
          </span>
        </div>

        <div className="mt-7 flex gap-3">
          {primaryAction && (
            <ActionButton href={primaryAction.href}>
              {primaryAction.label}
            </ActionButton>
          )}

          {secondaryAction && (
            <ActionButton href={secondaryAction.href} kind="secondary">
              {secondaryAction.label}
            </ActionButton>
          )}
        </div>
      </div>
    </section>
  );
}
