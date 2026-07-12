import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { getGlobalSearchResults } from "@/lib/admin-kiosko/database";
import { AdminHeader } from "../_components/AdminHeader";

export const metadata: Metadata = {
  title: "Búsqueda APPCC | Panel interno",
  description: "Búsqueda global interna APPCC.",
};

export default async function BuscarPage({ searchParams }: { searchParams?: Promise<{ q?: string }> }) {
  await requireAdminPermission("reports:view");
  const params = await searchParams;
  const q = params?.q || "";
  const result = await getGlobalSearchResults(q);
  const rows = result.ok ? result.data : [];

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Búsqueda APPCC" description="Localiza productos, lotes, proveedores, documentos, registros, equipos y OCR desde un único punto." />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12">
        <div className="grid gap-6">
          <form className="grid gap-3 rounded-[2rem] border border-white/10 bg-[#151515] p-5 md:grid-cols-[1fr_auto]">
            <input name="q" defaultValue={q} placeholder="Buscar producto, lote, proveedor, factura, albarán, temperatura, incidencia, equipo o fecha" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b]" />
            <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white">Buscar</button>
          </form>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((row, index) => (
              <Link key={`${row.type}-${row.title}-${index}`} href={row.href} className="rounded-[1.5rem] border border-white/10 bg-[#fffaf4] p-5 text-stone-950 transition hover:border-[#d94b2b]">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#d94b2b]">{row.type}</p>
                <h2 className="mt-3 text-xl font-black uppercase tracking-[-0.03em]">{row.title}</h2>
                <p className="mt-3 text-sm leading-6 text-stone-700">{row.detail}</p>
                {row.date ? <p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-stone-500">{row.date}</p> : null}
              </Link>
            ))}
          </section>
          {q && !rows.length ? <p className="rounded-[1.5rem] border border-white/10 bg-[#151515] p-5 text-sm text-stone-300">No hay resultados para la búsqueda indicada.</p> : null}
        </div>
      </section>
    </main>
  );
}
