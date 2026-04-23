"use client";

import { useState } from "react";
import Image from "next/image";
import type { MenuPromo } from "@/types/site";
import { smashPromo } from "@/content/menu";
import { ActionButton } from "@/components/ui/ActionButton";

type SmashBarScreenProps = {
  promo?: MenuPromo;
  variant?: "vertical" | "horizontal" | "compact";
  theme?: "dark" | "red";
  showSecondaryAction?: boolean;
  className?: string;
};

const themeStyles = {
  dark: {
    shell:
      "border-white/10 bg-[radial-gradient(circle_at_80%_12%,rgba(217,75,43,0.32),transparent_26%),radial-gradient(circle_at_12%_86%,rgba(240,210,143,0.14),transparent_22%),linear-gradient(135deg,#050505_0%,#15100e_54%,#080808_100%)] text-[#fff8ef]",
    flash: "bg-[#d94b2b]",
    chip: "border-[#d94b2b]/50 bg-[#d94b2b]/16 text-[#ffd6cb]",
    price: "text-[#fff8ef] drop-shadow-[0_12px_34px_rgba(217,75,43,0.45)]",
    imageOverlay:
      "linear-gradient(180deg,rgba(0,0,0,0.08)_0%,rgba(0,0,0,0.30)_48%,rgba(0,0,0,0.88)_100%),linear-gradient(90deg,rgba(0,0,0,0.86)_0%,rgba(0,0,0,0.10)_52%,rgba(0,0,0,0.72)_100%)",
  },
  red: {
    shell:
      "border-[#ffb09e]/22 bg-[radial-gradient(circle_at_78%_16%,rgba(255,248,239,0.18),transparent_22%),radial-gradient(circle_at_10%_82%,rgba(0,0,0,0.32),transparent_24%),linear-gradient(135deg,#d94b2b_0%,#9d2e16_58%,#240906_100%)] text-[#fff8ef]",
    flash: "bg-[#fff8ef]",
    chip: "border-white/35 bg-white/12 text-white",
    price: "text-white drop-shadow-[0_12px_34px_rgba(0,0,0,0.42)]",
    imageOverlay:
      "linear-gradient(180deg,rgba(55,10,4,0.04)_0%,rgba(55,10,4,0.26)_48%,rgba(55,10,4,0.88)_100%),linear-gradient(90deg,rgba(55,10,4,0.82)_0%,rgba(55,10,4,0.10)_52%,rgba(55,10,4,0.66)_100%)",
  },
} as const;

const variantStyles = {
  vertical: {
    shell: "min-h-[calc(100svh-7rem)] px-5 py-7 sm:px-8 md:min-h-[48rem] md:px-10 md:py-10",
    grid: "grid min-h-[inherit] content-between gap-7",
    media:
      "relative min-h-[19rem] overflow-hidden rounded-[2rem] border border-white/10 bg-black/35 shadow-[0_30px_90px_rgba(0,0,0,0.42)] sm:min-h-[26rem] md:min-h-[34rem]",
    title: "text-[3.4rem] sm:text-[5.2rem] md:text-[6.8rem]",
    subtitle: "max-w-[34rem] text-lg sm:text-2xl",
    price: "text-[4.8rem] sm:text-[7rem] md:text-[9.4rem]",
    variants: "grid grid-cols-1 gap-2 sm:grid-cols-3",
    actions: "grid gap-3 sm:flex",
  },
  horizontal: {
    shell: "px-5 py-7 sm:px-8 md:px-10 md:py-10",
    grid: "grid items-center gap-7 lg:grid-cols-[0.95fr_1.05fr]",
    media:
      "relative min-h-[18rem] overflow-hidden rounded-[2rem] border border-white/10 bg-black/35 shadow-[0_30px_90px_rgba(0,0,0,0.36)] sm:min-h-[24rem] lg:order-2 lg:min-h-[34rem]",
    title: "text-[3.1rem] sm:text-[4.5rem] lg:text-[6.2rem]",
    subtitle: "max-w-[32rem] text-lg sm:text-xl",
    price: "text-[4rem] sm:text-[5.8rem] lg:text-[7rem]",
    variants: "flex flex-wrap gap-2",
    actions: "flex flex-wrap gap-3",
  },
  compact: {
    shell: "px-4 py-5 sm:px-5 sm:py-6",
    grid: "grid items-center gap-4 sm:grid-cols-[1fr_0.72fr]",
    media:
      "relative min-h-[11rem] overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/35 shadow-[0_18px_50px_rgba(0,0,0,0.26)] sm:order-2 sm:min-h-[13rem]",
    title: "text-[2.25rem] sm:text-[3rem]",
    subtitle: "max-w-[24rem] text-sm sm:text-base",
    price: "text-[3rem] sm:text-[4rem]",
    variants: "flex flex-wrap gap-2",
    actions: "flex flex-wrap gap-2",
  },
} as const;

