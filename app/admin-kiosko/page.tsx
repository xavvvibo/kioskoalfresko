import type { Metadata } from "next";
import { internalAdminSections } from "@/content/site";

export const metadata: Metadata = {
  title: "Panel interno | Kiosko Alfresko",
  description: "Panel interno de control operativo y sanitario.",
  robots: {
    index: false,
    follow: false,
  },
};

const categoryStyles = {
  sanitario: "border-[#d94b2b]/30 bg-[#d94b2b]/10 text-[#d94b2b]",
  operativo: "border-stone-300 bg-stone-100 text-stone-800",
  documentacion: "border-stone-950/20 bg-white text-stone-950",
};

export default function AdminKioskoPage() {
  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_85%_10%,rgba(217,75,43,0.24),transparent_22%),linear-gradient(180deg,#171717_0%,#0d0d0d_100%)]">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12">
          <div className="inline-flex rounded-full border border-[#d94b2b]/40 bg-[#d94b2b]/12 px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-[#f2c6bb]">
            Zona interna · Acceso solo personal autorizado
          </div>
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.72fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#d94b2b]">Kiosko Alfresko</p>
              <h1 className="mt-3 max-w-3xl text-[2.6rem] font-black uppercase leading-[0.92] tracking-[-0.05em] text-[#fff8ef] sm:text-[3.4rem] md:text-[4.6rem]">
                Panel interno Kiosko Alfresko
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-stone-300 md:text-lg">
                Control sanitario, registros diarios y documentación operativa.
              </p>
            </div>
            <div className="rounded-[1.7rem] border border-white/12 bg-white/6 p-5 shadow-[0_22px_54px_rgba(0,0,0,0.2)]">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#f2c6bb]">Preparado para protección</p>
              <p className="mt-3 text-sm leading-6 text-stone-300">
                Esta ruta queda sin enlaces públicos y lista para protegerse más adelante con contraseña, middleware o auth.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12">
        <div className="grid gap-8">
          {internalAdminSections.map((section) => (
            <section key={section.title} className="rounded-[2rem] border border-white/10 bg-[#151515] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.18)] sm:p-6">
              <div className="flex flex-col gap-3 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">{section.title}</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-300">{section.description}</p>
                </div>
                <span className="inline-flex w-fit rounded-full border border-[#d94b2b]/40 bg-[#d94b2b]/12 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#f2c6bb]">
                  Uso interno
                </span>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {section.items.map((item) => (
                  <article key={item.title} className="flex min-h-[15rem] flex-col rounded-[1.5rem] border border-white/10 bg-[#fffaf4] p-5 text-stone-950 shadow-[0_14px_34px_rgba(0,0,0,0.18)]">
                    <div className="flex items-start justify-between gap-3">
                      <span className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] ${categoryStyles[item.category]}`}>
                        {item.category}
                      </span>
                      <span className="rounded-full border border-amber-300 bg-amber-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-amber-900">
                        Pendiente de enlazar
                      </span>
                    </div>
                    <h3 className="mt-5 text-2xl font-black uppercase leading-tight tracking-[-0.03em]">{item.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-stone-700">{item.description}</p>
                    <div className="mt-auto pt-6">
                      <a
                        href={item.href}
                        className="inline-flex w-full items-center justify-center rounded-full border border-stone-950 bg-stone-950 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-[#d94b2b] focus:outline-none focus:ring-2 focus:ring-[#d94b2b] focus:ring-offset-2 focus:ring-offset-[#fffaf4]"
                      >
                        Abrir
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
