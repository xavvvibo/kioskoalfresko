import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { resolveAppccRecordFilters } from "@/lib/admin-kiosko/appcc-record-filters";
import { adminDocuments, wasteOilContract } from "@/lib/admin-kiosko/documents";
import { getAppccDocumentCatalog } from "@/lib/admin-kiosko/waste-oil-documents";
import { getAdminDashboardSummary, getExecutiveDashboardMetrics, getRecentCleaningRecords, getRecentFryerOilRecords, getRecentGoodsReceptionRecords, getRecentIncidentRecords, getRecentMaintenanceRecords, getRecentSupplierRecords, getRecentTemperatureRecords } from "@/lib/admin-kiosko/database";
import { AdminHeader } from "../_components/AdminHeader";
import { RecentRecords } from "../_components/RecentRecords";

export const metadata: Metadata = {
  title: "Modo inspección sanitaria | Panel interno",
  description: "Vista rápida de documentación, registros y estado APPCC.",
};

const quickLinks = [
  ["Plan General de Higiene", "/admin-kiosko/documentacion/plan-general-higiene-kiosko-alfresko"],
  ["Plan limpieza y desinfección", "/admin-kiosko/documentacion/plan-limpieza-desinfeccion"],
  ["Plan trazabilidad", "/admin-kiosko/documentacion/plan-trazabilidad"],
  ["Formación manipuladores", "/admin-kiosko/documentacion/formacion-manipuladores"],
  ["Contrato gestor aceite usado", "/admin-kiosko/documentacion/contrato-gestor-aceite-usado"],
  ["Registros APPCC", "/admin-kiosko/registros"],
  ["Informe mensual APPCC", "/admin-kiosko/registros/informe"],
  ["Temperaturas", "/admin-kiosko/temperaturas"],
  ["Limpieza", "/admin-kiosko/limpieza"],
  ["Aceite freidora", "/admin-kiosko/aceite-freidora"],
  ["Recepción mercancías", "/admin-kiosko/recepcion-mercancia"],
  ["Incidencias y acciones correctoras", "/admin-kiosko/incidencias"],
  ["Mantenimiento", "/admin-kiosko/mantenimiento"],
  ["Proveedores", "/admin-kiosko/proveedores"],
  ["Alérgenos", "/admin-kiosko/documentacion/plan-alergenos"],
  ["Fichas técnicas", "/admin-kiosko/documentacion/fichas-tecnicas"],
  ["Fichas productos limpieza", "/admin-kiosko/documentacion/fichas-productos-limpieza"],
  ["Control de plagas", "/admin-kiosko/documentacion/plan-ddd-control-plagas"],
  ["Verificación anual", "/admin-kiosko/verificacion-anual"],
  ["Cronología APPCC", "/admin-kiosko/cronologia"],
];

const essentialDocumentSlugs = [
  "plan-general-higiene-kiosko-alfresko",
  "plan-appcc",
  "plan-limpieza-desinfeccion",
  "plan-trazabilidad",
  "plan-alergenos",
  "formacion-manipuladores",
  "contrato-gestor-aceite-usado",
  "justificantes-retirada-aceite",
  "fichas-productos-limpieza",
  "plan-ddd-control-plagas",
  "plan-mantenimiento",
  "memoria-tecnico-sanitaria",
  "buenas-practicas",
  "libros-registro-appcc",
  "registros-appcc",
  "informe-mensual-appcc",
  "incidencias-acciones-correctoras",
  "temperaturas",
  "limpieza",
  "aceite-freidora",
  "mantenimiento",
  "certificados-proveedores",
  "fichas-tecnicas",
];

