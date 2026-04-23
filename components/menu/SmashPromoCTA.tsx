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
      "border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(217,75,43,0.38),transparent_18%),linear-gradient(180deg,#0a0a0a_0%,#171717_100%)] text-white hover:shadow-[0_34px_82px_rgba(0,0,0,0.28)]",
    imageOverlay:
      "linear-gradient(270deg, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.75) 78%)",
    claim: "text-[#f2c6bb]",
    title: "text-[#fff8ef]",
    subtitle: "text-white/85",
    price: "text-[#fff8ef]",
    variants: "text-[#f2c6bb]",
    pricePill: "border-[#f0d28f]/40 bg-[#f0d28f]/12",
  },
  red: {
    wrapper:
      "border-[#d94b2b]/40 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_18%),linear-gradient(180deg,#d94b2b_0%,#b9381c_100%)] text-white hover:shadow-[0_34px_82px_rgba(185,56,28,0.3)]",
    imageOverlay:
      "linear-gradient(270deg, rgba(0,0,0,0.08) 0%, rgba(99,22,10,0.68) 78%)",
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
    <section className={`group relative overflow-hidden rounded-[2.2rem] border shadow-[0_28px_70px_rgba(0,0,0,0.22)] transition duration-200 hover:-translate-y-0.5 ${themeClass.wrapper} ${styles.wrapper}`}>
      <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(transparent_0%,rgba(255,255,255,0.04)_48%,transparent_100%)]" />
      <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.06),transparent_20%),linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] [background-size:auto,22px_22px,22px_22px]" />
      {promo.image ? (
        <Image
          src={promo.image.src}
          alt={promo.image.alt}
          width={1200}
          height={900}
          className="sr-only"
          onLoad={() => setImageReady(true)}
          onError={() => setImageReady(false)}
        />
      ) : null}
      {promo.image && imageReady ? (
        <div
          role="img"
          aria-label={promo.image.alt}
          className={`absolute inset-y-0 right-0 hidden w-[36%] opacity-30 mix-blend-screen lg:block ${resolvedSize === "sm" ? "lg:w-[30%]" : ""}`}
          style={{
            backgroundImage: `${themeClass.imageOverlay}, url(${promo.image.src})`,
            backgroundPosition: "center",
            backgroundSize: "cover",
          }}
        />
      ) : null}
      <div className="relative z-10">
        <p className={`text-[11px] font-black uppercase tracking-[0.22em] ${themeClass.claim}`}>
          {promo.claim}
        </p>
        <h2 className={`mt-3 font-black uppercase leading-[0.84] tracking-[-0.07em] ${themeClass.title} ${styles.title}`}>
          {promo.title}
        </h2>
        <p className={`mt-3 font-semibold ${themeClass.subtitle} ${styles.subtitle}`}>
          {promo.subtitle}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className={`rounded-full border px-4 py-2 font-black uppercase tracking-[-0.05em] ${themeClass.pricePill} ${themeClass.price} ${styles.price}`}>
            {promo.price}
          </span>
          <span className={`font-black uppercase tracking-[0.18em] ${themeClass.variants} ${styles.variants}`}>
            {promo.variants.join(" · ")}
          </span>
        </div>
        {showActions ? (
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
              <ActionButton href="/ubicacion-ogijares" kind="secondary">Cómo llegar</ActionButton>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
