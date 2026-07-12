import type { ActionLink, InternalAdminLink, MenuCategory, ScheduleEvent, SeasonalScheduleItem, SeoLanding } from "@/types/site";
import { QAMARERO_BOOKING_URL, getQamareroReservationUrl } from "@/lib/integrations/qamarero";

export const siteConfig = {
  name: "Kiosko Alfresko",
  legalName: "Kiosko Alfresko",
  brandClaim: "Food · Drinks · Planes",
  subBrand: {
    name: "SMASH LAB",
    byline: "by Alfresko",
    fullName: "SMASH LAB by Alfresko",
  },
  siteUrl: "https://kioskoalfresko.es",
  domain: "kioskoalfresko.es",
  locale: "es_ES",
  description:
    "Kiosko Alfresko en Ogíjares: SMASH LAB by Alfresko, smash burgers, cocina para compartir, terraza, delivery y reservas en Qamarero.",
  location: {
    area: "Parque San Sebastián",
    city: "Ogíjares",
    province: "Granada",
    postalCode: "18151",
    region: "Andalucía",
    addressLine: "Parque San Sebastián",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Parque+San+Sebastián+Ogíjares",
  },
  contact: {
    phoneDisplay: "696 320 465",
    phoneHref: "tel:696320465",
    email: "info@kioskoalfresko.es",
    emailHref: "mailto:info@kioskoalfresko.es",
    whatsappDisplay: "+34 696 320 465",
    whatsappUrl: "https://wa.me/34696320465",
    orderWhatsappUrl: "https://wa.me/34696320465?text=Hola%2C%20quiero%20hacer%20un%20pedido%20para%20recoger%20en%20Kiosko%20Alfresko.",
    instagramUrl: "https://www.instagram.com/alfresko.granada/",
    instagramHandle: "@alfresko.granada",
    bookingUrl: QAMARERO_BOOKING_URL,
  },
  delivery: {
    glovoUrl: process.env.NEXT_PUBLIC_GLOVO_URL || "",
    uberEatsUrl: process.env.NEXT_PUBLIC_UBEREATS_URL || "",
  },
  ctas: {
    primary: { label: "Ver carta", href: "/carta" },
    secondary: { label: "Pedir ahora", href: "#pide-alfresko" },
    call: { label: "Llamar para recoger", href: "tel:696320465" },
    booking: { label: "Reservar mesa", href: getQamareroReservationUrl("hero") },
  },
  positioning: {
    headline: "No es un kiosko. Es el plan.",
    subheadline:
      "Descubre las nuevas burgers de SMASH LAB by Alfresko en el Parque San Sebastián de Ogíjares.",
    support: ["Martes a jueves y domingo · 21:00h a 24:00h", "Viernes y sábado · 21:00h a 01:30h", "Lunes cerrado"],
  },
  schedule: {
    currentLabel: "Horario actual",
    currentSummary: "Lunes cerrado. Martes, miércoles, jueves y domingo de 21:00h a 24:00h. Viernes y sábado de 21:00h a 01:30h.",
    note: "SMASH LAB by Alfresko, cocina para compartir, terraza, delivery y recogida en Kiosko Alfresko.",
    rows: [
      { day: "Lunes", hours: "Cerrado", opens: null, closes: null },
      { day: "Martes", hours: "21:00–24:00", opens: "21:00", closes: "00:00" },
      { day: "Miércoles", hours: "21:00–24:00", opens: "21:00", closes: "00:00" },
      { day: "Jueves", hours: "21:00–24:00", opens: "21:00", closes: "00:00" },
      { day: "Viernes", hours: "21:00–01:30", opens: "21:00", closes: "01:30" },
      { day: "Sábado", hours: "21:00–01:30", opens: "21:00", closes: "01:30" },
      { day: "Domingo", hours: "21:00–24:00", opens: "21:00", closes: "00:00" },
    ],
  },
};