const hygienePlan = [
  ["Establecimiento", "Kiosko Alfresko · kiosko/restaurante con terraza"],
  ["Ubicación", "Parque San Sebastián, Ogíjares, Granada"],
  ["Responsable", "F. Javier Bocanegra Sanjuan"],
  ["Zonas", "Cocina, barra, cámaras, congeladores, almacén, terraza, baños y residuos"],
  ["Equipos", "Freidoras, plancha, cámaras, congeladores, mesas de trabajo, utensilios, TPV/barra y extracción si aplica"],
  ["Registros", "Temperaturas, limpieza, aceite, recepciones, incidencias, trazabilidad y etiquetas"],
  ["Agua", "Control de aguas no aplicado actualmente. No se han creado registros simulados."],
];

const cleaningPlanRows = [
  ["Barra", "Desinfectante alimentario / bayeta limpia", "Limpiar superficies de servicio, grifos, tiradores y TPV", "Diaria y tras servicio", "Turno"],
  ["Cocina", "Desengrasante y desinfectante apto", "Retirar restos, limpiar y desinfectar superficies", "Diaria", "Turno"],
  ["Plancha", "Rascador, desengrasante autorizado", "Retirar restos, desengrasar y verificar visualmente", "Cada uso/cierre", "Cocina"],
  ["Freidoras", "Desengrasante / limpieza de cuba", "Control visual, filtrado/cambio y limpieza exterior", "Diaria y según registro", "Cocina"],
  ["Campana/extracción", "Desengrasante", "Limpieza superficial y revisión de grasa acumulada", "Programada", "Responsable"],
  ["Cámaras", "Desinfectante alimentario", "Limpieza de baldas, derrames y orden FEFO", "Semanal o incidencia", "Turno"],
  ["Congeladores", "Limpieza interior programada", "Retirada de hielo/restos y control de envases", "Programada", "Turno"],
  ["Utensilios/mesas", "Lavado y desinfección", "Lavar, aclarar, desinfectar y secar", "Cada uso", "Cocina"],
  ["Almacén", "Limpieza general", "Orden, separación químicos/alimentos y control de residuos", "Semanal", "Responsable"],
  ["Terraza/baños/residuos", "Productos específicos por zona", "Limpieza, reposición y retirada de residuos", "Diaria", "Turno"],
];

