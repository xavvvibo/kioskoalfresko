import Link from "next/link";
import { logoutAdminKioskoAction } from "../actions";

const adminNav = [
  ["Panel", "/admin-kiosko"],
  ["Buscar", "/admin-kiosko/buscar"],
  ["Inspección en directo", "/admin-kiosko/inspeccion-directo"],
  ["Modo inspección", "/admin-kiosko/inspeccion"],
  ["Registros", "/admin-kiosko/registros"],
  ["Documentación", "/admin-kiosko/documentacion"],
  ["Calendario", "/admin-kiosko/calendario"],
  ["Cronología", "/admin-kiosko/cronologia"],
  ["Inventario", "/admin-kiosko/inventario"],
  ["Producción", "/admin-kiosko/produccion"],
  ["Trazabilidad", "/admin-kiosko/trazabilidad"],
  ["Etiquetas", "/admin-kiosko/etiquetas"],
  ["Inspección express", "/admin-kiosko/inspeccion-express"],
  ["Temperaturas", "/admin-kiosko/temperaturas"],
  ["Limpieza", "/admin-kiosko/limpieza"],
  ["Aceite", "/admin-kiosko/aceite-freidora"],
  ["Mercancías", "/admin-kiosko/recepcion-mercancia"],
  ["Incidencias", "/admin-kiosko/incidencias"],
  ["Equipos", "/admin-kiosko/equipos"],
  ["Proveedores", "/admin-kiosko/proveedores"],
  ["Mantenimiento", "/admin-kiosko/mantenimiento"],
  ["Agua", "/admin-kiosko/agua"],
  ["Verificación anual", "/admin-kiosko/verificacion-anual"],
  ["Impresoras", "/admin-kiosko/configuracion/impresoras"],
  ["IA APPCC", "/admin-kiosko/ia"],
];

const inspectorNavLabels = new Set([
  "Panel",
  "Modo inspección",
  "Registros",
  "Documentación",
  "Calendario",
  "Inventario",
  "Producción",
  "Trazabilidad",
  "Temperaturas",
  "Limpieza",
  "Mercancías",
  "Incidencias",
  "Equipos",
]);

export function AdminHeader({ title, description, inspectorMode = false }: { title: string; description: string; inspectorMode?: boolean }) {
  const nav = inspectorMode ? adminNav.filter(([label]) => inspectorNavLabels.has(label)) : adminNav;

  return (
    <section className="border-b border-white/10 bg-[radial-gradient(circle_at_85%_10%,rgba(217,75,43,0.24),transparent_22%),linear-gradient(180deg,#171717_0%,#0d0d0d_100%)]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-[#d94b2b]/40 bg-[#d94b2b]/12 px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-[#f2c6bb]">
              Zona interna · Acceso solo personal autorizado
            </div>
            <p className="mt-8 text-xs font-black uppercase tracking-[0.22em] text-[#d94b2b]">KIOSKO ALFRESKO</p>
            <h1 className="mt-3 max-w-3xl text-[2.4rem] font-black uppercase leading-[0.92] tracking-[-0.05em] text-[#fff8ef] sm:text-[3.2rem] md:text-[4.4rem]">
              {title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-stone-300 md:text-lg">
              {description}
            </p>
          </div>
          {!inspectorMode ? <div className="flex flex-wrap gap-3">
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
          </div> : null}
        </div>
        {!inspectorMode ? <form action="/admin-kiosko/buscar" className="mt-6 grid gap-3 rounded-[1.2rem] border border-white/10 bg-black/20 p-3 md:grid-cols-[1fr_auto]">
          <input name="q" placeholder="Buscar producto, lote, proveedor, documento, equipo, incidencia o fecha" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-sm text-stone-950 outline-none focus:border-[#d94b2b]" />
          <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Buscar APPCC</button>
        </form> : null}
        <nav className="mt-6 overflow-x-auto rounded-[1.2rem] border border-white/10 bg-black/20 p-2" aria-label="Navegación interna APPCC">
          <div className="flex min-w-max gap-2">
            {nav.map(([label, href]) => (
              <Link key={href} href={href} className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white transition hover:border-[#d94b2b] hover:bg-[#d94b2b]">
                {label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </section>
  );
}