export const seasonalSchedule: SeasonalScheduleItem[] = [
  { month: "Horario vigente", status: "confirmed", summary: "Lunes cerrado · Martes, miércoles, jueves y domingo 21:00h a 24:00h · Viernes y sábado 21:00h a 01:30h", note: "Consulta Instagram para cualquier ajuste puntual.", highlight: true },
];

export const maySchedule = {
  normalLabel: "Horario actual",
  normalHours: "Mar, mié, jue y dom · 21:00h a 24:00h · Vie y sáb · 21:00h a 01:30h",
  normalSummary: "Horario actual: lunes cerrado. Martes, miércoles, jueves y domingo de 21:00h a 24:00h. Viernes y sábado de 21:00h a 01:30h.",
  weekendNotice: "Horario actual",
  weekendLead: "SMASH LAB by Alfresko, cocina para compartir y terraza nocturna en Ogíjares.",
};

export const maySpecialEvents: ScheduleEvent[] = [
  {
    date: "Martes, miércoles, jueves y domingo",
    title: "SMASH LAB y terraza",
    hours: "21:00h a 24:00h",
    note: "Burgers, cocina para compartir, bebidas con tapa y reservas por Qamarero.",
    highlight: true,
  },
  {
    date: "Viernes y sábado",
    title: "Noches hasta la 01:30h",
    hours: "21:00h a 01:30h",
    note: "Reserva mesa en Qamarero o pide para recoger por teléfono y WhatsApp.",
    highlight: true,
  },
];

export const maySalesFocus = {
  title: "SMASH LAB by Alfresko",
  body: "Nueva submarca burger de Kiosko Alfresko: FERXA TRUFADA, BOURBON BACON y POLLO KICK.",
  extra: "Reserva por Qamarero o pide para recoger en Kiosko Alfresko.",
  microcopy: [
    "Parque San Sebastián · Ogíjares",
    "Burgers con patatas",
    "Tapas y terraza",
    "Recogida y delivery",
  ],
};

export const springHighlights = [
  {
    date: "SMASH LAB",
    title: "Nueva etapa burger en Kiosko Alfresko",
    detail: "FERXA TRUFADA, BOURBON BACON y POLLO KICK llegan a la carta de Kiosko Alfresko.",
  },
  {
    date: "Horario vigente",
    title: "Noches en Parque San Sebastián",
    detail: "Martes, miércoles, jueves y domingo de 21:00h a 24:00h; viernes y sábado de 21:00h a 01:30h.",
  },
  {
    date: "Instagram",
    title: "📲 Novedades en tiempo real",
    detail: "Síguenos para ver ambiente, burgers y novedades de Kiosko Alfresko.",
  },
];

export const upcomingEvents = {
  eyebrow: "Planes en Ogíjares",
  title: "Parque San Sebastián con reserva",
  intro: "Estamos en Parque San Sebastián. Para venir en grupo, reserva mesa en Qamarero.",
  reservationTitle: "Reserva tu mesa",
  reservationBody:
    "Reserva mesa en Qamarero y revisa Instagram para novedades puntuales.",
  reservationMicrocopy:
    "Reservas oficiales en Qamarero.",
  primaryCta: { label: "Reservar mesa", href: getQamareroReservationUrl("events") },
  secondaryCta: { label: "Ver Instagram", href: "https://www.instagram.com/alfresko.granada/" },
  historicTitle: "Novedades",
  historicIntro: "Consulta Instagram para novedades de carta, delivery y horarios puntuales.",
  items: [
    {
      title: "SMASH LAB by Alfresko",
      date: "Horario vigente",
      status: "Carta activa",
      description:
        "Nuevas burgers, cocina para compartir, delivery, recogida y reservas en Qamarero.",
      cta: { label: "Reservar mesa", href: getQamareroReservationUrl("event_card") },
    },
  ],
  pastItems: [
    {
      title: "Carta anterior sustituida",
      date: "Actualización SMASH LAB",
      status: "Actualizado",
      description:
        "La comunicación pública prioriza ahora SMASH LAB by Alfresko y el horario vigente.",
    },
  ],
};

