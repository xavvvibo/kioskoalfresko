"use client";

import { useState } from "react";
import Image from "next/image";
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

const sizeStyles = {
  sm: {
    wrapper: "p-4 md:p-5",
    title: "text-[1.9rem] md:text-[2.4rem]",
    price: "text-[1.5rem] md:text-[2rem]",
    subtitle: "text-sm md:text-base",
    variants: "text-xs",
  },
  md: {
    wrapper: "p-5 md:p-6",
    title: "text-[2.2rem] md:text-[3rem]",
    price: "text-[1.9rem] md:text-[2.6rem]",
    subtitle: "text-base md:text-lg",
    variants: "text-sm",
  },
  lg: {
    wrapper: "p-6 md:p-8",
    title: "text-[2.9rem] md:text-[5.2rem]",
    price: "text-[1.9rem] md:text-[2.6rem]",
    subtitle: "text-base md:text-lg",
    variants: "text-sm",
  },
} as const;

const themeStyles = {
  dark: {
    wrapper:
      "border-white/10 bg-black text-white hover:shadow-[0_34px_82px_rgba(0,0,0,0.28)]",
    imageOverlay:
      "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.75) 100%)",
    claim: "text-[#f2c6bb]",
    title: "text-[#fff8ef]",
    subtitle: "text-white/85",
    price: "text-[#fff8ef]",
    variants: "text-[#f2c6bb]",
    pricePill: "border-[#f0d28f]/40 bg-[#f0d28f]/12",
  },
  red: {
    wrapper:
      "border-[#d94b2b]/40 bg-[#b9381c] text-white hover:shadow-[0_34px_82px_rgba(185,56,28,0.3)]",
    imageOverlay:
      "linear-gradient(180deg, rgba(80,18,8,0.28) 0%, rgba(50,10,5,0.62) 100%)",
    claim: "text-[#ffe0d7]",
    title: "text-[#fff8ef]",
    subtitle: "text-white/92",
    price: "text-[#fff8ef]",
    variants: "text-[#ffe0d7]",
    pricePill: "border-[#fff0d7]/35 bg-[#fff0d7]/10",
  },
} as const;

export function SmashPromoCTA({
  promo,
  size = "lg",
  theme = "dark",
  compact = false,
  primaryAction,
  secondaryAction,
}: SmashPromoCTAProps) {
  const resolvedSize = compact && size === "lg" ? "md" : size;
  const styles = sizeStyles[resolvedSize];
  const themeClass = themeStyles[theme];
  const showActions = !compact || primaryAction || secondaryAction;
  const [imageReady, setImageReady] = useState(false);

  return (
    <section className={\`group relative min-h-[420px] overflow-hidden rounded-[2.2rem] border shadow-[0_28px_70px_rgba(0,0,0,0.22)] transition duration-200 hover:-translate-y-0.5 \${themeClass.wrapper} \${styles.wrapper}\`}>
      
      {promo.image && (
        <Image
          src={promo.image.src}
          alt={promo.image.alt}
          fill
          priority={resolvedSize === "lg"}
          className="object-cover object-center"
          onLoad={() => setImageReady(true)}
          onError={() => setImageReady(false)}
        />
      )}

      {promo.image && imageReady && (
        <div
          className="absolute inset-0"
          style={{
            background: themeClass.imageOverlay,
          }}
        />
      )}

      <div className="relative z-10">
        <p className={\`text-[11px] font-black uppercase tracking-[0.22em] \${themeClass.claim}\`}>
          {promo.claim}
        </p>

        <h2 className={\`mt-3 font-black uppercase leading-[0.84] tracking-[-0.07em] \${themeClass.title} \${styles.title}\`}>
          {promo.title}
        </h2>

        <p className={\`mt-3 font-semibold \${themeClass.subtitle} \${styles.subtitle}\`}>
          {promo.subtitle}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className={\`rounded-full border px-4 py-2 font-black uppercase tracking-[-0.05em] \${themeClass.pricePill} \${themeClass.price} \${styles.price}\`}>
            {promo.price}
          </span>

          <span className={\`font-black uppercase tracking-[0.18em] \${themeClass.variants} \${styles.variants}\`}>
            {promo.variants.join(" · ")}
          </span>
        </div>

        {showActions && (
          <div className="mt-7 flex flex-wrap gap-3">
            {primaryAction ? (
              <ActionButton href={primaryAction.href}>
                {primaryAction.label}
              </ActionButton>
            ) : !compact ? (
              <ActionButton href="/reservas-contacto">Pedir ahora</ActionButton>
            ) : null}

            {secondaryAction ? (
              <ActionButton href={secondaryAction.href} kind="secondary">
                {secondaryAction.label}
              </ActionButton>
            ) : !compact ? (
              <ActionButton href="/ubicacion-ogijares" kind="secondary">
                Cómo llegar
              </ActionButton>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
