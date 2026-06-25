import Link from "next/link";
import { AdminHeader } from "./AdminHeader";

export function PendingDigitalizationPage({
  title,
  description = "Pendiente de digitalización",
}: {
  title: string;
  description?: string;
}) {
  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title={title} description="Centro APPCC interno KIOSKO ALFRESKO." />
      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 md:py-12">
        <article className="rounded-[2rem] border border-white/10 bg-[#151515] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#f2c6bb]">Zona interna</p>
          <h1 className="mt-3 text-3xl font-black uppercase tracking-[-0.04em] text-[#fff8ef]">{title}</h1>
          <p className="mt-4 rounded-[1.4rem] border border-amber-300/30 bg-amber-100 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-amber-950">
            {description}
          </p>
          <Link href="/admin-kiosko/documentacion" className="mt-6 inline-flex rounded-full border border-white/12 bg-white/6 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">
            Volver a documentación
          </Link>
        </article>
      </section>
    </main>
  );
}
