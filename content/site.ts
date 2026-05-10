import type { ActionLink, MenuCategory, ScheduleEvent, SeasonalScheduleItem, SeoLanding } from "@/types/site";

export const siteConfig = {
  name: "Kiosko Alfresko",
  legalName: "Kiosko Alfresko",
  siteUrl: "https://kioskoalfresko.es",
  domain: "kioskoalfresko.es",
  locale: "es_ES",
  description:
    "Kiosko en Ogíjares con desayunos desde las 10:00, terraza al sol, tapas, cervezas frías y smash burgers en el Parque San Sebastián.",
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
  },
  ctas: {
    primary: { label: "Cómo llegar ahora", href: "/ubicacion-ogijares" },
    secondary: { label: "Ver carta rápida", href: "/carta" },
    call: { label: "Llamar ahora", href: "tel:696320465" },
    booking: { label: "Reservas y contacto", href: "/reservas-contacto" },
  },
  positioning: {
    headline: "Aquí no se viene a comer. Se viene a quedarse.",
    subheadline: "Desayunos jueves a domingo desde las 10:00, café + tostadas al sol, tapas, cervezas frías y smash burgers en Ogíjares.",
    support: ["Smash 180G + patatas · 14€", "Café + tostadas desde las 10:00", "Parque San Sebastián · Ogíjares"],
  },
  schedule: {
    currentLabel: "Horario actual",
    currentSummary: "Jueves a domingo · 10:00 a 17:00. Desayunos desde las 10:00 y confirmación en Instagram si cambia algo por clima o evento.",
    note: "Junio, julio, agosto y septiembre se actualizarán aquí en cuanto se cierre el horario definitivo.",
  },
};

export const seasonalSchedule: SeasonalScheduleItem[] = [
  { month: "Mayo", status: "confirmed", summary: "Jueves a domingo · 10:00 a 17:00", note: "Seguimos activos en el parque y confirmamos cualquier cambio puntual en Instagram.", highlight: true },
  { month: "Junio", status: "pending", summary: "Horario especial pendiente de actualizar", note: "Bloque listo para cargar el horario real en cuanto quede cerrado." },
  { month: "Julio", status: "pending", summary: "Horario especial pendiente de actualizar", note: "Mes fuerte de terraza. Pendiente de confirmación final." },
  { month: "Agosto", status: "pending", summary: "Horario especial pendiente de actualizar", note: "Mes fuerte de terraza. Pendiente de confirmación final." },
  { month: "Septiembre", status: "special", summary: "Horario especial por fiestas patronales, pendiente de actualizar", note: "Preparado para reflejar el tramo especial sin rehacer el bloque." },
];

export const maySchedule = {
  normalLabel: "Mayo en el Parque San Sebastián",
  normalHours: "Jueves a domingo · 10:00–17:00",
  normalSummary: "Jueves a domingo · 10:00–17:00, con desayunos desde las 10:00, terraza al sol y confirmación en Instagram si cambia algo.",
  weekendNotice: "Instagram en directo para confirmar cambios por clima o evento.",
  weekendLead: "Consulta el estado del sábado y cualquier cambio puntual en Instagram antes de venir.",
};

export const maySpecialEvents: ScheduleEvent[] = [
  {
    date: "Cruces · ya pasó",
    title: "🔥 Así se vivieron las Cruces en ALFRESKO",
    hours: "Ambiente, tapas y terraza en el parque",
    note: "Buen ambiente, tapas y terraza llena en el parque.",
    highlight: true,
  },
  {
    date: "Este sábado",
    title: "🎶 Evento pendiente de confirmación",
    hours: "Pendiente por lluvia",
    note: "El evento previsto para este sábado está pendiente de confirmación debido a la previsión de lluvia. 👉 Consulta nuestro Instagram para confirmación en tiempo real.",
    highlight: true,
  },
];

export const maySalesFocus = {
  title: "Desayuno, cerveza fría, tapas y smash.",
  body: "Café + tostadas desde las 10:00, tapas + cerveza y smash burgers Granada en la terraza de Ogíjares.",
  extra: "Instagram en directo para confirmar el evento del sábado y el ambiente real del día.",
  microcopy: [
    "Parque San Sebastián · Ogíjares",
    "Smash 180G + patatas",
    "Cada bebida con tapa",
    "Desayunos desde las 10:00",
  ],
};

export const springHighlights = [
  {
    date: "Mayo",
    title: "🔥 Hoy hay ambiente en ALFRESKO",
    detail: "Café + tostadas desde las 10:00, cervezas frías, tapas y terraza en el parque.",
  },
  {
    date: "Cruces",
    title: "🔥 Así se vivieron las Cruces en ALFRESKO",
    detail: "Bloque histórico para mantener el ambiente vivido sin comunicarlo como evento futuro.",
  },
  {
    date: "Este sábado",
    title: "🎶 Evento pendiente de confirmación",
    detail: "El evento previsto para este sábado está pendiente de confirmación debido a la previsión de lluvia. Consulta Instagram en tiempo real.",
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
  { title: "Resumen de negocio", items: ["Reapertura 25 de abril", "CTAs activos", "Páginas SEO publicadas", "Estado de placeholders"] },
  { title: "Horarios estacionales", items: ["25 de abril: reapertura", "Mayo jueves a domingo 10:00–17:00", "1 mayo 10:00–20:00", "2 y 3 mayo 10:00–23:00", "Junio pendiente", "Julio pendiente", "Agosto pendiente", "Septiembre especial"] },
  { title: "Carta y categorías", items: ["Bebidas", "Tapas", "Raciones", "Para compartir", "Opciones para niños"] },
  { title: "SEO local", items: ["Tomar algo en Ogíjares", "Tapas en Ogíjares", "Terraza en Ogíjares", "Bar en Ogíjares"] },
];
