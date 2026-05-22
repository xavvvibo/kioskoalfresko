"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { siteConfig } from "@/content/site";
import { ActionButton } from "@/components/ui/ActionButton";
import { trackEvent } from "@/lib/analytics";
import { getQamareroReservationUrl } from "@/lib/integrations/qamarero";

const links = [
  { href: "/carta", label: "Carta", analyticsEvent: "click_ver_carta" },
  { href: "/horarios", label: "Horarios" },
  { href: "/ubicacion-ogijares", label: "Ubicación", analyticsEvent: "click_como_llegar" },
  { href: getQamareroReservationUrl("header"), label: "Reservar", external: true, analyticsEvent: "click_reserva_qamarero" },
  { href: "/reservas-contacto", label: "Contacto" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function closeMenu() {
    setOpen(false);
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-stone-950/10 bg-[rgba(245,239,229,0.9)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3 md:gap-4" onClick={closeMenu}>
            <div className="flex h-12 items-center overflow-hidden rounded-full border border-stone-950 bg-stone-950 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-[0_14px_34px_rgba(0,0,0,0.16)] md:h-14">
              <span className="px-4 md:px-5">Kiosko</span>
              <span className="bg-[#d94b2b] px-4 py-3 text-white md:px-5 md:py-4">Alfresko</span>
            </div>
            <div className="hidden sm:block">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-stone-500">{siteConfig.location.city} · {siteConfig.location.area}</div>
              <div className="mt-1 text-sm font-semibold tracking-[0.02em] text-stone-950 md:text-base">Terraza, tapas y smash burgers en Ogíjares.</div>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-stone-950 bg-white text-stone-950 shadow-[0_12px_28px_rgba(0,0,0,0.08)] transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d94b2b] md:hidden"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
          >
            <span className="text-2xl font-black leading-none">{open ? "✕" : "☰"}</span>
          </button>
          <nav className="hidden items-center gap-7 rounded-full border border-stone-950/10 bg-white/70 px-5 py-3 shadow-[0_12px_28px_rgba(0,0,0,0.05)] md:flex">
            {links.map((item) => (
              item.external ? (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => item.analyticsEvent ? trackEvent(item.analyticsEvent, { location: "header_desktop" }) : undefined}
                  className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-700 transition hover:text-[#d94b2b]"
                >
                  {item.label}
                </a>
              ) : (
                <Link key={item.href} href={item.href} onClick={() => item.analyticsEvent ? trackEvent(item.analyticsEvent, { location: "header_desktop" }) : undefined} className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-700 transition hover:text-[#d94b2b]">{item.label}</Link>
              )
            ))}
          </nav>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-50 bg-stone-950 text-white transition duration-300 md:hidden ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!open}
      >
        <div className="flex min-h-screen flex-col p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#f2c6bb]">
              {siteConfig.location.city} · {siteConfig.location.area}
            </div>
            <button
              type="button"
              onClick={closeMenu}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/18 bg-white/8 text-2xl font-black text-white transition hover:bg-white/14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0d28f]"
              aria-label="Cerrar menú"
            >
              ✕
            </button>
          </div>

          <nav className="mt-10 flex flex-col gap-5 text-[2rem] font-black uppercase leading-none tracking-[-0.04em]">
            {links.map((item) => (
              item.external ? (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => {
                    if (item.analyticsEvent) trackEvent(item.analyticsEvent, { location: "header_mobile" });
                    closeMenu();
                  }}
                  className="border-b border-white/10 pb-4 text-white transition hover:text-[#f2c6bb]"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    if (item.analyticsEvent) trackEvent(item.analyticsEvent, { location: "header_mobile" });
                    closeMenu();
                  }}
                  className="border-b border-white/10 pb-4 text-white transition hover:text-[#f2c6bb]"
                >
                  {item.label}
                </Link>
              )
            ))}
          </nav>

          <div className="mt-auto flex flex-col gap-4 pt-10">
            <ActionButton href={siteConfig.contact.phoneHref} analyticsEvent="click_llamar" analyticsPayload={{ location: "header_mobile" }}>Llamar</ActionButton>
            <ActionButton href={siteConfig.contact.whatsappUrl} kind="secondary" newTab analyticsEvent="click_whatsapp" analyticsPayload={{ location: "header_mobile" }}>WhatsApp</ActionButton>
          </div>
        </div>
      </div>
    </>
  );
}
