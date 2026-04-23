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

const sizeStyles = {
  sm: {
    wrapper: "p-4 md:p-5",
    minHeight: "min-h-[320px] md:min-h-[360px]",
    title: "text-[1.9rem] md:text-[2.4rem]",
    price: "text-[1.5rem] md:text-[2rem]",
    subtitle: "text-sm md:text-base",
    variants: "text-xs",
    imageBox: "w-[46%] max-w-[320px]",
  },
  md: {
    wrapper: "p-5 md:p-6",
    minHeight: "min-h-[360px] md:min-h-[420px]",
    title: "text-[2.2rem] md:text-[3rem]",
    price: "text-[1.9rem] md:text-[2.6rem]",
    subtitle: "text-base md:text-lg",
    variants: "text-sm",
    imageBox: "w-[48%] max-w-[420px]",
  },
  lg: {
    wrapper: "p-6 md:p-8",
    minHeight: "min-h-[420px] md:min-h-[500px]",
    title: "text-[2.9rem] md:text-[5.2rem]",
    price: "text-[2.2rem] md:text-[3rem]",
    subtitle: "text-base md:text-lg",
    variants: "text-sm",
    imageBox: "w-[52%] max-w-[560px]",
  },
} as const;

const themeStyles = {
  dark: {
    wrapper: "border-white/10 bg-black text-white",
    claim: "text-[#f2c6bb]",
    title: "text-[#fff8ef]",
    subtitle: "text-white/90",
    price: "text-[#fff8ef]",
    variants: "text-[#f2c6bb]",
    pricePill: "border-[#f0d28f]/40 bg-black/45 backdrop-blur-sm",
    sectionBg:
      "linear-gradient(180deg, rgba(8,8,8,1) 0%, rgba(14,14,14,1) 100%)",
    overlay:
      "linear-gradient(90deg, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.88) 34%, rgba(0,0,0,0.52) 58%, rgba(0,0,0,0.18) 76%, rgba(0,0,0,0.06) 100%)",
  },
  red: {
    wrapper: "border-[#d94b2b]/40 bg-[#b9381c] text-white",
    claim: "text-[#ffe0d7]",
    title: "text-[#fff8ef]",
    subtitle: "text-white/95",
    price: "text-[#fff8ef]",
    variants: "text-[#ffe0d7]",
    pricePill: "border-[#fff0d7]/35 bg-black/20 backdrop-blur-sm",
    sectionBg:
      "linear-gradient(180deg, rgba(160,45,18,1) 0%, rgba(120,30,8,1) 100%)",
    overlay:
      "linear-gradient(90deg, rgba(35,5,0,0.88) 0%, rgba(65,10,2,0.76) 30%, rgba(120,28,8,0.40) 58%, rgba(0,0,0,0.12) 100%)",
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

  return (
    <section
      className={`group relative overflow-hidden rounded-[2.2rem] border shadow-[0_28px_70px_rgba(0,0,0,0.22)] ${themeClass.wrapper} ${styles.wrapper} ${styles.minHeight}`}
      style={{ background: themeClass.sectionBg }}
    >
      <div
        className="absolute inset-0"
        style={{ background: themeClass.overlay }}
      />

      <div className="absolute inset-0 opacity-10 [background-image:linear-gradient(transparent_0%,rgba(255,255,255,0.03)_50%,transparent_100%)]" />

      {promo.image?.src ? (
        <div
          className={`pointer-events-none absolute bottom-0 right-0 z-0 hidden h-[92%] ${styles.imageBox} md:block`}
        >
          <img
            src={promo.image.src}
            alt=""
            className="h-full w-full object-contain object-right-bottom"
          />
        </div>
      ) : null}

      <div className="relative z-10 flex h-full max-w-[760px] flex-col justify-center">
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
