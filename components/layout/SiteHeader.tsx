import Link from "next/link";
import { siteConfig } from "@/content/site";

const links = [
  { href: "/carta", label: "Carta" },
  { href: "/horarios", label: "Horarios" },
  { href: "/ubicacion-ogijares", label: "Ubicación" },
  { href: "/reservas-contacto", label: "Reservas / contacto" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-stone-950/10 bg-[rgba(245,239,229,0.9)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3 md:gap-4">
          <div className="flex h-12 items-center overflow-hidden rounded-full border border-stone-950 bg-stone-950 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-[0_14px_34px_rgba(0,0,0,0.16)] md:h-14">
            <span className="px-4 md:px-5">Kiosko</span>
            <span className="bg-[#d94b2b] px-4 py-3 text-white md:px-5 md:py-4">Alfresko</span>
          </div>
          <div className="hidden sm:block">
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-stone-500">{siteConfig.location.city} · {siteConfig.location.area}</div>
            <div className="mt-1 text-sm font-black uppercase tracking-[0.06em] text-stone-950 md:text-base">No es un kiosko. Es el plan.</div>
          </div>
        </Link>
        <nav className="hidden items-center gap-7 rounded-full border border-stone-950/10 bg-white/70 px-5 py-3 shadow-[0_12px_28px_rgba(0,0,0,0.05)] md:flex">
          {links.map((item) => (
            <Link key={item.href} href={item.href} className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-700 transition hover:text-[#d94b2b]">{item.label}</Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
