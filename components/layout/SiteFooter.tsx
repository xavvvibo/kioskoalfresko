import Link from "next/link";
import { seoLandings, siteConfig } from "@/content/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-stone-950 bg-stone-950 text-stone-100">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div>
          <div className="inline-flex overflow-hidden rounded-full border border-white/15 text-[11px] font-black uppercase tracking-[0.18em] text-white">
            <span className="bg-white px-4 py-3 text-stone-950">Kiosko</span>
            <span className="bg-[#d94b2b] px-4 py-3">Alfresko</span>
          </div>
          <p className="mt-4 text-sm leading-6 text-stone-300">{siteConfig.location.area}, {siteConfig.location.city}, {siteConfig.location.province}</p>
          <p className="mt-3 text-sm font-semibold text-white">Aquí no se viene a comer. Se viene a quedarse.</p>
        </div>
        <div>
          <h4 className="text-sm font-black uppercase tracking-[0.16em] text-[#efb7a8]">Accesos</h4>
          <div className="mt-4 space-y-2 text-sm text-stone-300">
            <Link className="block hover:text-white" href="/carta">Carta</Link>
            <Link className="block hover:text-white" href="/horarios">Horarios</Link>
            <Link className="block hover:text-white" href="/reservas-contacto">Reservas y contacto</Link>
            <Link className="block hover:text-white" href="/ubicacion-ogijares">Ubicación</Link>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-black uppercase tracking-[0.16em] text-[#efb7a8]">SEO local</h4>
          <div className="mt-4 space-y-2 text-sm text-stone-300">
            {seoLandings.map((page) => (
              <Link key={page.slug} className="block hover:text-white" href={`/${page.slug}`}>{page.shortTitle}</Link>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-black uppercase tracking-[0.16em] text-[#efb7a8]">Legal</h4>
          <div className="mt-4 space-y-2 text-sm text-stone-300">
            <Link className="block hover:text-white" href="/aviso-legal">Aviso legal</Link>
            <Link className="block hover:text-white" href="/privacidad">Privacidad</Link>
            <Link className="block hover:text-white" href="/cookies">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
