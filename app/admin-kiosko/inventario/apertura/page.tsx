import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { listInventoryOpeningSessions } from "@/lib/admin-kiosko/database";
import { AdminHeader } from "../../_components/AdminHeader";
import { createInventoryOpeningSessionAction } from "../../actions";

export const metadata: Metadata = {
  title: "Inventario inicial | Panel interno",
  description: "Asistente revisable para inventario físico de apertura.",
};

function statusLabel(status: string) {
  if (status === "draft") return "Borrador";
  if (status === "importing") return "Importando";
  if (status === "reviewing") return "En revisión";
  if (status === "ready_for_approval") return "Listo para aprobar";
  if (status === "approved") return "Aprobado";
  if (status === "applied") return "Aplicado";
  if (status === "cancelled") return "Cancelado";
  return status;
}

function statusClass(status: string) {
  if (status === "applied" || status === "approved") return "border-emerald-300 bg-emerald-100 text-emerald-950";
  if (status === "ready_for_approval" || status === "reviewing") return "border-amber-300 bg-amber-100 text-amber-950";
  if (status === "cancelled") return "border-white/15 bg-white/8 text-stone-100";
  return "border-[#d94b2b]/40 bg-[#d94b2b]/12 text-[#f2c6bb]";
}

export default async function InventoryOpeningPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  await requireAdminPermission("inventory_opening:manage");
  const params = await searchParams;
  const sessionsResult = await listInventoryOpeningSessions();
  const sessions = sessionsResult.ok ? sessionsResult.data : [];

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Inventario inicial" description="Inventario físico de apertura con evidencias, revisión y ajustes auditables." />
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 md:py-12">
        {params?.error ? (
          <p className="rounded-2xl border border-[#d94b2b]/40 bg-[#d94b2b]/12 px-4 py-3 text-sm font-semibold text-[#f2c6bb]">
            No se pudo crear la sesión: {params.error}
          </p>
        ) : null}
        {!sessionsResult.ok ? (
          <p className="rounded-2xl border border-amber-300/40 bg-amber-100/10 px-4 py-3 text-sm font-semibold text-amber-100">
            Migración pendiente o Supabase no disponible: {sessionsResult.error}
          </p>
        ) : null}

        <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f2c6bb]">Fase segura</p>
              <h1 className="mt-2 text-3xl font-black uppercase tracking-[-0.04em] text-[#fff8ef]">Asistente de apertura</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-300">
                Importa evidencias, agrupa fotos y prepara un borrador. Esta fase no crea stock, no cierra lotes y no toca movimientos históricos.
              </p>
            </div>
            <Link href="/admin-kiosko/inventario" className="w-fit rounded-full border border-white/15 bg-white/8 px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white">Volver a inventario</Link>
          </div>

          <form action={createInventoryOpeningSessionAction} className="mt-6 grid gap-3 lg:grid-cols-[1fr_14rem_14rem_12rem]">
            <label className="grid gap-2 text-sm font-semibold text-stone-200">
              Nombre
              <input name="name" required defaultValue="Inventario congelador 08/07/2026" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-stone-200">
              Corte
              <input name="cutoff_at" required type="datetime-local" defaultValue="2026-07-08T23:59" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-stone-200">
              Ubicaciones
              <input name="locations" defaultValue="Congelador" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-stone-200">
              Origen
              <select name="origin" defaultValue="photo_zip" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950">
                <option value="photo_zip">ZIP fotos</option>
                <option value="manual">Manual</option>
                <option value="mixed">Mixto</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-stone-200 lg:col-span-3">
              Notas
              <input name="notes" placeholder="Motivo, responsable o alcance" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950" />
            </label>
            <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white">
              Crear sesión
            </button>
          </form>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          {[
            ["Sesiones", sessions.length],
            ["Imágenes", sessions.reduce((total, session) => total + session.image_count, 0)],
            ["Confirmadas", sessions.reduce((total, session) => total + session.confirmed_line_count, 0)],
            ["Incidencias", sessions.reduce((total, session) => total + session.issue_count, 0)],
          ].map(([label, value]) => (
            <article key={label} className="rounded-[1.4rem] border border-white/10 bg-[#151515] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">{label}</p>
              <p className="mt-2 text-3xl font-black text-white">{String(value)}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-3">
          {sessions.map((session) => (
            <Link key={session.id} href={`/admin-kiosko/inventario/apertura/${session.id}`} className="rounded-[1.6rem] border border-white/10 bg-[#151515] p-5 transition hover:border-[#d94b2b]">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f2c6bb]">{(session.location_names || []).join(", ") || "Sin ubicación"}</p>
                  <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">{session.name}</h2>
                  <p className="mt-2 text-sm text-stone-300">Corte: {session.cutoff_at.replace("T", " ").slice(0, 16)} · Origen: {session.origin}</p>
                </div>
                <span className={`w-fit rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${statusClass(session.status)}`}>{statusLabel(session.status)}</span>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-4">
                {[
                  ["Imágenes", session.image_count],
                  ["Grupos", session.group_count],
                  ["Líneas OK", session.confirmed_line_count],
                  ["Incidencias", session.issue_count],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-white/10 bg-white/6 px-3 py-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-stone-400">{label}</p>
                    <p className="mt-1 text-lg font-black text-white">{String(value)}</p>
                  </div>
                ))}
              </div>
            </Link>
          ))}
          {!sessions.length ? (
            <p className="rounded-[1.6rem] border border-white/10 bg-[#151515] p-5 text-sm text-stone-300">
              No hay sesiones todavía. Crea una sesión y usa el importador dry-run para preparar evidencias antes de aplicar la migración.
            </p>
          ) : null}
        </section>
      </section>
    </main>
  );
}
