"use client";

import Link from "next/link";
import { trackEvent } from "@/lib/analytics";

function isPendingHref(href: string) {
  return !href || href.includes("[PENDIENTE_");
}

export function ActionButton({
  href,
  children,
  kind = "primary",
  newTab = false,
  analyticsEvent,
  analyticsPayload,
  ariaLabel,
}: {
  href: string;
  children: React.ReactNode;
  kind?: "primary" | "secondary" | "ghost";
  newTab?: boolean;
  analyticsEvent?: string;
  analyticsPayload?: Record<string, string | number | boolean | null | undefined>;
  ariaLabel?: string;
}) {
  const className =
    kind === "primary"
      ? "bg-[#d94b2b] text-white hover:bg-[#bf3f21] hover:-translate-y-0.5 shadow-[0_12px_30px_rgba(217,75,43,0.3)]"
      : kind === "secondary"
        ? "bg-white text-stone-950 ring-1 ring-stone-950/15 hover:bg-stone-100 hover:-translate-y-0.5"
        : "bg-stone-950 text-white hover:bg-black hover:-translate-y-0.5";

  const sharedClassName = `inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-black uppercase tracking-[0.14em] transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0d28f] focus-visible:ring-offset-2 focus-visible:ring-offset-stone-950 ${className}`;

  if (isPendingHref(href)) {
    return (
      <span
        aria-disabled="true"
        title="Pendiente de configurar"
        className={`${sharedClassName} cursor-not-allowed opacity-60`}
        aria-label={ariaLabel}
      >
        {children}
      </span>
    );
  }

  const external =
    href.startsWith("http") || href.startsWith("tel:") || href.startsWith("mailto:");

  function handleClick() {
    if (!analyticsEvent) return;
    trackEvent(analyticsEvent, {
      href,
      ...analyticsPayload,
    });
  }

  if (external) {
    return (
      <a
        href={href}
        className={sharedClassName}
        target={newTab ? "_blank" : undefined}
        rel={newTab ? "noopener noreferrer" : undefined}
        onClick={handleClick}
        aria-label={ariaLabel}
      >
        {children}
      </a>
    );
  }

  return <Link href={href} className={sharedClassName} onClick={handleClick} aria-label={ariaLabel}>{children}</Link>;
}
