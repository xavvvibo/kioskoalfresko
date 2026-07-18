import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { getInventoryOpeningSessionDetail } from "@/lib/admin-kiosko/database";
import { AdminHeader } from "../../../_components/AdminHeader";

export const metadata: Metadata = {
  title: "Sesión de inventario inicial | Panel interno",
  description: "Revisión de evidencias y borrador de inventario físico de apertura.",
};

function statusClass(status: string) {
  if (status === "confirmed") return "border-emerald-300 bg-emerald-100 text-emerald-950";
  if (status === "excluded") return "border-white/15 bg-white/8 text-stone-100";
  if (status === "conflict") return "border-[#d94b2b]/40 bg-[#d94b2b]/12 text-[#f2c6bb]";
  return "border-amber-300 bg-amber-100 text-amber-950";
}

function statusLabel(status: string) {
  if (status === "pending_images") return "Pendiente imágenes";
  if (status === "pending_identification") return "Sin identificar";
  if (status === "proposed") return "Propuesta";
  if (status === "needs_review") return "Revisar";
  if (status === "confirmed") return "Confirmada";
  if (status === "excluded") return "Excluida";
  if (status === "conflict") return "Conflicto";
  return status;
}

export default async function InventoryOpeningDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  await requireAdminPermission("inventory_opening:manage");
  const { sessionId } = await params;
  const detailResult = await getInventoryOpeningSessionDetail(sessionId);

  if (!detailResult.ok) {
    return (
      <main className="min-h-screen bg-[#0d0d0d] text-white">
        <AdminHeader title="Sesión de inventario inicial" description="No se pudo cargar la sesión." />
        <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 md:py-12">
          <p className="rounded-2xl border border-[#d94b2b]/40 bg-[#d94b2b]/12 px-4 py-3 text-sm font-semibold text-[#f2c6bb]">{detailResult.error}</p>
        </section>
      </main>
    );
  }

  if (!detailResult.data) notFound();

  const { session, images, groups, lines, audit } = detailResult.data;
  const pendingLines = lines.filter((line) => ["pending_images", "pending_identification", "needs_review", "conflict"].includes(line.review_status)).length;

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Sesión de inventario inicial" description="Agrupación, identificación y borrador revisable. Sin aplicación automática de stock." />
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 md:py-12">
        <div className="flex flex-wrap gap-2">
          <Link href="/admin-kiosko/inventario/apertura" className="rounded-full border border-white/15 bg-white/6 px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white">Volver</Link>
          <Link href="/admin-kiosko/inventario" className="rounded-full border border-white/15 bg-white/6 px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white">Inventario</Link>
        </div>

        <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f2c6bb]">{(session.location_names || []).join(", ") || "Sin ubicación"}</p>
              <h1 className="mt-2 text-3xl font-black uppercase tracking-[-0.04em] text-[#fff8ef]">{session.name}</h1>
              <p className="mt-2 text-sm leading-6 text-stone-300">Corte: {session.cutoff_at.replace("T", " ").slice(0, 16)} · Estado: {session.status} · Origen: {session.origin}</p>
              {session.notes ? <p className="mt-2 text-sm text-stone-300">{session.notes}</p> : null}
            </div>
            <div className="rounded-[1.2rem] border border-amber-300/30 bg-amber-100/10 p-4 text-sm font-semibold text-amber-100">
              No aplicar stock hasta aprobación final con motivo y responsable.
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-5">
            {[
              ["Imágenes", images.length],
              ["Grupos", groups.length],
              ["Líneas", lines.length],
              ["Pendientes", pendingLines],
              ["Auditoría", audit.length],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f2c6bb]">{label}</p>
                <p className="mt-2 text-2xl font-black text-white">{String(value)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f2c6bb]">Agrupación</p>
              <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Fotos y unidades físicas</h2>
            </div>
            <p className="text-sm text-stone-300">Las fotos repetidas no se convierten en unidades sin revisión.</p>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {groups.slice(0, 18).map((group) => (
              <article key={group.id} className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-white">{group.group_code}</p>
                    <p className="mt-1 text-xs text-stone-400">{group.relation_type} · {group.unit_interpretation}</p>
                  </div>
                  <span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em] ${statusClass(group.review_status)}`}>{group.review_status}</span>
                </div>
                <p className="mt-3 text-sm text-stone-300">{group.image_ids.length} imágenes · {group.real_unit_count ?? "unidades por revisar"} {group.unit || ""}</p>
                {group.notes ? <p className="mt-2 text-xs text-stone-400">{group.notes}</p> : null}
              </article>
            ))}
            {!groups.length ? <p className="rounded-xl border border-white/10 bg-white/6 p-4 text-sm text-stone-300">Sin grupos importados todavía. Ejecuta el dry-run y revisa el informe antes de cargar datos.</p> : null}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f2c6bb]">Borrador</p>
              <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Líneas de inventario</h2>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.12em]">
              {["sin producto", "sin cantidad", "sin lote", "sin caducidad", "confirmado"].map((filter) => (
                <span key={filter} className="rounded-full border border-white/15 bg-white/8 px-3 py-1 text-stone-200">{filter}</span>
              ))}
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {lines.map((line) => (
              <article key={line.id} className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black text-white">{line.confirmed_name || line.detected_name || "Producto pendiente"}</h3>
                      <span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em] ${statusClass(line.review_status)}`}>{statusLabel(line.review_status)}</span>
                    </div>
                    <p className="mt-2 text-sm text-stone-300">
                      {line.brand || "Marca pendiente"} · {line.format || "Formato pendiente"} · EAN {line.ean || "pendiente"}
                    </p>
                  </div>
                  <p className="rounded-xl border border-white/10 bg-[#0d0d0d] px-3 py-2 text-sm font-black text-white">
                    {line.total_quantity ?? "-"} {line.unit || ""} · {line.unit_count ?? "-"} unidades
                  </p>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-stone-300 md:grid-cols-4">
                  <p><span className="font-black text-stone-100">Lote:</span> {line.manufacturer_lot || "pendiente"}</p>
                  <p><span className="font-black text-stone-100">Caducidad:</span> {line.expiry_date || "pendiente"}</p>
                  <p><span className="font-black text-stone-100">Ubicación:</span> {line.location_name || "pendiente"}</p>
                  <p><span className="font-black text-stone-100">Confianza:</span> {Math.round(Number(line.recognition_confidence || 0) * 100)}%</p>
                </div>
                {line.issues?.length ? (
                  <div className="mt-3 rounded-xl border border-amber-300/30 bg-amber-100/10 p-3 text-sm text-amber-100">
                    {(line.issues as string[]).slice(0, 3).map((issue) => <p key={issue}>{issue}</p>)}
                  </div>
                ) : null}
              </article>
            ))}
            {!lines.length ? <p className="rounded-xl border border-white/10 bg-white/6 p-4 text-sm text-stone-300">Sin líneas. Esta pantalla está preparada para revisar el borrador una vez cargada la sesión.</p> : null}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
          <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Historial</h2>
          <div className="mt-4 grid gap-2">
            {audit.map((entry) => (
              <p key={entry.id} className="rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-sm text-stone-200">
                {entry.created_at.replace("T", " ").slice(0, 16)} · {entry.action} · {entry.entity_type}
              </p>
            ))}
            {!audit.length ? <p className="text-sm text-stone-300">Sin eventos todavía.</p> : null}
          </div>
        </section>
      </section>
    </main>
  );
}
