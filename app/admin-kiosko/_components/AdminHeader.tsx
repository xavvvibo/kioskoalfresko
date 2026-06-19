import Link from "next/link";
import { logoutAdminKioskoAction } from "../actions";

export function AdminHeader({ title, description }: { title: string; description: string }) {
  return (
    <section className="border-b border-white/10 bg-[radial-gradient(circle_at_85%_10%,rgba(217,75,43,0.24),transparent_22%),linear-gradient(180deg,#171717_0%,#0d0d0d_100%)]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-[#d94b2b]/40 bg-[#d94b2b]/12 px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-[#f2c6bb]">
              Zona interna · Acceso solo personal autorizado
            </div>
            <p className="mt-8 text-xs font-black uppercase tracking-[0.22em] text-[#d94b2b]">Kiosko Alfresko</p>
            <h1 className="mt-3 max-w-3xl text-[2.4rem] font-black uppercase leading-[0.92] tracking-[-0.05em] text-[#fff8ef] sm:text-[3.2rem] md:text-[4.4rem]">
              {title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-stone-300 md:text-lg">
              {description}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin-kiosko"
              className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/6 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-white/12"
            >
              Panel
            </Link>
            <form action={logoutAdminKioskoAction}>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-stone-950"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
