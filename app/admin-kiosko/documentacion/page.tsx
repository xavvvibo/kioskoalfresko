import type { Metadata } from "next";
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
                {group.items.map(([title, href]) => (
                  <a key={title} href={href} className="rounded-[1.4rem] border border-white/10 bg-[#fffaf4] p-5 text-stone-950 transition hover:border-[#d94b2b]">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#d94b2b]">Documento interno</p>
                    <h3 className="mt-3 text-xl font-black uppercase tracking-[-0.03em]">{title}</h3>
                    <p className="mt-3 text-sm leading-6 text-stone-700">Abrir sección</p>
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
