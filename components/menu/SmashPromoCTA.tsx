"use client";

import { useState } from "react";
import type { MenuPromo } from "@/types/site";
import { ActionButton } from "@/components/ui/ActionButton";

export function SmashPromoCTA({
  promo,
  size = "lg",
  theme = "dark",
  compact = false,
  primaryAction,
  secondaryAction,
}: {
  promo: MenuPromo;
  size?: "sm" | "md" | "lg";
  theme?: "dark" | "red";
  compact?: boolean;
  primaryAction?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
}) {
  const [imageReady, setImageReady] = useState(true);

  return (
    <section className="relative overflow-hidden rounded-[2.4rem] border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
      
      {promo.image && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: \`
              radial-gradient(circle at 70% 40%, rgba(255,120,40,0.35), transparent 60%),
              linear-gradient(270deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.8) 70%),
              url(\${promo.image.src})
            \`,
            backgroundSize: "115%",
            backgroundPosition: "70% center",
            filter: "contrast(1.1) saturate(1.1)",
          }}
        />
      )}

      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(transparent_0%,rgba(255,255,255,0.05)_48%,transparent_100%)]" />

      <div className="relative z-10 p-6 md:p-10 text-white max-w-[650px]">

        <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#f2c6bb]">
          {promo.claim}
        </p>

        <h2 className="mt-3 text-[3rem] md:text-[5rem] font-black uppercase leading-[0.85] tracking-[-0.06em] text-[#fff8ef]">
          {promo.title}
        </h2>

        <p className="mt-4 text-base md:text-lg font-semibold text-white/90">
          {promo.subtitle}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-[#f0d28f]/40 bg-[#f0d28f]/15 px-5 py-2 text-[1.8rem] font-black text-[#fff8ef]">
            {promo.price}
          </span>

          <span className="text-sm font-black uppercase tracking-[0.2em] text-[#f2c6bb]">
            {promo.variants.join(" · ")}
          </span>
        </div>

        <div className="mt-8 flex gap-3 flex-wrap">
          <ActionButton href={primaryAction?.href || "/reservas-contacto"}>
            {primaryAction?.label || "Pedir ahora"}
          </ActionButton>

          <ActionButton href={secondaryAction?.href || "/ubicacion-ogijares"} kind="secondary">
            {secondaryAction?.label || "Cómo llegar"}
          </ActionButton>
        </div>
      </div>
    </section>
  );
}