export const specialWeekendCampaign = {
  eyebrow: "Noches ALFRESKO",
  title: "Terraza, tapas y smash burgers en Ogíjares",
  intro:
    "Ambiente en la terraza de Ogíjares: tapas, cerveza fría y smash burgers en Granada sur.",
  scheduleTitle: "Horario actual",
  schedule: [
    { day: "Lunes", hours: "Cerrado" },
    { day: "Martes, miércoles, jueves y domingo", hours: "21:00h a 24:00h" },
    { day: "Viernes y sábado", hours: "21:00h a 01:30h" },
  ],
  highlights: [
    "Terraza con ambiente",
    "Reserva recomendada",
    "Tapas y cerveza fría",
    "SMASH LAB by Alfresko",
  ],
  reservationNote:
    "Si vienes en grupo, reservar mesa y revisar Instagram antes de salir puede ayudarte a venir más tranquilo.",
};

export const corpusClosureNotice = {
  eyebrow: "Horario actual",
  title: "Kiosko Alfresko · horario vigente",
  body:
    "Lunes cerrado. Martes, miércoles, jueves y domingo de 21:00h a 24:00h. Viernes y sábado de 21:00h a 01:30h.",
  support:
    "SMASH LAB by Alfresko, cocina para compartir, delivery, recogida y reservas en Qamarero.",
};

export const summerReopening = {
  badge: "Horario vigente",
  returnTitle: "Horario actual",
  days: "Lunes cerrado",
  hours: "Mar, mié, jue y dom 21:00h a 24:00h · Vie y sáb 21:00h a 01:30h",
  claim: "Reserva en Qamarero o pide para recoger",
};

export const menuCategories: MenuCategory[] = [
  { id: "bebidas", title: "Bebidas", description: "Empieza por la ronda. Lo demás viene después.", placeholder: true },
  { id: "tapas", title: "Tapas", description: "Mira qué cae con la bebida y decide rápido.", placeholder: true },
  { id: "raciones", title: "Raciones", description: "Si os liáis, pedís algo más y seguís.", placeholder: true },
  { id: "para-compartir", title: "Para compartir", description: "Formato listo para grupo cuando el plan se alarga.", placeholder: true },
  { id: "ninos", title: "Opciones para niños", description: "Solo si encaja de verdad en la carta final.", placeholder: true },
];

export const heroActions: ActionLink[] = [
  { label: "Ver carta", href: "/carta", kind: "primary" },
  { label: "Pedir ahora", href: "#pide-alfresko", kind: "secondary" },
  { label: "Reservar mesa", href: getQamareroReservationUrl("hero_actions"), kind: "ghost" },
];

