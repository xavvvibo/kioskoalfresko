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
    contentMax: "max-w-[520px]",
  },
  md: {
    wrapper: "p-5 md:p-6",
    minHeight: "min-h-[360px] md:min-h-[420px]",
    title: "text-[2.2rem] md:text-[3rem]",
    price: "text-[1.9rem] md:text-[2.6rem]",
    subtitle: "text-base md:text-lg",
    variants: "text-sm",
    contentMax: "max-w-[620px]",
  },
  lg: {
    wrapper: "p-6 md:p-8",
    minHeight: "min-h-[420px] md:min-h-[500px]",
    title: "text-[2.8rem] md:text-[5rem]",
    price: "text-[2rem] md:text-[3rem]",
    subtitle: "text-base md:text-lg",
    variants: "text-sm",
    contentMax: "max-w-[720px]",
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
    overlay:
      "linear-gradient(90deg, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.88) 28%, rgba(0,0,0,0.58) 48%, rgba(0,0,0,0.18) 72%, rgba(0,0,0,0.02) 100%)",
  },
  red: {
    wrapper: "border-[#d94b2b]/40 bg-[#b9381c] text-white",
    claim: "text-[#ffe0d7]",
    title: "text-[#fff8ef]",
    subtitle: "text-white/95",
    price: "text-[#fff8ef]",
    variants: "text-[#ffe0d7]",
    pricePill: "border-[#fff0d7]/35 bg-black/20 backdrop-blur-sm",
    overlay:
      "linear-gradient(90deg, rgba(35,5,0,0.90) 0%, rgba(65,10,2,0.78) 28%, rgba(120,28,8,0.42) 54%, rgba(0,0,0,0.14) 100%)",
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

  const sectionBackground = promo.image?.src
    ? `${themeClass.overlay}, url("${promo.image.src}")`
    : "radial-gradient(circle at 78% 35%, rgba(217,75,43,0.34), transparent 22%), linear-gradient(180deg, #070707 0%, #141414 100%)";

  return (
    <section
      className={`group relative overflow-hidden rounded-[2.2rem] border shadow-[0_28px_70px_rgba(0,0,0,0.22)] ${themeClass.wrapper} ${styles.wrapper} ${styles.minHeight}`}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage: sectionBackground,
          backgroundSize: "cover",
          backgroundPosition: "right center",
          backgroundRepeat: "no-repeat",
        }}
      />

      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(255,255,255,0.02)_55%,transparent_100%)] opacity-30" />

      <div className={`relative z-10 flex h-full flex-col justify-center ${styles.contentMax}`}>
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
