import { canAccessSection, type AdminRole, type AdminSection } from "@/lib/admin-kiosko/roles";
import { getOptionalAdminSession } from "@/lib/admin-kiosko/auth/permissions";
import { logoutAdminKioskoAction } from "../actions";
import { AdminNavLink } from "./AdminNavLink";

const navGroups = [
  {
    label: "Operativa",
    section: "operativa",
    links: [
      ["Temperaturas", "/admin-kiosko/temperaturas"],
      ["Limpieza", "/admin-kiosko/limpieza"],
      ["Recepción", "/admin-kiosko/recepcion-mercancia"],
      ["Checklists", "/admin-kiosko/checklists"],
      ["Incidencias", "/admin-kiosko/incidencias"],
    ],
  },
  {
    label: "Compras",
    section: "compras",
    links: [
      ["Bandeja entrada", "/admin-kiosko/inbox"],
      ["Contabilidad", "/admin-kiosko/contabilidad"],
      ["IA / OCR", "/admin-kiosko/ia"],
      ["Historial OCR", "/admin-kiosko/ia/historial"],
      ["Recepciones", "/admin-kiosko/recepcion-mercancia"],
      ["Proveedores", "/admin-kiosko/proveedores"],
      ["Inventario", "/admin-kiosko/inventario"],
      ["Trazabilidad", "/admin-kiosko/trazabilidad"],
    ],
  },
  {
    label: "Producción",
    section: "produccion",
    links: [
      ["Producción interna", "/admin-kiosko/produccion"],
      ["Recetas y lotes", "/admin-kiosko/produccion#recetas"],
      ["Etiquetas", "/admin-kiosko/etiquetas"],
      ["Etiquetas prep", "/admin-kiosko/etiquetas-prep"],
      ["Trazabilidad", "/admin-kiosko/trazabilidad"],
      ["Inventario", "/admin-kiosko/inventario"],
    ],
  },
  {
    label: "Inspección",
    section: "inspeccion",
    links: [
      ["Modo inspección", "/admin-kiosko/inspeccion"],
      ["Inspección express", "/admin-kiosko/inspeccion-express"],
      ["Inspección en directo", "/admin-kiosko/inspeccion-directo"],
      ["Documentación", "/admin-kiosko/documentacion"],
      ["Registros", "/admin-kiosko/registros"],
      ["Informe mensual", "/admin-kiosko/registros/informe"],
      ["Agua", "/admin-kiosko/agua"],
      ["Mantenimiento", "/admin-kiosko/mantenimiento"],
      ["Equipos", "/admin-kiosko/equipos"],
      ["Verificación anual", "/admin-kiosko/verificacion-anual"],
    ],
  },
  {
    label: "Personal",
    section: "personal",
    ownerOnly: true,
    links: [
      ["Resumen RRHH", "/admin-kiosko/personal"],
      ["Empleados", "/admin-kiosko/personal/empleados"],
      ["Turnos", "/admin-kiosko/personal/turnos"],
      ["Fichajes", "/admin-kiosko/personal/fichajes"],
      ["Incidencias", "/admin-kiosko/personal/incidencias"],
      ["Ausencias", "/admin-kiosko/personal/ausencias"],
      ["Saldos", "/admin-kiosko/personal/saldos"],
      ["Políticas", "/admin-kiosko/personal/politicas"],
      ["Calendario", "/admin-kiosko/personal/calendario"],
      ["Periodos", "/admin-kiosko/personal/periodos"],
      ["Variables", "/admin-kiosko/personal/variables"],
      ["Disponibilidad", "/admin-kiosko/personal/disponibilidad"],
      ["Cambios", "/admin-kiosko/personal/cambios"],
      ["Cobertura", "/admin-kiosko/personal/cobertura"],
      ["Ofertas", "/admin-kiosko/personal/ofertas"],
      ["Notificaciones", "/admin-kiosko/personal/notificaciones"],
      ["Informes", "/admin-kiosko/personal/informes"],
    ],
  },
  {
    label: "Configuración",
    section: "configuracion",
    ownerOnly: true,
    links: [
      ["Configuración", "/admin-kiosko/configuracion"],
      ["Impresoras", "/admin-kiosko/configuracion/impresoras"],
      ["Usuarios", "/admin-kiosko/usuarios"],
      ["Calendario operativo", "/admin-kiosko/configuracion/calendario"],
      ["Equipos", "/admin-kiosko/equipos"],
      ["Proveedores", "/admin-kiosko/proveedores"],
    ],
  },
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

export async function AdminHeader({
  title,
  description,
  inspectorMode = false,
  role,
}: {
  title: string;
  description: string;
  inspectorMode?: boolean;
  role?: AdminRole;
}) {
  const session = role ? null : await getOptionalAdminSession();
  const effectiveRole = role || session?.role || "owner";
  const groups = navGroups
    .filter((group) => (!group.ownerOnly || effectiveRole === "owner") && canAccessSection(effectiveRole, group.section as AdminSection))
    .map((group) => inspectorMode
      ? { ...group, links: group.links.filter(([label]) => inspectorNavLabels.has(label)) }
      : group)
    .filter((group) => group.links.length);

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
            <AdminNavLink
              href="/admin-kiosko"
              exact
              className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/6 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-white/12"
              activeClassName="border-[#d94b2b] bg-[#d94b2b] text-white shadow-[0_0_0_1px_rgba(242,198,187,0.18)]"
            >
              Panel
            </AdminNavLink>
            {effectiveRole === "owner" ? <AdminNavLink href="/admin-kiosko/owner" className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/6 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-white/12" activeClassName="border-[#d94b2b] bg-[#d94b2b] text-white">
              Owner
            </AdminNavLink> : null}
            <AdminNavLink href="/admin-kiosko/empleado" className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/6 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-white/12" activeClassName="border-[#d94b2b] bg-[#d94b2b] text-white">
              Empleado
            </AdminNavLink>
            {effectiveRole === "owner" ? <AdminNavLink href="/admin-kiosko/inspeccion" className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/6 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-white/12" activeClassName="border-[#d94b2b] bg-[#d94b2b] text-white">
              Inspector
            </AdminNavLink> : null}
            {effectiveRole === "owner" ? <AdminNavLink href="/admin-kiosko/buscar" className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/6 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-white/12" activeClassName="border-[#d94b2b] bg-[#d94b2b] text-white">
              Buscar
            </AdminNavLink> : null}
            <form action={logoutAdminKioskoAction}>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-stone-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2c6bb]"
              >
                Cerrar sesión
              </button>
            </form>
          </div> : null}
        </div>
        {!inspectorMode && effectiveRole === "owner" ? <form action="/admin-kiosko/buscar" className="mt-6 grid gap-3 rounded-[1.2rem] border border-white/10 bg-black/20 p-3 md:grid-cols-[1fr_auto]">
          <input name="q" placeholder="Buscar producto, lote, proveedor, documento, equipo, incidencia o fecha" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-sm text-stone-950 outline-none focus:border-[#d94b2b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2c6bb]" />
          <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2c6bb]">Buscar APPCC</button>
        </form> : null}
        <nav className="mt-6 grid gap-3 rounded-[1.2rem] border border-white/10 bg-black/20 p-3 lg:grid-cols-6" aria-label="Navegación interna APPCC">
          {groups.map((group) => (
            <details key={group.label} className="rounded-2xl border border-white/10 bg-white/6 p-3" open>
              <summary className="cursor-pointer text-[11px] font-black uppercase tracking-[0.14em] text-[#f2c6bb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2c6bb]">{group.label}</summary>
              <div className="mt-3 grid gap-2">
                {group.links.map(([label, href]) => (
                  <AdminNavLink key={href} href={href} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[11px] font-black uppercase tracking-[0.1em] text-white transition hover:border-[#d94b2b] hover:bg-[#d94b2b]" activeClassName="border-[#d94b2b] bg-[#d94b2b] text-white shadow-[0_0_0_1px_rgba(242,198,187,0.22)]">
                    {label}
                  </AdminNavLink>
                ))}
              </div>
            </details>
          ))}
        </nav>
      </div>
    </section>
  );
}
