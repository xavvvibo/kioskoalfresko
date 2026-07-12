import type { Metadata } from "next";
import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { listAdminAuditLogs, listAdminUsers } from "@/lib/admin-kiosko/repositories/admin-users.repository";
import { createAdminUserAction, updateAdminUserAction } from "../actions";
import { AdminHeader } from "../_components/AdminHeader";

export const metadata: Metadata = {
  title: "Usuarios | Panel interno",
  description: "Alta, edición, desactivación y auditoría de usuarios internos.",
};

function dateLabel(value?: string | null) {
  if (!value) return "Pendiente";
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Madrid",
  }).format(new Date(value));
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Promise<{ saved?: string; error?: string }>;
}) {
  await requireAdminPermission("users:manage");
  const params = await searchParams;
  const [usersResult, auditResult] = await Promise.all([
    listAdminUsers(),
    listAdminAuditLogs(30),
  ]);
  const users = usersResult.ok ? usersResult.data : [];
  const auditLogs = auditResult.ok ? auditResult.data : [];

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Usuarios internos" description="Gestión owner de usuarios, roles, estado y accesos al admin-kiosko." role="owner" />
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12">
        <div className="grid gap-6">
          {params?.saved ? (
            <p className="rounded-2xl border border-emerald-300 bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-950">Cambios guardados.</p>
          ) : null}
          {params?.error ? (
            <p className="rounded-2xl border border-[#d94b2b]/40 bg-[#d94b2b]/12 px-4 py-3 text-sm font-semibold text-[#f2c6bb]">{params.error}</p>
          ) : null}

          <section className="rounded-[1.4rem] border border-white/10 bg-[#151515] p-5">
            <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Crear usuario</h2>
            <form action={createAdminUserAction} className="mt-5 grid gap-4 md:grid-cols-2">
              <input name="display_name" required placeholder="Nombre visible" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950" />
              <input name="username" required placeholder="Usuario" autoComplete="username" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950" />
              <input name="email" type="email" placeholder="Email opcional" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950" />
              <select name="role" defaultValue="employee" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950">
                <option value="employee">Empleado</option>
                <option value="owner">Owner</option>
              </select>
              <input name="password" type="password" required minLength={8} placeholder="Contraseña temporal" autoComplete="new-password" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950" />
              <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white">Crear usuario</button>
            </form>
          </section>

          <section className="rounded-[1.4rem] border border-white/10 bg-[#151515] p-5">
            <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Usuarios</h2>
            <div className="mt-5 grid gap-4">
              {users.map((user) => (
                <form key={user.id} action={updateAdminUserAction} className="rounded-[1.1rem] border border-white/10 bg-white/6 p-4">
                  <input type="hidden" name="id" value={user.id} />
                  <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_0.8fr_0.8fr]">
                    <input name="display_name" defaultValue={user.display_name} className="rounded-xl border border-white/12 bg-white px-3 py-2 text-sm text-stone-950" />
                    <input name="username" defaultValue={user.username} className="rounded-xl border border-white/12 bg-white px-3 py-2 text-sm text-stone-950" />
                    <input name="email" type="email" defaultValue={user.email || ""} placeholder="Email" className="rounded-xl border border-white/12 bg-white px-3 py-2 text-sm text-stone-950" />
                    <select name="role" defaultValue={user.role} className="rounded-xl border border-white/12 bg-white px-3 py-2 text-sm text-stone-950">
                      <option value="employee">Empleado</option>
                      <option value="owner">Owner</option>
                    </select>
                    <select name="status" defaultValue={user.status} className="rounded-xl border border-white/12 bg-white px-3 py-2 text-sm text-stone-950">
                      <option value="active">Activo</option>
                      <option value="disabled">Desactivado</option>
                    </select>
                  </div>
                  <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <p className="text-sm text-stone-300">Último acceso: {dateLabel(user.last_login_at)} · Creado: {dateLabel(user.created_at)}</p>
                    <div className="flex flex-wrap gap-2">
                      <input name="password" type="password" minLength={8} placeholder="Reset contraseña/PIN" autoComplete="new-password" className="rounded-xl border border-white/12 bg-white px-3 py-2 text-sm text-stone-950" />
                      <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white">Guardar</button>
                    </div>
                  </div>
                </form>
              ))}
              {!users.length ? <p className="text-sm text-stone-300">No hay usuarios internos todavía o falta ejecutar la SQL de tablas.</p> : null}
            </div>
          </section>

          <section className="rounded-[1.4rem] border border-white/10 bg-[#151515] p-5">
            <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Auditoría reciente</h2>
            <div className="mt-5 grid gap-2">
              {auditLogs.map((log) => (
                <article key={log.id} className="rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-3 text-sm text-stone-300">
                  <p><span className="font-black text-white">{log.action}</span> · {log.entity_type} · {dateLabel(log.created_at)}</p>
                  <p className="mt-1 text-xs text-stone-400">{JSON.stringify(log.metadata)}</p>
                </article>
              ))}
              {!auditLogs.length ? <p className="text-sm text-stone-300">Sin eventos de auditoría disponibles.</p> : null}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
