export type AdminDocumentStatus = "Disponible" | "Pendiente de subir" | "Caducado" | "Pendiente de revisión";

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
  pendingReason?: string;
  recommendedAction?: string;
  targetDate?: string;
};

const responsible = "F. Javier Bocanegra Sanjuan";

export const adminDocuments: AdminDocument[] = [
  { slug: "memoria-tecnico-sanitaria", title: "Memoria Técnico Sanitaria", category: "Documentación oficial", status: "Pendiente de subir", lastReview: "Sin revisión registrada", responsible, version: "v1", description: "Documento base del expediente sanitario del establecimiento.", href: "/admin-kiosko/documentacion/memoria-tecnico-sanitaria", fileUrl: "/admin-documents/memoria-tecnico-sanitaria.pdf", pendingReason: "PDF documental no aportado al expediente digital.", recommendedAction: "Subir memoria sanitaria firmada y revisar datos del titular.", targetDate: "Antes de inspección" },
  { slug: "buenas-practicas", title: "Buenas Prácticas de Manipulación", category: "Documentación oficial", status: "Pendiente de subir", lastReview: "Sin revisión registrada", responsible, version: "v1", description: "Protocolo interno de manipulación higiénica de alimentos.", href: "/admin-kiosko/documentacion/buenas-practicas", fileUrl: "/admin-documents/buenas-practicas-manipulacion.pdf", pendingReason: "PDF documental no aportado al expediente digital.", recommendedAction: "Subir protocolo vigente de buenas prácticas.", targetDate: "Antes de inspección" },
  { slug: "libros-registro-appcc", title: "Libros Registro APPCC", category: "Documentación oficial", status: "Pendiente de subir", lastReview: "Sin revisión registrada", responsible, version: "v1", description: "Libros y modelos de registro del sistema APPCC.", href: "/admin-kiosko/documentacion/libros-registro-appcc", fileUrl: "/admin-documents/libros-registro-appcc.pdf", pendingReason: "PDF documental no aportado al expediente digital.", recommendedAction: "Subir modelos de registro o conservar referencia al registro digital.", targetDate: "Antes de inspección" },
  { slug: "plan-appcc", title: "Plan APPCC", category: "Documentación oficial", status: "Pendiente de subir", lastReview: "Sin revisión registrada", responsible, version: "v1", description: "Plan de autocontrol sanitario.", href: "/admin-kiosko/documentacion/plan-appcc", pendingReason: "Documento principal APPCC pendiente de aportar.", recommendedAction: "Subir plan APPCC completo con peligros, PCC y medidas correctoras.", targetDate: "Prioridad 1" },
  { slug: "plan-limpieza-desinfeccion", title: "Plan de limpieza y desinfección", category: "Documentación oficial", status: "Pendiente de subir", lastReview: "Sin revisión registrada", responsible, version: "v1", description: "Plan de limpieza, productos, frecuencias y responsables.", href: "/admin-kiosko/documentacion/plan-limpieza-desinfeccion", pendingReason: "Plan documental pendiente de aportar.", recommendedAction: "Subir plan con zonas, frecuencias, productos y fichas de seguridad.", targetDate: "Prioridad 1" },
  { slug: "plan-ddd-control-plagas", title: "Plan DDD / control de plagas", category: "Documentación oficial", status: "Pendiente de subir", lastReview: "Sin revisión registrada", responsible, version: "v1", description: "Control preventivo y correctivo de plagas.", href: "/admin-kiosko/documentacion/plan-ddd-control-plagas", pendingReason: "Contrato o certificado DDD pendiente.", recommendedAction: "Subir contrato, certificados de actuación y plano de cebos si aplica.", targetDate: "Prioridad 2" },
  { slug: "plan-control-agua", title: "Plan de control del agua", category: "Documentación oficial", status: "Pendiente de subir", lastReview: "Sin revisión registrada", responsible, version: "v1", description: "Control del agua de consumo y registros asociados.", href: "/admin-kiosko/documentacion/plan-control-agua", pendingReason: "Plan documental pendiente de aportar.", recommendedAction: "Subir protocolo de control de agua y analíticas disponibles.", targetDate: "Prioridad 2" },
  { slug: "plan-residuos", title: "Plan de residuos", category: "Documentación oficial", status: "Pendiente de subir", lastReview: "Sin revisión registrada", responsible, version: "v1", description: "Gestión interna de residuos y retirada.", href: "/admin-kiosko/documentacion/plan-residuos", pendingReason: "Plan documental pendiente de aportar.", recommendedAction: "Subir procedimiento de gestión y retirada de residuos.", targetDate: "Prioridad 3" },
  { slug: "plan-trazabilidad", title: "Plan de trazabilidad", category: "Documentación oficial", status: "Pendiente de subir", lastReview: "Sin revisión registrada", responsible, version: "v1", description: "Sistema de identificación y seguimiento de productos.", href: "/admin-kiosko/documentacion/plan-trazabilidad", pendingReason: "Plan documental pendiente de aportar.", recommendedAction: "Subir procedimiento de lotes, proveedores, recepciones y retirada.", targetDate: "Prioridad 1" },
  { slug: "plan-mantenimiento", title: "Plan de mantenimiento", category: "Documentación oficial", status: "Pendiente de subir", lastReview: "Sin revisión registrada", responsible, version: "v1", description: "Mantenimiento preventivo y correctivo de equipos.", href: "/admin-kiosko/documentacion/plan-mantenimiento", pendingReason: "Plan documental pendiente de aportar.", recommendedAction: "Subir plan preventivo y certificados de intervenciones.", targetDate: "Prioridad 3" },
  { slug: "plan-alergenos", title: "Plan de alérgenos", category: "Documentación oficial", status: "Pendiente de subir", lastReview: "Sin revisión registrada", responsible, version: "v1", description: "Gestión de alérgenos e información al consumidor.", href: "/admin-kiosko/documentacion/plan-alergenos", pendingReason: "Plan documental pendiente de aportar.", recommendedAction: "Subir matriz de alérgenos y procedimiento de información al cliente.", targetDate: "Prioridad 1" },
  { slug: "fichas-tecnicas", title: "Fichas técnicas", category: "Documentación oficial", status: "Pendiente de subir", lastReview: "Sin revisión registrada", responsible, version: "v1", description: "Fichas técnicas de productos, materias primas y equipos relevantes.", href: "/admin-kiosko/documentacion/fichas-tecnicas", pendingReason: "Fichas técnicas pendientes de aportar.", recommendedAction: "Subir fichas de productos críticos y materias primas principales.", targetDate: "Prioridad 2" },
  { slug: "formacion-manipuladores", title: "Formación manipuladores", category: "Documentación oficial", status: "Pendiente de subir", lastReview: "Sin revisión registrada", responsible, version: "v1", description: "Documentación de formación de manipuladores.", href: "/admin-kiosko/documentacion/formacion-manipuladores", pendingReason: "Certificados de formación pendientes.", recommendedAction: "Subir certificados vigentes del personal manipulador.", targetDate: "Prioridad 2" },
  { slug: "certificados-proveedores", title: "Certificados de proveedores", category: "Documentación oficial", status: "Pendiente de subir", lastReview: "Sin revisión registrada", responsible, version: "v1", description: "Certificados sanitarios y documentación de proveedores.", href: "/admin-kiosko/documentacion/certificados-proveedores", pendingReason: "Certificados sanitarios de proveedores pendientes.", recommendedAction: "Solicitar y subir certificados o registros sanitarios de proveedores habituales.", targetDate: "Prioridad 2" },
  { slug: "licencia-autorizacion", title: "Licencia / autorización", category: "Documentación oficial", status: "Pendiente de subir", lastReview: "Sin revisión registrada", responsible, version: "v1", description: "Licencias y autorizaciones administrativas.", href: "/admin-kiosko/documentacion/licencia-autorizacion", pendingReason: "Licencia o autorización pendiente de aportar.", recommendedAction: "Subir licencia municipal/autorización sanitaria disponible.", targetDate: "Prioridad 2" },
  { slug: "seguro-rc", title: "Seguro RC", category: "Documentación oficial", status: "Pendiente de subir", lastReview: "Sin revisión registrada", responsible, version: "v1", description: "Seguro de responsabilidad civil.", href: "/admin-kiosko/documentacion/seguro-rc", pendingReason: "Póliza pendiente de aportar.", recommendedAction: "Subir póliza y recibo vigente del seguro de responsabilidad civil.", targetDate: "Prioridad 3" },
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

export const prioritizedSanitaryDocuments = [
  "plan-appcc",
  "plan-limpieza-desinfeccion",
  "plan-trazabilidad",
  "plan-alergenos",
  "plan-control-agua",
  "plan-ddd-control-plagas",
  "plan-residuos",
  "formacion-manipuladores",
  "certificados-proveedores",
  "licencia-autorizacion",
  "seguro-rc",
] as const;

export function getAdminDocument(slug: string) {
  return adminDocuments.find((document) => document.slug === slug);
}

export function hasDocumentPdf(document: AdminDocument) {
  return Boolean(document.fileUrl && document.status === "Disponible");
}

export function getDocumentStats() {
  const total = adminDocuments.length;
  const available = adminDocuments.filter((document) => document.status === "Disponible").length;
  const pending = adminDocuments.filter((document) => document.status === "Pendiente de subir").length;
  const expired = adminDocuments.filter((document) => document.status === "Caducado").length;
  const review = adminDocuments.filter((document) => document.status === "Pendiente de revisión").length;

  return {
    total,
    available,
    pending,
    expired,
    review,
    percent: total ? Math.round((available / total) * 100) : 0,
  };
}