export const seoLandings: SeoLanding[] = [
  {
    slug: "tomar-algo-en-ogijares",
    shortTitle: "Tomar algo en Ogíjares",
    title: "Tomar algo en Ogíjares | Kiosko Alfresko",
    description: "Terraza en Ogíjares para tomar algo, pedir una ronda, probar SMASH LAB by Alfresko y alargar el plan en el Parque San Sebastián.",
    h1: "Tomar algo en Ogíjares",
    intro: "Si buscas un sitio en Ogíjares para tomar algo sin pensarlo demasiado, aquí la idea es esa: llegar, pedir una ronda y quedarse un rato más.",
    bullets: ["Terraza para plan social", "Bebida, tapas y SMASH LAB", "Parque San Sebastián, Ogíjares"],
  },
  {
    slug: "tapas-ogijares",
    shortTitle: "Tapas en Ogíjares",
    title: "Tapas en Ogíjares | Kiosko Alfresko",
    description: "Tapeo, burgers y terraza en Ogíjares para pedir una bebida, ver qué cae y seguir el plan.",
    h1: "Tapas en Ogíjares",
    intro: "Aquí las tapas acompañan el plan: bebida fría, algo para picar y cero complicación.",
    bullets: ["Tapeo fácil", "SMASH LAB by Alfresko", "Perfecto para repetir ronda"],
  },
  {
    slug: "terraza-ogijares",
    shortTitle: "Terraza en Ogíjares",
    title: "Terraza en Ogíjares | Kiosko Alfresko",
    description: "Terraza en Ogíjares para SMASH LAB by Alfresko, cocina para compartir, bebidas y reservas en Qamarero.",
    h1: "Terraza en Ogíjares",
    intro: "Kiosko Alfresko va de eso: terraza, SMASH LAB, aire libre y un plan que se monta solo.",
    bullets: ["Plan nocturno", "Entorno de parque", "Pedidos y reservas desde móvil"],
  },
  {
    slug: "bar-en-ogijares",
    shortTitle: "Bar en Ogíjares",
    title: "Bar en Ogíjares para tomar algo | Kiosko Alfresko",
    description: "Bar en Ogíjares para tomar algo, pedir burgers de SMASH LAB, tapear y pasar el rato en el Parque San Sebastián.",
    h1: "Bar en Ogíjares para tomar algo",
    intro: "No hace falta montarlo mucho: vienes, pedís algo y el rato va cayendo solo.",
    bullets: ["Bebidas primero", "Burgers y carta para compartir", "Plan fácil de proponer"],
  },
];

export const ownerSections = [
  { title: "Resumen de negocio", items: ["Horario actual publicado", "CTAs activos", "Páginas SEO publicadas", "Estado de placeholders"] },
  { title: "Horario vigente", items: ["Lunes cerrado", "Martes a jueves 21:00–24:00", "Viernes y sábado 21:00–01:30", "Domingo 21:00–24:00"] },
  { title: "Carta y categorías", items: ["SMASH LAB by Alfresko", "Para compartir", "Patatas con toppings", "Carnes", "Bebidas"] },
  { title: "SEO local", items: ["Tomar algo en Ogíjares", "Tapas en Ogíjares", "Terraza en Ogíjares", "Bar en Ogíjares"] },
];