export default async function ModoInspeccionPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  await requireAdminPermission("appcc:manage");
  const params = await searchParams;
  const recordFilters = resolveAppccRecordFilters(params);
  const inspectionRecordFilters = recordFilters.preset === "all" ? { ...recordFilters, limit: 10 } : { ...recordFilters, limit: 50 };
  const [dashboard, metricsResult, temperatures, incidents, goods, cleaning, oil, suppliers, maintenance, catalog] = await Promise.all([
    getAdminDashboardSummary(),
    getExecutiveDashboardMetrics(),
    getRecentTemperatureRecords(inspectionRecordFilters),
    getRecentIncidentRecords(),
    getRecentGoodsReceptionRecords(),
    getRecentCleaningRecords(inspectionRecordFilters),
    getRecentFryerOilRecords(inspectionRecordFilters),
    getRecentSupplierRecords(),
    getRecentMaintenanceRecords(),
    getAppccDocumentCatalog(),
  ]);
  const documents = catalog.ok ? catalog.data : adminDocuments;
  const wasteOilControl = catalog.ok ? catalog.wasteOilControl : null;
  const summary = dashboard.ok ? dashboard.data : null;
  const metrics = metricsResult.ok ? metricsResult.data : null;
  const pendingDocs = essentialDocumentSlugs
    .map((slug) => documents.find((item) => item.slug === slug))
    .filter((document): document is NonNullable<typeof document> => Boolean(document && document.status !== "Disponible" && document.status !== "Completado"));
  const oilManagerDocument = documents.find((item) => item.slug === "contrato-gestor-aceite-usado");
  const oilStatus = oilManagerDocument?.status === "Disponible" || oilManagerDocument?.status === "Completado"
    ? "Contrato gestor cargado"
    : "Sin contrato de gestor cargado";
  const status = !summary || summary.pendingAlerts > 0 || summary.openIncidents > 0 || summary.incidentTemperatureRecords > 0
    ? "Incidencias abiertas"
    : summary.inProgressAlerts > 0 || summary.reviewingTemperatureRecords > 0
      ? "Revisiones pendientes"
      : "Todo correcto";

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Modo inspección sanitaria" description="Vista rápida de documentación, registros y estado APPCC." inspectorMode role="inspector" />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12">
        <div className="grid gap-6">
          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
            <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Identificación</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {["KIOSKO ALFRESKO", "Actividad: kiosko/restaurante con terraza", "Ubicación: Parque San Sebastián, Ogíjares, Granada", "Responsable: F. Javier Bocanegra Sanjuan", "DNI: 75.136.778-X", "Control de aguas: no aplicado actualmente"].map((item) => (
                <p key={item} className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4 text-sm font-black text-white">{item}</p>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
            <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Estado general</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              {[
                ["Semáforo APPCC", status],
                ["Última revisión", summary?.latestMonthlySignature ? `${summary.latestMonthlySignature.month}/${summary.latestMonthlySignature.year}` : "Último registro no disponible todavía."],
                ["Incidencias abiertas", String(summary?.openIncidents || 0)],
                ["Alertas abiertas", String((summary?.pendingAlerts || 0) + (summary?.inProgressAlerts || 0))],
                ["Documentación pendiente", String(metrics?.pendingDocuments ?? 0)],
                ["Docs críticos pendientes", String(pendingDocs.length)],
                ["Stock bajo", String(metrics?.lowStockProducts ?? 0)],
                ["Caducidades próximas", String(metrics?.expiringProducts ?? 0)],
                ["Gestor aceite usado", oilStatus],
              ].map(([label, value]) => (
                <article key={label} className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">{label}</p>
                  <p className="mt-2 text-lg font-black text-white">{value}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Gestor autorizado de aceite usado</h2>
                <p className="mt-2 text-sm leading-6 text-stone-300">Contrato real de retirada, transporte y gestión de aceite vegetal usado.</p>
              </div>
              {oilManagerDocument?.documentUrl ? (
                <a href={oilManagerDocument.documentUrl} className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Abrir documento</a>
              ) : (
                <Link href="/admin-kiosko/documentacion/contrato-gestor-aceite-usado" className="rounded-full border border-white/12 bg-white/6 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Ver ficha</Link>
              )}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                ["Gestor", wasteOilContract.manager],
                ["Nº contrato", wasteOilContract.contractNumber],
                ["CIF", wasteOilContract.taxId],
                ["NIMA", wasteOilContract.nima],
                ["LER/CER", wasteOilContract.lerCer],
                ["Residuo", wasteOilContract.waste],
                ["Autorización", wasteOilContract.authorization],
                ["Frecuencia", wasteOilContract.frequency],
                ["Bidones", wasteOilContract.drums],
                ["Estado", wasteOilContract.status],
                ["Fecha firma", wasteOilContract.signedAt],
                ["Documento", oilManagerDocument?.uploadedFilename || "No localizado en admin_uploaded_documents"],
              ].map(([label, value]) => (
                <article key={label} className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">{label}</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-white">{value}</p>
                </article>
              ))}
            </div>
            {wasteOilControl ? (
              <p className="mt-4 rounded-2xl border border-white/10 bg-white/6 p-4 text-xs font-semibold leading-6 text-stone-300">
                Control mensual {wasteOilControl.month}: {wasteOilControl.status}. Fuente: {wasteOilControl.trace.source}; documentos comprobados: {wasteOilControl.trace.checkedDocuments}.
              </p>
            ) : null}
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Plan General de Higiene</h2>
                <p className="mt-2 text-sm leading-6 text-stone-300">Resumen adaptado al Kiosko Alfresko. Plantilla interna pendiente de revisar y firmar como documento definitivo.</p>
              </div>
              <Link href="/admin-kiosko/documentacion/plan-general-higiene-kiosko-alfresko" className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Ver plan completo</Link>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {hygienePlan.map(([label, value]) => (
                <article key={label} className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">{label}</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-white">{value}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Plan de limpieza y desinfección</h2>
                <p className="mt-2 text-sm leading-6 text-stone-300">Qué se limpia, con qué producto, cómo, frecuencia, responsable y verificación.</p>
              </div>
              <Link href="/admin-kiosko/limpieza" className="rounded-full border border-white/12 bg-white/6 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Registrar limpieza</Link>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-[58rem] w-full border-separate border-spacing-y-2 text-left text-sm">
                <thead className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f2c6bb]">
                  <tr><th className="px-3 py-2">Zona/equipo</th><th className="px-3 py-2">Producto</th><th className="px-3 py-2">Método</th><th className="px-3 py-2">Frecuencia</th><th className="px-3 py-2">Responsable</th></tr>
                </thead>
                <tbody>
                  {cleaningPlanRows.map(([area, product, method, frequency, owner]) => (
                    <tr key={area} className="bg-[#fffaf4] text-stone-950">
                      <td className="rounded-l-2xl px-3 py-3 font-black">{area}</td>
                      <td className="px-3 py-3">{product}</td>
                      <td className="px-3 py-3">{method}</td>
                      <td className="px-3 py-3">{frequency}</td>
                      <td className="rounded-r-2xl px-3 py-3">{owner}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
            <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Accesos rápidos</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/admin-kiosko/registros" className="rounded-full border border-white/12 bg-white/6 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Ver registros</Link>
              <Link href="/admin-kiosko/registros/descargar" className="rounded-full border border-white/12 bg-white/6 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Descargar CSV</Link>
              <Link href="/admin-kiosko/registros/informe" className="rounded-full border border-white/12 bg-white/6 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Ver informe mensual</Link>
              <Link href="/admin-kiosko/documentacion" className="rounded-full border border-white/12 bg-white/6 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Ir a documentación</Link>
              <Link href="/admin-kiosko/incidencias" className="rounded-full border border-white/12 bg-white/6 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Ir a incidencias</Link>
              <Link href="/admin-kiosko/trazabilidad" className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Ir a trazabilidad</Link>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {quickLinks.map(([label, href]) => (
                <Link key={label} href={href} className="rounded-[1.1rem] border border-white/10 bg-[#fffaf4] p-4 text-sm font-black text-stone-950">{label}</Link>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Aceite de freidoras y gestor autorizado</h2>
                <p className="mt-2 text-sm leading-6 text-stone-300">Control de estado, cambio/filtrado, retirada y documentación del gestor autorizado.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/admin-kiosko/aceite-freidora" className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Registrar aceite</Link>
                <Link href="/admin-kiosko/documentacion/contrato-gestor-aceite-usado" className="rounded-full border border-white/12 bg-white/6 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Contrato gestor</Link>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                ["Estado contrato", oilStatus],
                ["Justificantes retirada", documents.find((item) => item.slug === "justificantes-retirada-aceite")?.status || "Pendiente de aportar"],
                ["Últimos controles", oil.ok && oil.data.length ? `${oil.data.length} registros recientes` : "Último registro no disponible todavía."],
              ].map(([label, value]) => (
                <article key={label} className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">{label}</p>
                  <p className="mt-2 text-sm font-semibold text-white">{value}</p>
                </article>
              ))}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {oil.ok && oil.data.length ? oil.data.slice(0, 4).map((record) => (
                <article key={record.id} className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4 text-sm text-stone-200">
                  <p className="font-black text-white">{record.main}</p>
                  <p className="mt-1 text-xs text-stone-400">{record.record_date}{record.record_time ? ` · ${record.record_time.slice(0, 5)}` : ""} · {record.responsible || "Responsable no consignado"}</p>
                </article>
              )) : <p className="text-sm text-stone-400">Último registro de aceite no disponible todavía.</p>}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
            <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Alertas sanitarias</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {metrics?.alerts.length ? metrics.alerts.slice(0, 8).map((alert) => (
                <Link key={alert.id} href={alert.href} className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4 text-sm text-stone-200">
                  <span className="block font-black text-white">{alert.title}</span>
                  <span className="mt-1 block">{alert.detail}</span>
                </Link>
              )) : <p className="text-sm text-stone-400">No hay alertas técnicas pendientes.</p>}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
            <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Documentación esencial</h2>
            {pendingDocs.length ? (
              <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-100 p-4 text-sm font-semibold text-amber-950">
                Documentación pendiente de completar: {pendingDocs.map((document) => document.title).join(", ")}.
              </div>
            ) : null}
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-[42rem] w-full border-separate border-spacing-y-2 text-left text-sm">
                <thead className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f2c6bb]">
                  <tr><th className="px-3 py-2">Documento</th><th className="px-3 py-2">Estado</th><th className="px-3 py-2">Acción</th></tr>
                </thead>
                <tbody>
                  {essentialDocumentSlugs.map((slug) => {
                    const document = documents.find((item) => item.slug === slug);
                    if (!document) return null;
                    return (
                      <tr key={slug} className="bg-[#fffaf4] text-stone-950">
                        <td className="rounded-l-2xl px-3 py-3 font-black">{document.title}</td>
                        <td className="px-3 py-3">{document.status}</td>
                        <td className="rounded-r-2xl px-3 py-3"><Link href={document.href} className="font-black text-[#d94b2b]">Ver</Link></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="lg:col-span-2 rounded-[2rem] border border-white/10 bg-[#151515] p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Registros recientes APPCC</h2>
                  <p className="mt-2 text-sm text-stone-300">Ordenados de más reciente a más antiguo. Cambia el periodo para enseñar la ventana de inspección solicitada.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href="/admin-kiosko/inspeccion?period=7d" className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white">Últimos 7 días</Link>
                  <Link href="/admin-kiosko/inspeccion?period=month" className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white">Último mes</Link>
                  <Link href="/admin-kiosko/temperaturas?period=all&status=incidencia" className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white">Incidencias temperatura</Link>
                </div>
              </div>
            </div>
            <RecentRecords records={temperatures.ok ? temperatures.data : []} title="Últimas temperaturas" intro="Temperaturas filtradas por el periodo seleccionado." showResponsible={false} />
            <RecentRecords records={incidents.ok ? incidents.data : []} title="Últimas incidencias" showResponsible={false} />
            <RecentRecords records={goods.ok ? goods.data : []} title="Últimas recepciones" />
            <RecentRecords records={cleaning.ok ? cleaning.data : []} title="Últimos registros de limpieza" intro="Limpieza filtrada por el periodo seleccionado." showResponsible={false} />
            <RecentRecords records={oil.ok ? oil.data : []} title="Últimos controles de aceite" intro="Aceite filtrado por el periodo seleccionado." showResponsible={false} />
            <RecentRecords records={suppliers.ok ? suppliers.data : []} title="Proveedores recientes" />
            <RecentRecords records={maintenance.ok ? maintenance.data : []} title="Mantenimiento reciente" />
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
            <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Trazabilidad y etiquetas</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              {[
                ["Buscar lote/producto/proveedor", "/admin-kiosko/trazabilidad"],
                ["Inventario por lotes", "/admin-kiosko/inventario"],
                ["Producción interna", "/admin-kiosko/produccion"],
                ["Etiquetas APPCC", "/admin-kiosko/etiquetas"],
              ].map(([label, href]) => (
                <Link key={label} href={href} className="rounded-[1.1rem] border border-white/10 bg-[#fffaf4] p-4 text-sm font-black text-stone-950">{label}</Link>
              ))}
            </div>
          </section>

          <div className="flex flex-wrap gap-3">
            <Link href="/admin-kiosko/registros/descargar" className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Descargar CSV registros</Link>
            <Link href="/admin-kiosko/registros/informe" className="rounded-full border border-white/12 bg-white/6 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Ver informe mensual</Link>
            <Link href="/admin-kiosko" className="rounded-full border border-white/12 bg-white/6 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Volver al panel</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
