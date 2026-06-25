import type { ActionLink, InternalAdminLink, MenuCategory, ScheduleEvent, SeasonalScheduleItem, SeoLanding } from "@/types/site";
import { QAMARERO_BOOKING_URL, getQamareroReservationUrl } from "@/lib/integrations/qamarero";

export const siteConfig = {
  name: "Kiosko Alfresko",
  legalName: "Kiosko Alfresko",
  siteUrl: "https://kioskoalfresko.es",
  domain: "kioskoalfresko.es",
  locale: "es_ES",
  description:
    "Terraza en Ogíjares, Granada sur, con tapas, smash burgers, carnes a la brasa y ambiente nocturno. Horario actual: lunes y martes descanso; miércoles, jueves y domingo de 20:00h a 24:00h; viernes y sábado de 21:00h a 01:00h.",
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
    orderWhatsappUrl: "https://wa.me/34696320465?text=Hola%20quiero%20pedir%20en%20Kiosko%20Alfresko",
    instagramUrl: "https://instagram.com/alfresko.granada",
    instagramHandle: "@alfresko.granada",
    bookingUrl: QAMARERO_BOOKING_URL,
  },
  ctas: {
    primary: { label: "Cómo llegar ahora", href: "/ubicacion-ogijares" },
    secondary: { label: "Ver carta", href: "/carta" },
    call: { label: "Llamar ahora", href: "tel:696320465" },
    booking: { label: "Reservar mesa", href: getQamareroReservationUrl("hero") },
  },
  positioning: {
    headline: "Noches al Alfresko",
    subheadline:
      "Terraza, tapas, smash burgers, carnes a la brasa y el mejor ambiente al aire libre para las noches de verano en Ogíjares.",
    support: ["Lunes y martes descanso", "Miércoles, jueves y domingo · 20:00h a 24:00h", "Viernes y sábado · 21:00h a 01:00h"],
  },
  schedule: {
    currentLabel: "Horario actual",
    currentSummary: "Lunes y martes descanso. Miércoles y jueves de 20:00h a 24:00h. Viernes y sábado de 21:00h a 01:00h. Domingo de 20:00h a 24:00h.",
    note: "Te esperamos para noches ALFRESKO con terraza, tapas, smash burgers y carnes a la brasa en Ogíjares, Granada sur.",
  },
};

export const seasonalSchedule: SeasonalScheduleItem[] = [
  { month: "Junio", status: "confirmed", summary: "Lunes y martes descanso · Miércoles, jueves y domingo 20:00h a 24:00h · Viernes y sábado 21:00h a 01:00h", note: "Noches de terraza, tapas, burgers y carnes a la brasa en Ogíjares.", highlight: true },
  { month: "Julio", status: "confirmed", summary: "Lunes y martes descanso · Miércoles, jueves y domingo 20:00h a 24:00h · Viernes y sábado 21:00h a 01:00h", note: "Noches de terraza, tapas, burgers y carnes a la brasa en Ogíjares." },
  { month: "Agosto", status: "confirmed", summary: "Lunes y martes descanso · Miércoles, jueves y domingo 20:00h a 24:00h · Viernes y sábado 21:00h a 01:00h", note: "Reserva tus noches ALFRESKO si vienes en grupo o quieres asegurar mesa." },
  { month: "Septiembre", status: "confirmed", summary: "Lunes y martes descanso · Miércoles, jueves y domingo 20:00h a 24:00h · Viernes y sábado 21:00h a 01:00h", note: "Si hubiera alguna actualización en septiembre, la anunciaremos también en Instagram." },
];

export const maySchedule = {
  normalLabel: "Horario actual",
  normalHours: "Miércoles, jueves y domingo · 20:00h a 24:00h · Viernes y sábado · 21:00h a 01:00h",
  normalSummary: "Horario actual: lunes y martes descanso. Miércoles y jueves de 20:00h a 24:00h. Viernes y sábado de 21:00h a 01:00h. Domingo de 20:00h a 24:00h.",
  weekendNotice: "Horario actual",
  weekendLead: "Cenas, tapas, smash burgers, carnes a la brasa y el mejor ambiente nocturno al aire libre en Ogíjares.",
};