export function SmashBarScreen({
  promo = smashPromo,
  variant = "vertical",
  theme = "dark",
  showSecondaryAction = true,
  className = "",
}: SmashBarScreenProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const styles = variantStyles[variant];
  const colors = themeStyles[theme];
  const hasImage = Boolean(promo.image && !imageFailed);
  const isCompact = variant === "compact";

  return (
    <section
      aria-labelledby="smash-bar-screen-title"
      className={`relative isolate overflow-hidden rounded-[2rem] border shadow-[0_36px_110px_rgba(0,0,0,0.36)] ${colors.shell} ${styles.shell} ${className}`}
    >
      <div className="absolute inset-0 -z-10 opacity-35 [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="absolute inset-x-0 top-0 -z-10 h-1/2 bg-[radial-gradient(circle_at_50%_0%,rgba(217,75,43,0.24),transparent_58%)]" />
      <div className={`absolute right-5 top-5 h-3 w-20 rotate-[-8deg] rounded-full ${colors.flash} opacity-90 shadow-[0_0_34px_rgba(217,75,43,0.48)]`} />

      <div className={styles.grid}>
        <div className="relative z-10">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#ffd6cb]">
            {promo.claim}
          </p>
          <h1
            id="smash-bar-screen-title"
            className={`mt-3 max-w-[11ch] font-black uppercase leading-[0.8] tracking-[-0.085em] ${styles.title}`}
          >
            {promo.title}
          </h1>
          <p className={`mt-4 font-black uppercase leading-tight text-white/86 ${styles.subtitle}`}>
            {promo.subtitle}
          </p>

          <div className="mt-5 flex flex-wrap items-end gap-x-5 gap-y-2">
            <p className={`font-black uppercase leading-none tracking-[-0.09em] ${colors.price} ${styles.price}`}>
              {promo.price}
            </p>
            {!isCompact ? (
              <p className="mb-3 max-w-[9rem] text-xs font-black uppercase leading-tight tracking-[0.2em] text-[#f0d28f]">
                Patatas incluidas
              </p>
            ) : null}
          </div>

          <ul className={`mt-5 ${styles.variants}`} aria-label="Variedades de smash burger">
            {promo.variants.map((item) => (
              <li
                key={item}
                className={`rounded-full border px-4 py-2 text-center text-sm font-black uppercase tracking-[0.12em] ${colors.chip}`}
              >
                {item}
              </li>
            ))}
          </ul>

          <div className={`mt-7 ${styles.actions}`}>
            <ActionButton href="/reservas-contacto">Pedir ahora</ActionButton>
            {showSecondaryAction ? (
              <ActionButton href="/carta" kind="secondary">
                Ver carta
              </ActionButton>
            ) : null}
          </div>
        </div>

        <div className={styles.media}>
          {hasImage && promo.image ? (
            <Image
              src={promo.image.src}
              alt={promo.image.alt}
              fill
              priority={variant !== "compact"}
              sizes={variant === "compact" ? "(min-width: 640px) 34vw, 100vw" : "(min-width: 1024px) 50vw, 100vw"}
              className="object-cover object-center scale-[1.03]"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(217,75,43,0.54),transparent_34%),linear-gradient(135deg,#151515_0%,#050505_100%)]" />
          )}
          <div
            className="absolute inset-0"
            style={{ backgroundImage: colors.imageOverlay }}
          />
          <div className="absolute bottom-4 left-4 rounded-full border border-white/20 bg-black/62 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#fff8ef] backdrop-blur">
            Smash 180g
          </div>
        </div>
      </div>
    </section>
  );
}
