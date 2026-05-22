import type { ActionLink, MenuCategory, ScheduleEvent, SeasonalScheduleItem, SeoLanding } from "@/types/site";
import { QAMARERO_BOOKING_URL, getQamareroReservationUrl } from "@/lib/integrations/qamarero";

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
    bookingUrl: QAMARERO_BOOKING_URL,
  },
  ctas: {
    primary: { label: "Cómo llegar ahora", href: "/ubicacion-ogijares" },
    secondary: { label: "Ver carta", href: "/carta" },
    call: { label: "Llamar ahora", href: "tel:696320465" },
    booking: { label: "Reservar mesa", href: getQamareroReservationUrl("hero") },
  },
  positioning: {
    headline: "Aquí no se viene a comer. Se viene a quedarse.",
    subheadline: "Terraza en Ogíjares, al sur de Granada, con café y tostadas desde las 10:00, tapas, cerveza fría y smash burgers para alargar el plan.",
    support: ["Smash 180G + patatas · 14€", "Café + tostadas desde las 10:00", "Ogíjares · Granada sur"],
  },
  schedule: {
    currentLabel: "Horario actual",
    currentSummary: "Jueves a domingo · 10:00 a 17:00. Desayunos desde las 10:00, terraza, tapas y confirmación en Instagram si hubiera algún cambio puntual.",
    note: "Si hubiera algún ajuste puntual por clima, servicio o evento privado, lo actualizamos aquí y en Instagram.",
  },
};

export const seasonalSchedule: SeasonalScheduleItem[] = [
  { month: "Mayo", status: "confirmed", summary: "Jueves a domingo · 10:00 a 17:00", note: "Desayunos, terraza y servicio habitual en Ogíjares.", highlight: true },
  { month: "Junio", status: "pending", summary: "Actualización pendiente", note: "Publicaremos aquí el horario real en cuanto quede confirmado." },
  { month: "Julio", status: "pending", summary: "Actualización pendiente", note: "Consulta Instagram si buscas la versión más reciente del horario." },
  { month: "Agosto", status: "pending", summary: "Actualización pendiente", note: "Consulta Instagram si buscas la versión más reciente del horario." },
  { month: "Septiembre", status: "special", summary: "Se comunicará aquí si hay horario especial", note: "Si hay cambios, se anunciarán también en Instagram." },
];

export const maySchedule = {
  normalLabel: "☕ Desayunos ALFRESKO",
  normalHours: "JUEVES A DOMINGO · DESDE LAS 10:00",
  normalSummary: "Jueves a domingo desde las 10:00, con desayunos, café y tostadas, tapas, cerveza fría y terraza al sol en Ogíjares.",
  weekendNotice: "Reserva recomendada en horas punta. Confirmaciones en Instagram.",
  weekendLead: "Café, tostadas, tapas, cerveza fría y smash burgers para venir sin pensarlo demasiado.",
};

export const maySpecialEvents: ScheduleEvent[] = [
  {
    date: "Antes de venir",
    title: "Instagram actualizado",
    hours: "NOVEDADES DEL DÍA",
    note: "Publicamos por Instagram cualquier cambio puntual de horario, ambiente o servicio para que vengas sobre seguro.",
    highlight: true,
  },
];

export const maySalesFocus = {
  title: "☕ Desayunos ALFRESKO",
  body: "Café y tostadas desde las 10:00, tapas, cerveza fría y smash burgers en terraza en Ogíjares, Granada sur.",
  extra: "Instagram en directo para confirmar ambiente, horarios y cualquier novedad del día.",
  microcopy: [
    "Parque San Sebastián · Ogíjares",
    "Smash 180G + patatas",
    "Cada bebida con tapa",
    "Desayunos desde las 10:00",
  ],
};

export const springHighlights = [
  {
    date: "Hoy",
    title: "🔥 Hoy hay ambiente en ALFRESKO",
    detail: "Café + tostadas desde las 10:00, cervezas frías, tapas y terraza en el parque.",
  },
  {
    date: "Desayunos",
    title: "☕ Desayunos ALFRESKO",
    detail: "Café + tostadas + terraza al sol. Jueves a domingo desde las 10:00.",
  },
  {
    date: "Instagram",
    title: "📲 Novedades en tiempo real",
    detail: "Si cambia algo, lo confirmamos primero en Instagram.",
  },
];

export const upcomingEvents = {
  eyebrow: "Reserva tu mesa",
  title: "Planes para venir con hambre, sed y ganas de terraza",
  intro: "Desayunos, tapas, cerveza fría y smash burgers en el Parque San Sebastián de Ogíjares, al sur de Granada.",
  reservationTitle: "¿Vienes con mesa reservada?",
  reservationBody:
    "Si ya sabes que venís, reserva y llega con el plan cerrado: mejor sitio, menos espera y todo más fácil.",
  reservationMicrocopy:
    "Instagram te sirve para confirmar ambiente y novedades; la reserva te asegura la visita.",
  primaryCta: { label: "Reservar mesa", href: getQamareroReservationUrl("events") },
  secondaryCta: { label: "Ver Instagram", href: "https://instagram.com/alfresko.granada" },
  items: [
    {
      title: "Desayuno en terraza",
      date: "Desde las 10:00",
      status: "Ideal para venir pronto",
      description:
        "Café, tostadas y terraza al sol para empezar el día en Ogíjares sin complicarte.",
      cta: { label: "Reservar mesa", href: getQamareroReservationUrl("event_card") },
    },
    {
      title: "Ronda con tapa",
      date: "Mediodía y tarde",
      status: "Recomendado reservar",
      description:
        "Cerveza fría, bebida con tapa y terraza para quedarse un rato más en Granada sur.",
      cta: { label: "Reservar mesa", href: getQamareroReservationUrl("event_card") },
    },
    {
      title: "Smash burger plan",
      date: "Carta todo el servicio",
      status: "Las más pedidas",
      description:
        "Nuestras smash burgers 180G con patatas incluidas son el plan rápido para comer bien y seguir.",
      cta: { label: "Ver carta y reservar", href: getQamareroReservationUrl("event_card") },
    },
  ],
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
  { title: "Resumen de negocio", items: ["Reapertura 25 de abril", "CTAs activos", "Páginas SEO publicadas", "Estado de placeholders"] },
  { title: "Horarios estacionales", items: ["25 de abril: reapertura", "Mayo jueves a domingo 10:00–17:00", "1 mayo 10:00–20:00", "2 y 3 mayo 10:00–23:00", "Junio pendiente", "Julio pendiente", "Agosto pendiente", "Septiembre especial"] },
  { title: "Carta y categorías", items: ["Bebidas", "Tapas", "Raciones", "Para compartir", "Opciones para niños"] },
  { title: "SEO local", items: ["Tomar algo en Ogíjares", "Tapas en Ogíjares", "Terraza en Ogíjares", "Bar en Ogíjares"] },
];