export const maySpecialEvents: ScheduleEvent[] = [
  {
    date: "Miércoles, jueves y domingo",
    title: "Noches de terraza",
    hours: "20:00h a 24:00h",
    note: "Tapas, smash burgers y ambiente nocturno en el Parque San Sebastián de Ogíjares.",
    highlight: true,
  },
  {
    date: "Viernes y sábado",
    title: "Noches hasta la 01:00h",
    hours: "21:00h a 01:00h",
    note: "Reserva mesa si vienes en grupo o quieres asegurar tu noche ALFRESKO.",
    highlight: true,
  },
];

export const maySalesFocus = {
  title: "🌙 Noches ALFRESKO",
  body: "Vuelve la temporada de verano con cenas al aire libre, tapas, cerveza fría, smash burgers y carnes a la brasa en Ogíjares, Granada sur.",
  extra: "Reserva tu mesa y prepárate para el ambiente nocturno de ALFRESKO.",
  microcopy: [
    "Parque San Sebastián · Ogíjares",
    "Smash 180G + patatas",
    "Tapas y terraza",
    "Reserva recomendada",
  ],
};

export const springHighlights = [
  {
    date: "Reapertura",
    title: "🔥 Vuelve el ambiente de noche en ALFRESKO",
    detail: "Cenas al aire libre, tapas, cerveza fría y terraza en el parque para arrancar el verano.",
  },
  {
    date: "Verano 2026",
    title: "🌙 Temporada de noches ALFRESKO",
    detail: "Miércoles, jueves y domingo de 20:00h a 24:00h; viernes y sábado de 21:00h a 01:00h, con burgers y carnes a la brasa.",
  },
  {
    date: "Instagram",
    title: "📲 Novedades en tiempo real",
    detail: "Síguenos para ver el ambiente y las noches de verano en Ogíjares.",
  },
];

