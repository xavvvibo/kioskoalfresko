import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { AdminHeader } from "../_components/AdminHeader";

export const metadata: Metadata = {
  title: "Documentación APPCC | Panel interno",
  description: "Centro documental APPCC interno.",
};

const groups = [
  {
    title: "Documentación oficial",
    items: [
      ["Memoria Técnico Sanitaria", "/admin-kiosko/documentacion/memoria-tecnico-sanitaria"],
      ["Buenas Prácticas de Manipulación", "/admin-kiosko/documentacion/buenas-practicas"],
      ["Planes APPCC", "/admin-kiosko/documentacion/planes-appcc"],
      ["Protocolos", "/admin-kiosko/documentacion/protocolos"],
      ["Alérgenos", "/admin-kiosko/documentacion/alergenos"],
      ["Fichas técnicas", "/admin-kiosko/documentacion/fichas-tecnicas"],
    ],
  },
  {
    title: "Registros",
    items: [
      ["Libros Registro APPCC", "/admin-kiosko/documentacion/libros-registro-appcc"],
      ["Informe mensual APPCC", "/admin-kiosko/registros/informe"],
      ["Registros APPCC", "/admin-kiosko/registros"],
      ["Incidencias", "/admin-kiosko/incidencias"],
      ["Acciones correctoras", "/admin-kiosko/documentacion/acciones-correctoras"],
      ["Control de temperaturas", "/admin-kiosko/temperaturas"],
      ["Control de limpieza", "/admin-kiosko/limpieza"],
      ["Control aceite freidora", "/admin-kiosko/aceite-freidora"],
      ["Recepción mercancías", "/admin-kiosko/recepcion-mercancia"],
    ],
  },
  {
    title: "Operativa y verificación",
    items: [
      ["Mantenimiento", "/admin-kiosko/mantenimiento"],
      ["Agua", "/admin-kiosko/agua"],
      ["Proveedores", "/admin-kiosko/proveedores"],
      ["Verificación anual", "/admin-kiosko/verificacion-anual"],
    ],
  },
];

export default async function DocumentacionPage() {
  await requireAdminSession();

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Centro documental APPCC" description="Documentación sanitaria, registros y protocolos internos de KIOSKO ALFRESKO." />
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12">
        <div className="grid gap-6">
          {groups.map((group) => (
            <section key={group.title} className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
              <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">{group.title}</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {group.items.map(([title, href]) => {
                  const available = !href.includes("/documentacion/") || ["alergenos", "fichas-tecnicas"].some((slug) => href.endsWith(slug));
                  return (
                  <article key={title} className="rounded-[1.4rem] border border-white/10 bg-[#fffaf4] p-5 text-stone-950 transition hover:border-[#d94b2b]">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#d94b2b]">Documento interno</p>
                    <h3 className="mt-3 text-xl font-black uppercase tracking-[-0.03em]">{title}</h3>
                    <div className="mt-4 grid gap-2 text-xs font-semibold text-stone-700">
                      <p>Estado: <span className="font-black text-stone-950">{available ? "Disponible" : "Pendiente"}</span></p>
                      <p>Última revisión: {available ? "2026" : "Pendiente"}</p>
                      <p>Responsable: F. Javier Bocanegra Sanjuan</p>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <Link href={href} className="rounded-full border border-stone-950 bg-stone-950 px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white">Ver</Link>
                      <button type="button" disabled className="rounded-full border border-stone-200 bg-stone-100 px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-stone-400">Descargar</button>
                    </div>
                  </article>
                );})}
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
