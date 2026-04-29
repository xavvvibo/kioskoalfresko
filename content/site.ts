import type { ActionLink, MenuCategory, ScheduleEvent, SeasonalScheduleItem, SeoLanding } from "@/types/site";

export const siteConfig = {
  name: "Kiosko Alfresko",
  legalName: "Kiosko Alfresko",
  siteUrl: "https://kioskoalfresko.es",
  domain: "kioskoalfresko.es",
  locale: "es_ES",
  description:
    "Kiosko Alfresko reabre el 25 de abril en Ogíjares: terraza para tomar algo, arrancar la primavera y liarse un rato más en el Parque San Sebastián.",
  location: {
    area: "Parque San Sebastián",
    city: "Ogíjares",
    province: "Granada",
    postalCode: "18151",
    region: "Andalucía",
    addressLine: "Parque San Sebastián",
    mapsUrl: "[PENDIENTE_MAPS_URL]",
  },
  contact: {
    phoneDisplay: "[PENDIENTE_TELÉFONO]",
    phoneHref: "tel:[PENDIENTE_TELÉFONO]",
    email: "[PENDIENTE_EMAIL]",
    whatsappUrl: "[PENDIENTE_WHATSAPP]",
  },
  ctas: {
    primary: { label: "Cómo llegar", href: "/ubicacion-ogijares" },
    secondary: { label: "Ver carta", href: "/carta" },
    call: { label: "Llamar", href: "tel:[PENDIENTE_TELÉFONO]" },
    booking: { label: "Reservas y contacto", href: "/reservas-contacto" },
  },
  positioning: {
    headline: "Aquí no se viene a comer. Se viene a quedarse.",
    subheadline:
      "Volvemos el 25 de abril.",
    support: ["Arrancamos temporada en el Parque San Sebastián."],
  },
  schedule: {
    currentLabel: "Horario actual",
    currentSummary: "En mayo abrimos de jueves a domingo de 10:00 a 17:00, salvo eventos especiales.",
    note: "Junio, julio, agosto y septiembre se actualizarán aquí en cuanto se cierre el horario definitivo.",
  },
};

export const seasonalSchedule: SeasonalScheduleItem[] = [
  { month: "Abril", status: "confirmed", summary: "Reapertura el 25 de abril · evento de 11:00 a 14:00 y de 17:00 a 20:00", note: "Primer día de temporada en el Parque San Sebastián.", highlight: true },
  { month: "Mayo", status: "confirmed", summary: "Jueves a domingo · 10:00 a 17:00", note: "Este finde hay horario ampliado por Día de la Bicicleta y Cruces.", highlight: true },
  { month: "Junio", status: "pending", summary: "Horario especial pendiente de actualizar", note: "Bloque listo para cargar el horario real en cuanto quede cerrado." },
  { month: "Julio", status: "pending", summary: "Horario especial pendiente de actualizar", note: "Mes fuerte de terraza. Pendiente de confirmación final." },
  { month: "Agosto", status: "pending", summary: "Horario especial pendiente de actualizar", note: "Mes fuerte de terraza. Pendiente de confirmación final." },
  { month: "Septiembre", status: "special", summary: "Horario especial por fiestas patronales, pendiente de actualizar", note: "Preparado para reflejar el tramo especial sin rehacer el bloque." },
];

export const maySchedule = {
  normalLabel: "Mayo en el Parque San Sebastián",
  normalHours: "Jueves a domingo · 10:00–17:00",
  normalSummary: "En mayo abrimos de jueves a domingo de 10:00 a 17:00, salvo eventos especiales.",
  weekendNotice: "Este finde abrimos hasta tarde: sábado y domingo de Cruces hasta las 23:00.",
  weekendLead: "Este finde horarios especiales por Día de la Bicicleta y Cruces.",
};

export const maySpecialEvents: ScheduleEvent[] = [
  {
    date: "Viernes 1 de mayo",
    title: "Día de la Bicicleta",
    hours: "10:00–20:00",
    note: "Horario especial para aprovechar todo el día en el parque.",
    highlight: true,
  },
  {
    date: "Sábado 2 de mayo",
    title: "Cruces",
    hours: "10:00–23:00",
    note: "Concierto a las 21:00.",
    highlight: true,
  },
  {
    date: "Domingo 3 de mayo",
    title: "Cruces",
    hours: "10:00–23:00",
    note: "Seguimos hasta tarde para cerrar el finde.",
    highlight: true,
  },
];

export const maySalesFocus = {
  title: "Smash Burgers 180G, bebida + tapa y parque.",
  body: "Smash Burgers 180G, bebida + tapa y plan fácil en el Parque San Sebastián · Ogíjares.",
  extra: "Sábado · concierto a las 21:00.",
};

export const reopeningCampaign = {
  date: "25 de abril",
  title: "Volvemos el 25 de abril",
  subtitle: "Primer día de temporada.",
  eventName: "X Feria de la Cultura y del Ocio de Ogíjares",
  eventPlace: "Parque San Sebastián · Recinto Ferial",
  eventHours: "11:00–14:00 y 17:00–20:00",
  note: "Nos vemos en el Parque San Sebastián, con ambiente, gente y plan de tarde.",
  microcopy: "Abrimos y el plan ya está montado.",
};

export const springHighlights = [
  {
    date: "25 abril",
    title: "Abril",
    detail: "Arrancamos el día 25.",
  },
  {
    date: "Mayo",
    title: "Cruces, San Isidro y mucho movimiento",
    detail: "Cruces, San Isidro y mucho movimiento en el pueblo.",
  },
  {
    date: "Junio",
    title: "Zoco medieval, conciertos y ambiente",
    detail: "Zoco medieval, conciertos y ambiente en el parque.",
  },
];

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
  { label: "Llamar", href: "tel:[PENDIENTE_TELÉFONO]", kind: "ghost" },
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
  { title: "Resumen de negocio", items: ["Reapertura 25 de abril", "CTAs activos", "Páginas SEO publicadas", "Estado de placeholders"] },
  { title: "Horarios estacionales", items: ["25 de abril: reapertura", "Mayo jueves a domingo 10:00–17:00", "1 mayo 10:00–20:00", "2 y 3 mayo 10:00–23:00", "Junio pendiente", "Julio pendiente", "Agosto pendiente", "Septiembre especial"] },
  { title: "Carta y categorías", items: ["Bebidas", "Tapas", "Raciones", "Para compartir", "Opciones para niños"] },
  { title: "SEO local", items: ["Tomar algo en Ogíjares", "Tapas en Ogíjares", "Terraza en Ogíjares", "Bar en Ogíjares"] },
];