export const internalAdminSections: Array<{ title: string; description: string; items: InternalAdminLink[] }> = [
  {
    title: "Consulta APPCC",
    description: "Búsqueda, filtros y exportación de registros sanitarios.",
    items: [
      {
        title: "Centro documental APPCC",
        description: "Documentación oficial, registros, planes y protocolos.",
        href: "/admin-kiosko/documentacion",
        category: "documentacion",
      },
      {
        title: "Calendario APPCC",
        description: "Vista mensual de registros, pendientes e incidencias.",
        href: "/admin-kiosko/calendario",
        category: "documentacion",
      },
      {
        title: "Consultar y descargar registros",
        description: "Filtra registros APPCC y descarga CSV para revisión interna.",
        href: "/admin-kiosko/registros",
        category: "documentacion",
      },
    ],
  },
  {
    title: "Registros sanitarios diarios",
    description: "Controles recurrentes para dejar constancia diaria de seguridad alimentaria.",
    items: [
      {
        title: "Registro de temperaturas",
        description: "Equipos APPCC de frío, congelación e hielo.",
        href: "/admin-kiosko/temperaturas",
        category: "sanitario",
      },
      {
        title: "Control de aceite de freidora",
        description: "Revisión de estado, cambios y observaciones.",
        href: "/admin-kiosko/aceite-freidora",
        category: "sanitario",
      },
      {
        title: "Registro de limpieza diaria",
        description: "Zonas, turnos y tareas completadas.",
        href: "/admin-kiosko/limpieza",
        category: "sanitario",
      },
      {
        title: "Control de recepción de mercancía",
        description: "Entrada de productos, temperatura y conformidad.",
        href: "/admin-kiosko/recepcion-mercancia",
        category: "sanitario",
      },
      {
        title: "Control de trazabilidad",
        description: "Lotes, fechas y seguimiento de producto.",
        href: "/admin-kiosko/recepcion-mercancia",
        category: "sanitario",
      },
      {
        title: "Registro de incidencias sanitarias",
        description: "Anotación y seguimiento de incidencias.",
        href: "/admin-kiosko/incidencias",
        category: "sanitario",
      },
    ],
  },
  {
    title: "Checklists operativos",
    description: "Apertura, cierre y revisión rápida por zonas de trabajo.",
    items: [
      {
        title: "Apertura de cocina",
        description: "Preparación inicial, equipos y mise en place.",
        href: "/admin-kiosko/checklists/apertura",
        category: "operativo",
      },
      {
        title: "Cierre de cocina",
        description: "Limpieza, apagado y control final de equipos.",
        href: "/admin-kiosko/checklists/cierre",
        category: "operativo",
      },
      {
        title: "Apertura de barra",
        description: "Caja, bebidas, hielo, TPV y zona de servicio.",
        href: "/admin-kiosko/checklists?tipo=apertura-barra",
        category: "operativo",
      },
      {
        title: "Cierre de barra",
        description: "Reposición, limpieza, caja y cierre de servicio.",
        href: "/admin-kiosko/checklists?tipo=cierre-barra",
        category: "operativo",
      },
      {
        title: "Revisión de terraza",
        description: "Mesas, sillas, orden, seguridad y limpieza.",
        href: "/admin-kiosko/checklists?tipo=terraza",
        category: "operativo",
      },
      {
        title: "Revisión de baños",
        description: "Limpieza, consumibles y estado general.",
        href: "/admin-kiosko/checklists?tipo=banos",
        category: "operativo",
      },
    ],
  },
  {
    title: "Documentación importante",
    description: "Accesos preparados para documentación de consulta interna.",
    items: [
      {
        title: "APPCC / Plan sanitario",
        description: "Plan de autocontrol y documentación sanitaria.",
        href: "/admin-kiosko/checklists?documento=appcc",
        category: "documentacion",
      },
      {
        title: "Fichas técnicas de producto",
        description: "Información técnica de ingredientes y elaboraciones.",
        href: "/admin-kiosko/checklists?documento=fichas-tecnicas",
        category: "documentacion",
      },
      {
        title: "Alérgenos",
        description: "Consulta interna de alérgenos por producto.",
        href: "/admin-kiosko/checklists?documento=alergenos",
        category: "documentacion",
      },
      {
        title: "Proveedores",
        description: "Contactos, datos y documentación de proveedores.",
        href: "/admin-kiosko/proveedores",
        category: "documentacion",
      },
      {
        title: "Mantenimiento de maquinaria",
        description: "Revisiones, incidencias y mantenimiento preventivo.",
        href: "/admin-kiosko/mantenimiento",
        category: "documentacion",
      },
      {
        title: "Contratos y revisiones",
        description: "Documentación administrativa y revisiones periódicas.",
        href: "/admin-kiosko/checklists?documento=contratos",
        category: "documentacion",
      },
    ],
  },
  {
    title: "Gestión sanitaria avanzada",
    description: "Secciones preparadas para inspecciones y verificación documental.",
    items: [
      { title: "Inspecciones", description: "Histórico, requerimientos y acciones realizadas.", href: "/admin-kiosko/inspecciones", category: "sanitario" },
      { title: "Equipos", description: "Fichas de maquinaria y estado de mantenimiento.", href: "/admin-kiosko/equipos", category: "operativo" },
      { title: "Agua", description: "Control de color, olor, sabor y cloro si aplica.", href: "/admin-kiosko/agua", category: "sanitario" },
      { title: "Verificación anual", description: "Checklist anual de documentación y APPCC.", href: "/admin-kiosko/verificacion-anual", category: "documentacion" },
    ],
  },
];
