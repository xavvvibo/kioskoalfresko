import Link from "next/link";
import { seoLandings } from "@/content/site";

export function SeoLinksPanel() {
  return (
    <div className="rounded-[2rem] border border-stone-950 bg-white p-8">
      <p className="max-w-3xl text-3xl font-black uppercase leading-tight tracking-[-0.03em] text-stone-950">Si estás buscando dónde tomar algo en Ogíjares, la respuesta debería salirte fácil.</p>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-700">Bar, terraza, tapas, plan al aire libre. El contenido SEO sigue ahí, pero la idea es simple: que se entienda rápido si este es vuestro sitio hoy.</p>
      <div className="mt-8 grid gap-3 md:grid-cols-2">
        {seoLandings.map((page) => (
          <Link key={page.slug} href={`/${page.slug}`} className="rounded-[1.25rem] border border-stone-950 bg-stone-50 px-4 py-4 text-sm font-black uppercase tracking-[0.12em] text-stone-900 transition hover:bg-[#d94b2b] hover:text-white">
            {page.shortTitle}
          </Link>
        ))}
      </div>
    </div>
  );
}
