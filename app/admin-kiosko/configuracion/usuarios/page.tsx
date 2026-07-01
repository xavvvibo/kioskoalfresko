import type { Metadata } from "next";
import { requireOwnerRole } from "@/lib/admin-kiosko/roles";
import { AdminHeader } from "../../_components/AdminHeader";

export const metadata: Metadata = {
  title: "Usuarios y permisos | Panel interno",
  description: "Gestión preparada de usuarios, roles y permisos APPCC.",
};

const areas = ["Operativa", "Compras", "Producción", "Inspección", "Contabilidad", "Configuración"];
const preparedUsers = [
  { name: "F. Javier Bocanegra Sanjuan", email: "owner@kioskoalfresko.local", role: "owner", status: "activo", last: "Sesión actual" },
  { name: "Empleado diario", email: "empleado@kioskoalfresko.local", role: "empleado", status: "preparado", last: "Pendiente" },
  { name: "Inspector", email: "inspector@kioskoalfresko.local", role: "inspector", status: "visual", last: "Acceso acompañado" },
];

export default async function UsuariosPage() {
  await requireOwnerRole();

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Usuarios y permisos" description="Estructura preparada para alta, baja, activación, roles y permisos por área." role="owner" />
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12">
        <div className="grid gap-6">
          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
            <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Alta de usuario</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {["Nombre", "Email", "Teléfono"].map((label) => <input key={label} placeholder={label} disabled className="rounded-2xl border border-white/12 bg-white/80 px-4 py-3 text-stone-950" />)}
              <select disabled className="rounded-2xl border border-white/12 bg-white/80 px-4 py-3 text-stone-950">
                <option>owner</option><option>empleado</option><option>inspector</option>
              </select>
              <button disabled className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white">Crear usuario</button>
              <button disabled className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white">Solicitar/restablecer contraseña</button>
            </div>
            <p className="mt-4 rounded-2xl border border-amber-300 bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-950">
              Preparado visualmente sin modificar la autenticación actual. La sesión existente sigue protegida por requireAdminSession.
            </p>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
            <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Usuarios preparados</h2>
            <div className="mt-5 grid gap-3">
              {preparedUsers.map((user) => (
                <article key={user.email} className="rounded-[1.4rem] border border-white/10 bg-white/6 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-black text-white">{user.name}</p>
                      <p className="mt-1 text-sm text-stone-300">{user.email} · rol {user.role} · último acceso {user.last}</p>
                    </div>
                    <span className="w-fit rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-950">{user.status}</span>
                  </div>
                  <div className="mt-4 grid gap-2 md:grid-cols-6">
                    {areas.map((area) => <p key={area} className="rounded-xl border border-white/10 bg-[#0d0d0d] px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-stone-200">{area}</p>)}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
