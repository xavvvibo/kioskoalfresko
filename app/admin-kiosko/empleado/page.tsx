import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { AdminHeader } from "../_components/AdminHeader";

export const metadata: Metadata = {
  title: "Panel empleado APPCC | Panel interno",
  description: "Registros diarios, etiquetas, mermas y producción.",
};

const actions = [
  ["Registrar temperaturas", "/admin-kiosko/temperaturas", "Control de equipos de frío y caliente."],
  ["Registrar limpieza", "/admin-kiosko/limpieza", "Zonas, turno y responsable."],
  ["Checklists", "/admin-kiosko/checklists", "Apertura, cierre y comprobaciones básicas."],
  ["Registrar recepción", "/admin-kiosko/recepcion-mercancia", "Entrada de mercancía y conformidad."],
  ["Registrar incidencia", "/admin-kiosko/incidencias", "Acción correctora y seguimiento."],
];

export default async function EmpleadoPage() {
  const session = await requireAdminSession();

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Panel de trabajo diario" description="Acciones esenciales para registrar controles APPCC durante la jornada." role="employee" />
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12">
        <div className="grid gap-6">
          <section className="rounded-[2rem] border border-amber-300/30 bg-amber-100 p-5 text-amber-950">
            <h2 className="text-2xl font-black uppercase tracking-[-0.03em]">Mi sesión</h2>
            <p className="mt-3 text-sm font-semibold">Usuario: {session.displayName} · Rol: {session.role}</p>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {actions.map(([title, href, text]) => (
              <Link key={href + title} href={href} className="min-h-40 rounded-[1.6rem] border border-white/10 bg-[#fffaf4] p-5 text-stone-950 transition hover:border-[#d94b2b]">
                <h2 className="text-2xl font-black uppercase tracking-[-0.03em]">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-stone-700">{text}</p>
              </Link>
            ))}
          </section>
        </div>
      </section>
    </main>
  );
}