export const upcomingEvents = {
  eyebrow: "Programa de verano 2026",
  title: "Eventos en el Parque San Sebastián — reserva imprescindible",
  intro: "Días de evento = terraza llena. Reserva tu mesa y ven con tiempo: smash burgers, tapeo, copas y ambiente antes del espectáculo.",
  reservationTitle: "Reserva para los días grandes",
  reservationBody:
    "Smash burgers, tapeo, copas y ambiente antes del espectáculo. En conciertos, humor, flamenco y feria recomendamos reservar con antelación.",
  reservationMicrocopy:
    "Días de evento = terraza llena. Reserva tu mesa y ven con tiempo.",
  primaryCta: { label: "Reservar mesa", href: getQamareroReservationUrl("events") },
  secondaryCta: { label: "Ver Instagram", href: "https://instagram.com/alfresko.granada" },
  items: [
    {
      title: "Gala Reina, Damas y Mister",
      date: "Viernes 3 de julio · 21:00h",
      status: "Reserva recomendada",
      description:
        "Parque San Sebastián (Recinto Ferial). Elección de la Reina, Damas y Mister de las Fiestas de Ogíjares 2026. Ven antes para cenar con calma.",
      cta: { label: "Reservar mesa", href: getQamareroReservationUrl("event_card") },
    },
    {
      title: "Tributo a Estopa A Toda Pastilla",
      date: "Sábado 25 de julio · 22:00h",
      status: "Reserva imprescindible",
      description:
        "Parque San Sebastián (Recinto Ferial). Concierto con puestos de comida y bebidas. Terraza, smash burgers y tapeo antes del concierto.",
      cta: { label: "Reservar mesa", href: getQamareroReservationUrl("event_card") },
    },
    {
      title: "Planetario Mirando a las estrellas",
      date: "Martes 28 y miércoles 29 de julio · 21:30h a 00:30h",
      status: "Plan familiar",
      description:
        "Parque San Sebastián — Recinto Ferial. Actividad familiar: ven antes a cenar o remata el plan después con algo fresco en la terraza.",
      cta: { label: "Reservar mesa", href: getQamareroReservationUrl("event_card") },
    },
    {
      title: "Noche de humor",
      date: "Viernes 31 de julio · 22:00h",
      status: "Reserva imprescindible",
      description:
        "Parque San Sebastián (Recinto Ferial). Monólogos y noche de ambiente: reserva mesa y llega con tiempo para cenar antes.",
      cta: { label: "Reservar mesa", href: getQamareroReservationUrl("event_card") },
    },
    {
      title: "Cine al fresquito",
      date: "Jueves 13 de agosto · 22:00h",
      status: "Reserva recomendable",
      description:
        "Parque San Sebastián (Recinto Ferial). Proyección de Cómo entrenar a tu dragón 2025. Plan familiar con cena fácil antes de la película.",
      cta: { label: "Reservar mesa", href: getQamareroReservationUrl("event_card") },
    },
    {
      title: "Romance del amor brujo",
      date: "Viernes 14 de agosto · 22:00h",
      status: "Reserva imprescindible",
      description:
        "Parque San Sebastián. Espectáculo flamenco para una noche grande: tapas, copas y terraza antes del espectáculo.",
      cta: { label: "Reservar mesa", href: getQamareroReservationUrl("event_card") },
    },
    {
      title: "La dama ya no es boba",
      date: "Viernes 28 de agosto · 22:00h",
      status: "Reserva recomendable",
      description:
        "Parque San Sebastián (Recinto Ferial). Teatro familiar para cerrar agosto con cena, tapeo y ambiente al fresko.",
      cta: { label: "Reservar mesa", href: getQamareroReservationUrl("event_card") },
    },
    {
      title: "XLVII Festival Nacional de Cante Flamenco",
      date: "Sábado 5 de septiembre · 22:30h",
      status: "Reserva imprescindible",
      description:
        "Parque San Sebastián (Recinto Ferial). Festival de Cante Flamenco de Ogíjares. Entrada 20 €. Reserva mesa si quieres cenar antes.",
      cta: { label: "Reservar mesa", href: getQamareroReservationUrl("event_card") },
    },
    {
      title: "Fiestas Populares y Feria de Ogíjares",
      date: "Del 10 al 14 de septiembre",
      status: "Reserva imprescindible",
      description:
        "Entorno Parque San Sebastián / Recinto Ferial. Evento grande de temporada: terraza llena, smash burgers, tapeo, copas y reservas imprescindibles.",
      cta: { label: "Reservar mesa", href: getQamareroReservationUrl("event_card") },
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
    { day: "Lunes y martes", hours: "Descanso" },
    { day: "Miércoles, jueves y domingo", hours: "20:00h a 24:00h" },
    { day: "Viernes y sábado", hours: "21:00h a 01:00h" },
  ],
  highlights: [
    "Terraza con ambiente",
    "Reserva recomendada",
    "Tapas y cerveza fría",
    "Smash burgers 180G",
  ],
  reservationNote:
    "Si vienes en grupo, reservar mesa y revisar Instagram antes de salir puede ayudarte a venir más tranquilo.",
};

export const corpusClosureNotice = {
  eyebrow: "Horario actual",
  title: "Noches ALFRESKO en Ogíjares",
  body:
    "Lunes y martes descanso. Miércoles y jueves de 20:00h a 24:00h. Viernes y sábado de 21:00h a 01:00h. Domingo de 20:00h a 24:00h.",
  support:
    "Terraza, tapas, smash burgers y noches al fresko en el Parque San Sebastián de Ogíjares.",
};

export const summerReopening = {
  badge: "Temporada abierta",
  returnTitle: "Horario actual",
  days: "Lunes y martes descanso",
  hours: "Mié, jue y dom 20:00h a 24:00h · Vie y sáb 21:00h a 01:00h",
  claim: "Reserva tus noches ALFRESKO",
};

export const menuCategories: MenuCategory[] = [
  { id: "bebidas", title: "Bebidas", description: "Empieza por la ronda. Lo demás viene después.", placeholder: true },
  { id: "tapas", title: "Tapas", description: "Mira qué cae con la bebida y decide rápido.", placeholder: true },
  { id: "raciones", title: "Raciones", description: "Si os liáis, pedís algo más y seguís.", placeholder: true },
  { id: "para-compartir", title: "Para compartir", description: "Formato listo para grupo cuando el plan se alarga.", placeholder: true },
  { id: "ninos", title: "Opciones para niños", description: "Solo si encaja de verdad en la carta final.", placeholder: true },
];

export const heroActions: ActionLink[] = [
  { label: "Cómo llegar", href: "/ubicacion-ogijares", kind: "primary" },
  { label: "Ver carta", href: "/carta", kind: "secondary" },
  { label: "Llamar", href: "tel:696320465", kind: "ghost" },
];

export const seoLandings: SeoLanding[] = [
  {
    slug: "tomar-algo-en-ogijares",
    shortTitle: "Tomar algo en Ogíjares",
    title: "Tomar algo en Ogíjares | Kiosko Alfresko",
    description: "Terraza en Ogíjares para tomar algo, pedir una ronda y alargar el plan en el Parque San Sebastián.",
    h1: "Tomar algo en Ogíjares",
    intro: "Si buscas un sitio en Ogíjares para tomar algo sin pensarlo demasiado, aquí la idea es esa: llegar, pedir una ronda y quedarse un rato más.",
    bullets: ["Terraza para plan social", "Bebida, tapas y ritmo fácil", "Parque San Sebastián, Ogíjares"],
  },
  {
    slug: "tapas-ogijares",
    shortTitle: "Tapas en Ogíjares",
    title: "Tapas en Ogíjares | Kiosko Alfresko",
    description: "Tapeo y terraza en Ogíjares para pedir una bebida, ver qué cae y seguir el plan.",
    h1: "Tapas en Ogíjares",
    intro: "Aquí las tapas acompañan el plan: bebida fría, algo para picar y cero complicación.",
    bullets: ["Tapeo fácil", "Sitio informal", "Perfecto para repetir ronda"],
  },
  {
    slug: "terraza-ogijares",
    shortTitle: "Terraza en Ogíjares",
    title: "Terraza en Ogíjares | Kiosko Alfresko",
    description: "Terraza en Ogíjares para echar el rato, tomar algo y quedarte más de la cuenta.",
    h1: "Terraza en Ogíjares",
    intro: "Kiosko Alfresko va de eso: terraza, aire libre y un plan que se monta solo.",
    bullets: ["Plan de tarde y verano", "Entorno de parque", "Decisión rápida desde móvil"],
  },
  {
    slug: "bar-en-ogijares",
    shortTitle: "Bar en Ogíjares",
    title: "Bar en Ogíjares para tomar algo | Kiosko Alfresko",
    description: "Bar en Ogíjares para tomar algo, tapear y pasar el rato al aire libre en el Parque San Sebastián.",
    h1: "Bar en Ogíjares para tomar algo",
    intro: "No hace falta montarlo mucho: vienes, pedís algo y el rato va cayendo solo.",
    bullets: ["Bebidas primero", "Tapas y raciones después", "Plan fácil de proponer"],
  },
];

export const ownerSections = [
  { title: "Resumen de negocio", items: ["Horario actual publicado", "CTAs activos", "Páginas SEO publicadas", "Estado de placeholders"] },
  { title: "Horarios estacionales", items: ["Lunes y martes descanso", "Miércoles y jueves 20:00–24:00", "Viernes y sábado 21:00–01:00", "Domingo 20:00–24:00"] },
  { title: "Carta y categorías", items: ["Bebidas", "Tapas", "Raciones", "Para compartir", "Opciones para niños"] },
  { title: "SEO local", items: ["Tomar algo en Ogíjares", "Tapas en Ogíjares", "Terraza en Ogíjares", "Bar en Ogíjares"] },
];

export const internalAdminSections: Array<{ title: string; description: string; items: InternalAdminLink[] }> = [
  {
    title: "Consulta APPCC",
    description: "Búsqueda, filtros y exportación de registros sanitarios.",
    items: [
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
        href: "/admin-kiosko/checklists?tipo=apertura-cocina",
        category: "operativo",
      },
      {
        title: "Cierre de cocina",
        description: "Limpieza, apagado y control final de equipos.",
        href: "/admin-kiosko/checklists?tipo=cierre-cocina",
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
        href: "/admin-kiosko/checklists?documento=proveedores",
        category: "documentacion",
      },
      {
        title: "Mantenimiento de maquinaria",
        description: "Revisiones, incidencias y mantenimiento preventivo.",
        href: "/admin-kiosko/checklists?documento=mantenimiento",
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
];
