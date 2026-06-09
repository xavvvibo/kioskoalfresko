import type { ActionLink, MenuCategory, ScheduleEvent, SeasonalScheduleItem, SeoLanding } from "@/types/site";
import { QAMARERO_BOOKING_URL, getQamareroReservationUrl } from "@/lib/integrations/qamarero";

export const siteConfig = {
  name: "Kiosko Alfresko",
  legalName: "Kiosko Alfresko",
  siteUrl: "https://kioskoalfresko.es",
  domain: "kioskoalfresko.es",
  locale: "es_ES",
  description:
    "Terraza en Ogíjares, Granada sur, con tapas, smash burgers, carnes a la brasa y ambiente nocturno. Reabrimos el jueves 11 de junio para la temporada de verano 2026 con horario de miércoles a domingos, de 20:00h a 24:00h.",
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
    headline: "Volvemos a Alfresko",
    subheadline:
      "Después del descanso de Corpus, reabrimos nuestras puertas para una nueva temporada de verano llena de cenas, tapas, hamburguesas, carnes a la brasa y el mejor ambiente al aire libre.",
    support: ["Jueves 11 de junio", "Miércoles a domingos · 20:00h a 24:00h", "Temporada de verano 2026"],
  },
  schedule: {
    currentLabel: "Abierto",
    currentSummary: "Miércoles a domingos · 20:00h a 24:00h.",
    note: "Te esperamos desde el jueves 11 de junio para volver a las noches ALFRESKO en Ogíjares, Granada sur.",
  },
};

export const seasonalSchedule: SeasonalScheduleItem[] = [
  { month: "Junio", status: "confirmed", summary: "Miércoles a domingos · 20:00h a 24:00h", note: "Reapertura oficial el jueves 11 de junio para arrancar la temporada de verano 2026.", highlight: true },
  { month: "Julio", status: "confirmed", summary: "Miércoles a domingos · 20:00h a 24:00h", note: "Noches de terraza, tapas, burgers y carnes a la brasa en Ogíjares." },
  { month: "Agosto", status: "confirmed", summary: "Miércoles a domingos · 20:00h a 24:00h", note: "Reserva tus noches ALFRESKO si vienes en grupo o quieres asegurar mesa." },
  { month: "Septiembre", status: "special", summary: "Horario especial si aplica", note: "Si hubiera alguna actualización en septiembre, la anunciaremos también en Instagram." },
];

export const maySchedule = {
  normalLabel: "Temporada de verano 2026",
  normalHours: "Miércoles a domingos · 20:00h a 24:00h",
  normalSummary: "Reabrimos el jueves 11 de junio con horario de verano confirmado: miércoles a domingos, de 20:00h a 24:00h.",
  weekendNotice: "Abierto",
  weekendLead: "Cenas, tapas, smash burgers, carnes a la brasa y el mejor ambiente nocturno al aire libre en Ogíjares.",
};

export const maySpecialEvents: ScheduleEvent[] = [
  {
    date: "Reapertura",
    title: "Jueves 11 de junio",
    hours: "Miércoles a domingos · 20:00h a 24:00h",
    note: "La temporada de verano 2026 arranca con horario confirmado y reservas abiertas.",
    highlight: true,
  },
];

export const maySalesFocus = {
  title: "🌙 Noches ALFRESKO",
  body: "Vuelve la temporada de verano con cenas al aire libre, tapas, cerveza fría, smash burgers y carnes a la brasa en Ogíjares, Granada sur.",
  extra: "Reserva tu mesa para la reapertura y prepárate para volver al ambiente nocturno de ALFRESKO.",
  microcopy: [
    "Parque San Sebastián · Ogíjares",
    "Smash 180G + patatas",
    "Miércoles a domingos",
    "20:00h a 24:00h",
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
    detail: "Miércoles a domingos de 20:00h a 24:00h con ambiente nocturno, burgers y carnes a la brasa.",
  },
  {
    date: "Instagram",
    title: "📲 Novedades en tiempo real",
    detail: "Síguenos para ver el ambiente de reapertura y las noches de verano en Ogíjares.",
  },
];

