import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { AdminHeader } from "../_components/AdminHeader";

export const metadata: Metadata = {
  title: "Acceso restringido | Panel interno",
  description: "Acceso restringido en el panel interno.",
};

export default async function ForbiddenAdminPage() {
  const session = await requireAdminSession();

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader
        title="Acceso restringido"
        description="Tu usuario no tiene permisos para abrir esta zona del panel interno."
        role={session.role}
      />
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="rounded-[1.4rem] border border-[#d94b2b]/40 bg-[#151515] p-6">
          <p className="text-sm font-semibold leading-6 text-stone-300">
            Se ha bloqueado el acceso a esta ruta. No se ha cargado información sensible.
          </p>
          <a href="/admin-kiosko/empleado" className="mt-5 inline-flex rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">
            Volver a mi panel
          </a>
        </div>
      </section>
    </main>
  );
}
