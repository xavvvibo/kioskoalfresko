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
  sections?: Array<{
    title: string;
    items: string[];
  }>;
};

const responsible = "F. Javier Bocanegra Sanjuan";

export const adminDocuments: AdminDocument[] = [
  {
    slug: "plan-general-higiene-kiosko-alfresko",
    title: "Plan General de Higiene Kiosko Alfresko",
    category: "Documentación oficial",
    status: "Pendiente de revisión",
    lastReview: "Plantilla interna preparada",
    responsible,
    version: "borrador interno",
    description: "Plan General de Higiene adaptado al Kiosko Alfresko para revisión, firma y aportación documental.",
    href: "/admin-kiosko/documentacion/plan-general-higiene-kiosko-alfresko",
    pendingReason: "Plantilla interna preparada. Pendiente de revisar, firmar y aportar PDF definitivo.",
    recommendedAction: "Revisar datos reales del establecimiento, productos químicos, responsables y adjuntar versión firmada.",
    targetDate: "Antes de inspección",
    sections: [
      {
        title: "Identificación del establecimiento",
        items: [
          "Establecimiento: Kiosko Alfresko.",
          "Actividad: kiosko/restaurante con terraza y servicio de alimentos y bebidas.",
          "Ubicación: Parque San Sebastián, Ogíjares, Granada.",
          "Responsable sanitario interno: F. Javier Bocanegra Sanjuan.",
        ],
      },
      {
        title: "Zonas incluidas",
        items: [
          "Cocina y zona de elaboración.",
          "Barra y TPV/superficies de servicio.",
          "Cámaras, congeladores y equipos de frío.",
          "Almacén seco y zona de productos químicos segregados.",
          "Terraza, baños y zona de residuos.",
        ],
      },
      {
        title: "Equipos incluidos",
        items: [
          "Freidoras, plancha, mesas de trabajo, utensilios y tablas.",
          "Cámaras, congeladores, botelleros y arcones.",
          "Campana/extracción si aplica a la zona operativa.",
          "Cubos de residuos, contenedores y área de aceite usado.",
        ],
      },
      {
        title: "Controles operativos",
        items: [
          "Registro de temperaturas de equipos APPCC.",
          "Registro de limpieza y desinfección por zonas.",
          "Registro de control, filtrado/cambio y retirada de aceite de freidoras.",
          "Recepción de mercancías con proveedor, lote, caducidad, temperatura si aplica y estado.",
          "Trazabilidad por lote, etiquetas APPCC e incidencias/acciones correctoras.",
        ],
      },
      {
        title: "Exclusiones",
        items: [
          "Control de aguas no aplicado actualmente en este sprint. No se desarrolla ni se simulan registros de agua.",
        ],
      },
    ],
  },
  { slug: "memoria-tecnico-sanitaria", title: "Memoria Técnico Sanitaria", category: "Documentación oficial", status: "Pendiente de subir", lastReview: "Sin revisión registrada", responsible, version: "v1", description: "Documento base del expediente sanitario del establecimiento.", href: "/admin-kiosko/documentacion/memoria-tecnico-sanitaria", fileUrl: "/admin-documents/memoria-tecnico-sanitaria.pdf", pendingReason: "PDF documental no aportado al expediente digital.", recommendedAction: "Subir memoria sanitaria firmada y revisar datos del titular.", targetDate: "Antes de inspección" },
  { slug: "buenas-practicas", title: "Buenas Prácticas de Manipulación", category: "Documentación oficial", status: "Pendiente de subir", lastReview: "Sin revisión registrada", responsible, version: "v1", description: "Protocolo interno de manipulación higiénica de alimentos.", href: "/admin-kiosko/documentacion/buenas-practicas", fileUrl: "/admin-documents/buenas-practicas-manipulacion.pdf", pendingReason: "PDF documental no aportado al expediente digital.", recommendedAction: "Subir protocolo vigente de buenas prácticas.", targetDate: "Antes de inspección" },
  { slug: "libros-registro-appcc", title: "Libros Registro APPCC", category: "Documentación oficial", status: "Pendiente de subir", lastReview: "Sin revisión registrada", responsible, version: "v1", description: "Libros y modelos de registro del sistema APPCC.", href: "/admin-kiosko/documentacion/libros-registro-appcc", fileUrl: "/admin-documents/libros-registro-appcc.pdf", pendingReason: "PDF documental no aportado al expediente digital.", recommendedAction: "Subir modelos de registro o conservar referencia al registro digital.", targetDate: "Antes de inspección" },
  { slug: "plan-appcc", title: "Plan APPCC", category: "Documentación oficial", status: "Pendiente de subir", lastReview: "Sin revisión registrada", responsible, version: "v1", description: "Plan de autocontrol sanitario.", href: "/admin-kiosko/documentacion/plan-appcc", pendingReason: "Documento principal APPCC pendiente de aportar.", recommendedAction: "Subir plan APPCC completo con peligros, PCC y medidas correctoras.", targetDate: "Prioridad 1" },
  {
    slug: "plan-limpieza-desinfeccion",
    title: "Plan de limpieza y desinfección",
    category: "Documentación oficial",
    status: "Pendiente de revisión",
    lastReview: "Plantilla interna preparada",
    responsible,
    version: "borrador interno",
    description: "Plan de limpieza, productos, frecuencias y responsables.",
    href: "/admin-kiosko/documentacion/plan-limpieza-desinfeccion",
    pendingReason: "Plantilla interna preparada. Pendiente de aportar fichas de seguridad y PDF firmado.",
    recommendedAction: "Revisar productos químicos reales, fichas técnicas y responsables por turno.",
    targetDate: "Prioridad 1",
    sections: [
      {
        title: "Zonas y equipos mínimos",
        items: [
          "Barra: limpieza diaria de superficies de servicio, TPV y zonas de contacto.",
          "Cocina: limpieza diaria de superficies, útiles, mesas y puntos de elaboración.",
          "Plancha: retirada de restos, desengrase y verificación al cierre.",
          "Freidoras: limpieza exterior diaria, filtrado/cambio según registro y limpieza de cuba cuando proceda.",
          "Campana/extracción: limpieza superficial periódica y mantenimiento cuando aplique.",
          "Cámaras y congeladores: limpieza programada, control de derrames y orden por lotes.",
          "Almacén: orden, segregación de químicos y limpieza periódica.",
          "Terraza y baños: limpieza diaria y reposición higiénica.",
          "Cubos/residuos: vaciado, limpieza y control de olores.",
        ],
      },
      {
        title: "Datos a registrar",
        items: [
          "Qué se limpia, producto utilizado, método, frecuencia, responsable, verificación y observaciones/incidencias.",
          "Las incidencias se registran sin borrar el control original y deben incluir acción correctora.",
        ],
      },
    ],
  },
  { slug: "plan-ddd-control-plagas", title: "Plan DDD / control de plagas", category: "Documentación oficial", status: "Pendiente de subir", lastReview: "Sin revisión registrada", responsible, version: "v1", description: "Control preventivo y correctivo de plagas.", href: "/admin-kiosko/documentacion/plan-ddd-control-plagas", pendingReason: "Contrato o certificado DDD pendiente.", recommendedAction: "Subir contrato, certificados de actuación y plano de cebos si aplica.", targetDate: "Prioridad 2" },
  { slug: "control-agua-no-aplica", title: "Control de agua no aplicado actualmente", category: "Documentación oficial", status: "Pendiente de revisión", lastReview: "Criterio interno indicado", responsible, version: "nota interna", description: "Nota de alcance: el control de aguas no se desarrolla en este sprint y no se simulan registros.", href: "/admin-kiosko/documentacion/control-agua-no-aplica", pendingReason: "Pendiente de confirmar alcance real con documentación del establecimiento.", recommendedAction: "Aportar criterio sanitario real si el control de agua fuese exigible por instalación o actividad.", targetDate: "Revisión ordinaria" },
  { slug: "plan-residuos", title: "Plan de residuos", category: "Documentación oficial", status: "Pendiente de subir", lastReview: "Sin revisión registrada", responsible, version: "v1", description: "Gestión interna de residuos y retirada.", href: "/admin-kiosko/documentacion/plan-residuos", pendingReason: "Plan documental pendiente de aportar.", recommendedAction: "Subir procedimiento de gestión y retirada de residuos.", targetDate: "Prioridad 3" },
  { slug: "plan-trazabilidad", title: "Plan de trazabilidad", category: "Documentación oficial", status: "Pendiente de subir", lastReview: "Sin revisión registrada", responsible, version: "v1", description: "Sistema de identificación y seguimiento de productos.", href: "/admin-kiosko/documentacion/plan-trazabilidad", pendingReason: "Plan documental pendiente de aportar.", recommendedAction: "Subir procedimiento de lotes, proveedores, recepciones y retirada.", targetDate: "Prioridad 1" },
  { slug: "plan-mantenimiento", title: "Plan de mantenimiento", category: "Documentación oficial", status: "Pendiente de subir", lastReview: "Sin revisión registrada", responsible, version: "v1", description: "Mantenimiento preventivo y correctivo de equipos.", href: "/admin-kiosko/documentacion/plan-mantenimiento", pendingReason: "Plan documental pendiente de aportar.", recommendedAction: "Subir plan preventivo y certificados de intervenciones.", targetDate: "Prioridad 3" },
  { slug: "plan-alergenos", title: "Plan de alérgenos", category: "Documentación oficial", status: "Pendiente de subir", lastReview: "Sin revisión registrada", responsible, version: "v1", description: "Gestión de alérgenos e información al consumidor.", href: "/admin-kiosko/documentacion/plan-alergenos", pendingReason: "Plan documental pendiente de aportar.", recommendedAction: "Subir matriz de alérgenos y procedimiento de información al cliente.", targetDate: "Prioridad 1" },
  { slug: "fichas-tecnicas", title: "Fichas técnicas", category: "Documentación oficial", status: "Pendiente de subir", lastReview: "Sin revisión registrada", responsible, version: "v1", description: "Fichas técnicas de productos, materias primas y equipos relevantes.", href: "/admin-kiosko/documentacion/fichas-tecnicas", pendingReason: "Fichas técnicas pendientes de aportar.", recommendedAction: "Subir fichas de productos críticos y materias primas principales.", targetDate: "Prioridad 2" },
  { slug: "formacion-manipuladores", title: "Formación manipuladores", category: "Documentación oficial", status: "Pendiente de subir", lastReview: "Sin revisión registrada", responsible, version: "v1", description: "Documentación de formación de manipuladores.", href: "/admin-kiosko/documentacion/formacion-manipuladores", pendingReason: "Certificados de formación pendientes.", recommendedAction: "Subir certificados vigentes del personal manipulador.", targetDate: "Prioridad 2" },
  { slug: "contrato-gestor-aceite-usado", title: "Contrato gestor aceite usado", category: "Documentación oficial", status: "Pendiente de subir", lastReview: "Sin revisión registrada", responsible, version: "v1", description: "Contrato o datos del proveedor autorizado para retirada de aceite usado.", href: "/admin-kiosko/documentacion/contrato-gestor-aceite-usado", pendingReason: "Contrato/datos del gestor de aceite usado pendientes de aportar.", recommendedAction: "Subir contrato, referencia de cliente, teléfono/email y justificantes de retirada.", targetDate: "Prioridad 1" },
  { slug: "justificantes-retirada-aceite", title: "Justificantes retirada aceite usado", category: "Documentación oficial", status: "Pendiente de subir", lastReview: "Sin revisión registrada", responsible, version: "v1", description: "Justificantes/documentos de retirada de aceite usado.", href: "/admin-kiosko/documentacion/justificantes-retirada-aceite", pendingReason: "Justificantes de retirada pendientes de aportar.", recommendedAction: "Subir justificantes emitidos por gestor autorizado.", targetDate: "Antes de inspección" },
  { slug: "fichas-productos-limpieza", title: "Fichas técnicas productos limpieza", category: "Documentación oficial", status: "Pendiente de subir", lastReview: "Sin revisión registrada", responsible, version: "v1", description: "Fichas técnicas y/o de seguridad de productos químicos usados en limpieza.", href: "/admin-kiosko/documentacion/fichas-productos-limpieza", pendingReason: "Fichas de productos químicos pendientes.", recommendedAction: "Subir fichas de seguridad de desengrasante, lavavajillas, desinfectante y productos usados.", targetDate: "Prioridad 1" },
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
  { slug: "verificacion-anual", title: "Verificación anual", category: "Registros digitales", status: "Disponible", lastReview: "Actualizado", responsible, version: "digital", description: "Verificación anual del sistema APPCC.", href: "/admin-kiosko/verificacion-anual" },
  { slug: "inspecciones", title: "Inspecciones", category: "Registros digitales", status: "Disponible", lastReview: "Actualizado", responsible, version: "digital", description: "Histórico de inspecciones y requerimientos.", href: "/admin-kiosko/inspecciones" },
];

export const prioritizedSanitaryDocuments = [
  "plan-general-higiene-kiosko-alfresko",
  "plan-appcc",
  "plan-limpieza-desinfeccion",
  "plan-trazabilidad",
  "plan-alergenos",
  "fichas-productos-limpieza",
  "contrato-gestor-aceite-usado",
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