export const upcomingEvents = {
  eyebrow: "Reserva tu mesa",
  title: "Planes para volver a las noches de terraza",
  intro: "Desde el jueves 11 de junio vuelve la temporada de verano con tapas, smash burgers, carnes a la brasa y terraza en el Parque San Sebastián de Ogíjares.",
  reservationTitle: "¿Vienes con mesa reservada?",
  reservationBody:
    "Si ya sabes que venís, reservar mesa ayuda a llegar con el plan más cómodo y empezar la noche sin esperas innecesarias.",
  reservationMicrocopy:
    "Instagram te enseña el ambiente; la reserva te deja lista la parte importante.",
  primaryCta: { label: "Reservar mesa", href: getQamareroReservationUrl("events") },
  secondaryCta: { label: "Ver Instagram", href: "https://instagram.com/alfresko.granada" },
  items: [
    {
      title: "Noche de terraza",
      date: "Desde las 20:00h",
      status: "Ideal para la reapertura",
      description:
        "La reapertura llega con terraza al aire libre, tapas y ambiente de verano en Ogíjares.",
      cta: { label: "Reservar mesa", href: getQamareroReservationUrl("event_card") },
    },
    {
      title: "Ronda con tapa",
      date: "Tarde y noche",
      status: "Perfecto para compartir",
      description:
        "Cerveza fría, bebida con tapa y terraza para quedarse un rato más en Granada sur.",
      cta: { label: "Reservar mesa", href: getQamareroReservationUrl("event_card") },
    },
    {
      title: "Smash burger plan",
      date: "De miércoles a domingos",
      status: "De las más pedidas",
      description:
        "Nuestras smash burgers 180G con patatas incluidas son el plan rápido para comer bien y seguir.",
      cta: { label: "Ver carta y reservar", href: getQamareroReservationUrl("event_card") },
    },
  ],
};

export const specialWeekendCampaign = {
  eyebrow: "Este finde en ALFRESKO",
  title: "Feria de la Cultura y del Ocio + Paella solidaria",
  intro:
    "Un fin de semana con ambiente en la terraza de Ogíjares: eventos, tapas, cerveza fría y smash burgers en Granada sur.",
  scheduleTitle: "Horario especial",
  schedule: [
    { day: "Viernes", hours: "Tarde y noche" },
    { day: "Sábado", hours: "Mediodía, tarde y noche" },
    { day: "Domingo", hours: "Plan de mediodía + paella solidaria" },
  ],
  highlights: [
    "Terraza con ambiente",
    "Reserva recomendada",
    "Tapas y cerveza fría",
    "Smash burgers 180G",
  ],
  reservationNote:
    "Si vienes a los eventos o a la paella solidaria, reservar mesa y revisar Instagram antes de salir puede ayudarte a venir más tranquilo.",
};

export const corpusClosureNotice = {
  eyebrow: "Abierto",
  title: "¡Volvemos después del descanso de Corpus!",
  body:
    "Reabrimos el jueves 11 de junio para arrancar la temporada de verano 2026 con cenas, tapas, hamburguesas, carnes a la brasa y el mejor ambiente al aire libre.",
  support:
    "Te esperamos en el Parque San Sebastián de Ogíjares. Reserva tu mesa y vuelve a vivir la experiencia ALFRESKO.",
};

export const summerReopening = {
  badge: "Abierto",
  returnTitle: "Volvemos el 11 de junio",
  days: "Miércoles a domingos",
  hours: "20:00h a 24:00h",
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
  { title: "Resumen de negocio", items: ["Reapertura 25 de abril", "CTAs activos", "Páginas SEO publicadas", "Estado de placeholders"] },
  { title: "Horarios estacionales", items: ["25 de abril: reapertura", "Mayo jueves a domingo 10:00–17:00", "1 mayo 10:00–20:00", "2 y 3 mayo 10:00–23:00", "Junio pendiente", "Julio pendiente", "Agosto pendiente", "Septiembre especial"] },
  { title: "Carta y categorías", items: ["Bebidas", "Tapas", "Raciones", "Para compartir", "Opciones para niños"] },
  { title: "SEO local", items: ["Tomar algo en Ogíjares", "Tapas en Ogíjares", "Terraza en Ogíjares", "Bar en Ogíjares"] },
];
