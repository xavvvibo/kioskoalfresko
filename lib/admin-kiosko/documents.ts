export type AdminDocumentStatus = "Disponible" | "Pendiente de subir PDF" | "Pendiente de revisión";

export type AdminDocument = {
  slug: string;
  title: string;
  category: "Documentación oficial" | "Registros digitales";
  status: AdminDocumentStatus;
  lastReview: string;
  responsible: string;
  version: string;
  description: string;
  href: string;
  fileUrl?: string;
};

const responsible = "F. Javier Bocanegra Sanjuan";

export const adminDocuments: AdminDocument[] = [
  { slug: "memoria-tecnico-sanitaria", title: "Memoria Técnico Sanitaria", category: "Documentación oficial", status: "Pendiente de subir PDF", lastReview: "Pendiente", responsible, version: "v1", description: "Documento base del expediente sanitario del establecimiento.", href: "/admin-kiosko/documentacion/memoria-tecnico-sanitaria", fileUrl: "/admin-documents/memoria-tecnico-sanitaria.pdf" },
  { slug: "buenas-practicas", title: "Buenas Prácticas de Manipulación", category: "Documentación oficial", status: "Pendiente de subir PDF", lastReview: "Pendiente", responsible, version: "v1", description: "Protocolo interno de manipulación higiénica de alimentos.", href: "/admin-kiosko/documentacion/buenas-practicas", fileUrl: "/admin-documents/buenas-practicas-manipulacion.pdf" },
  { slug: "libros-registro-appcc", title: "Libros Registro APPCC", category: "Documentación oficial", status: "Pendiente de subir PDF", lastReview: "Pendiente", responsible, version: "v1", description: "Libros y modelos de registro del sistema APPCC.", href: "/admin-kiosko/documentacion/libros-registro-appcc", fileUrl: "/admin-documents/libros-registro-appcc.pdf" },
  { slug: "plan-appcc", title: "Plan APPCC", category: "Documentación oficial", status: "Pendiente de subir PDF", lastReview: "Pendiente", responsible, version: "v1", description: "Plan de autocontrol sanitario.", href: "/admin-kiosko/documentacion/plan-appcc" },
  { slug: "plan-limpieza-desinfeccion", title: "Plan de limpieza y desinfección", category: "Documentación oficial", status: "Pendiente de subir PDF", lastReview: "Pendiente", responsible, version: "v1", description: "Plan de limpieza, productos, frecuencias y responsables.", href: "/admin-kiosko/documentacion/plan-limpieza-desinfeccion" },
  { slug: "plan-ddd-control-plagas", title: "Plan DDD / control de plagas", category: "Documentación oficial", status: "Pendiente de subir PDF", lastReview: "Pendiente", responsible, version: "v1", description: "Control preventivo y correctivo de plagas.", href: "/admin-kiosko/documentacion/plan-ddd-control-plagas" },
  { slug: "plan-control-agua", title: "Plan de control del agua", category: "Documentación oficial", status: "Pendiente de subir PDF", lastReview: "Pendiente", responsible, version: "v1", description: "Control del agua de consumo y registros asociados.", href: "/admin-kiosko/documentacion/plan-control-agua" },
  { slug: "plan-residuos", title: "Plan de residuos", category: "Documentación oficial", status: "Pendiente de subir PDF", lastReview: "Pendiente", responsible, version: "v1", description: "Gestión interna de residuos y retirada.", href: "/admin-kiosko/documentacion/plan-residuos" },
  { slug: "plan-trazabilidad", title: "Plan de trazabilidad", category: "Documentación oficial", status: "Pendiente de subir PDF", lastReview: "Pendiente", responsible, version: "v1", description: "Sistema de identificación y seguimiento de productos.", href: "/admin-kiosko/documentacion/plan-trazabilidad" },
  { slug: "plan-mantenimiento", title: "Plan de mantenimiento", category: "Documentación oficial", status: "Pendiente de subir PDF", lastReview: "Pendiente", responsible, version: "v1", description: "Mantenimiento preventivo y correctivo de equipos.", href: "/admin-kiosko/documentacion/plan-mantenimiento" },
  { slug: "plan-alergenos", title: "Plan de alérgenos", category: "Documentación oficial", status: "Pendiente de subir PDF", lastReview: "Pendiente", responsible, version: "v1", description: "Gestión de alérgenos e información al consumidor.", href: "/admin-kiosko/documentacion/plan-alergenos" },
  { slug: "fichas-tecnicas", title: "Fichas técnicas", category: "Documentación oficial", status: "Pendiente de subir PDF", lastReview: "Pendiente", responsible, version: "v1", description: "Fichas técnicas de productos, materias primas y equipos relevantes.", href: "/admin-kiosko/documentacion/fichas-tecnicas" },
  { slug: "formacion-manipuladores", title: "Formación manipuladores", category: "Documentación oficial", status: "Pendiente de subir PDF", lastReview: "Pendiente", responsible, version: "v1", description: "Documentación de formación de manipuladores.", href: "/admin-kiosko/documentacion/formacion-manipuladores" },
  { slug: "certificados-proveedores", title: "Certificados de proveedores", category: "Documentación oficial", status: "Pendiente de subir PDF", lastReview: "Pendiente", responsible, version: "v1", description: "Certificados sanitarios y documentación de proveedores.", href: "/admin-kiosko/documentacion/certificados-proveedores" },
  { slug: "licencia-autorizacion", title: "Licencia / autorización", category: "Documentación oficial", status: "Pendiente de subir PDF", lastReview: "Pendiente", responsible, version: "v1", description: "Licencias y autorizaciones administrativas.", href: "/admin-kiosko/documentacion/licencia-autorizacion" },
  { slug: "seguro-rc", title: "Seguro RC", category: "Documentación oficial", status: "Pendiente de subir PDF", lastReview: "Pendiente", responsible, version: "v1", description: "Seguro de responsabilidad civil.", href: "/admin-kiosko/documentacion/seguro-rc" },
  { slug: "registros-appcc", title: "Registros APPCC", category: "Registros digitales", status: "Disponible", lastReview: "Actualizado", responsible, version: "digital", description: "Consulta y exportación de registros APPCC.", href: "/admin-kiosko/registros" },
  { slug: "informe-mensual-appcc", title: "Informe mensual APPCC", category: "Registros digitales", status: "Disponible", lastReview: "Actualizado", responsible, version: "digital", description: "Informe mensual imprimible APPCC.", href: "/admin-kiosko/registros/informe" },
  { slug: "temperaturas", title: "Temperaturas", category: "Registros digitales", status: "Disponible", lastReview: "Actualizado", responsible, version: "digital", description: "Control diario de equipos sujetos a APPCC.", href: "/admin-kiosko/temperaturas" },
  { slug: "limpieza", title: "Limpieza", category: "Registros digitales", status: "Disponible", lastReview: "Actualizado", responsible, version: "digital", description: "Registros de limpieza y desinfección.", href: "/admin-kiosko/limpieza" },
  { slug: "aceite-freidora", title: "Aceite freidora", category: "Registros digitales", status: "Disponible", lastReview: "Actualizado", responsible, version: "digital", description: "Control de aceite de freidora.", href: "/admin-kiosko/aceite-freidora" },
  { slug: "recepcion-mercancias", title: "Recepción mercancías", category: "Registros digitales", status: "Disponible", lastReview: "Actualizado", responsible, version: "digital", description: "Recepciones, lotes y conformidad.", href: "/admin-kiosko/recepcion-mercancia" },
  { slug: "incidencias-acciones-correctoras", title: "Incidencias y acciones correctoras", category: "Registros digitales", status: "Disponible", lastReview: "Actualizado", responsible, version: "digital", description: "Incidencias sanitarias y seguimiento.", href: "/admin-kiosko/incidencias" },
  { slug: "mantenimiento", title: "Mantenimiento", category: "Registros digitales", status: "Disponible", lastReview: "Actualizado", responsible, version: "digital", description: "Mantenimiento preventivo y correctivo.", href: "/admin-kiosko/mantenimiento" },
  { slug: "agua", title: "Agua", category: "Registros digitales", status: "Disponible", lastReview: "Actualizado", responsible, version: "digital", description: "Control de agua.", href: "/admin-kiosko/agua" },
  { slug: "verificacion-anual", title: "Verificación anual", category: "Registros digitales", status: "Disponible", lastReview: "Actualizado", responsible, version: "digital", description: "Verificación anual del sistema APPCC.", href: "/admin-kiosko/verificacion-anual" },
  { slug: "inspecciones", title: "Inspecciones", category: "Registros digitales", status: "Disponible", lastReview: "Actualizado", responsible, version: "digital", description: "Histórico de inspecciones y requerimientos.", href: "/admin-kiosko/inspecciones" },
];

export function getAdminDocument(slug: string) {
  return adminDocuments.find((document) => document.slug === slug);
}
