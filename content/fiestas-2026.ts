export const festivalDates = {
  title: "Fiestas de Ogíjares 2026",
  specialLabel: "Horario especial · 10-14 septiembre",
  startDate: "2026-09-10",
  endDate: "2026-09-14",
  homePromotionEndsOn: "2026-09-15",
  dateRange: "Del 10 al 14 de septiembre",
  location: "Parque San Sebastián",
  timezone: "Europe/Madrid",
  pagePath: "/fiestas-ogijares-2026",
};

export const specialOpeningHours = [
  { day: "Jueves 10", shifts: ["20:00 - 05:00"], service: "Cocina y terraza: 20:00-00:00" },
  { day: "Viernes 11", shifts: ["11:30 - 17:00", "20:00 - 05:00"], service: "Cocina y terraza: 12:00-16:00 y 20:00-00:00" },
  { day: "Sábado 12", shifts: ["11:30 - 17:00", "20:00 - 05:00"], service: "Cocina y terraza: 12:00-16:00 y 20:00-00:00" },
  { day: "Domingo 13", shifts: ["11:30 - 17:00", "20:00 - 05:00"], service: "Cocina y terraza: 12:00-16:00 y 20:00-00:00" },
  { day: "Lunes 14", shifts: ["20:00 - 05:00"], service: "Cocina y terraza: 20:00-00:00" },
];

export const serviceHours = [
  "Cocina y terraza: 12:00-16:00 y 20:00-00:00 cuando haya servicio de mediodía.",
  "Jueves y lunes: servicio de cocina/terraza de 20:00-00:00.",
  "Barra disponible hasta cierre.",
];

export type FestivalProgrammeEvent = {
  time: string;
  name: string;
  location?: string;
};

export type FestivalProgrammeDay = {
  date: string;
  shortDate: string;
  events: FestivalProgrammeEvent[];
};

export const festivalProgramme: FestivalProgrammeDay[] = [
  {
    date: "Jueves 10 septiembre",
    shortDate: "Jue 10",
    events: [
      { time: "09:00", name: "Repique de campanas y chupinazo" },
      { time: "09:15", name: "Campeonato de petanca", location: "Recinto Ferial" },
      { time: "09:30", name: "Diana floreada" },
      { time: "10:00", name: "Desayuno para mayores", location: "Recinto Ferial" },
      { time: "12:00", name: "Programa de Onda Cero en directo", location: "Recinto Ferial" },
      { time: "17:30", name: "Pasacalles infantil" },
      { time: "18:15", name: "Merienda infantil", location: "Plaza Alta" },
      { time: "18:30", name: "Espectáculo infantil \"Ratonautas - Mini Rocket\"", location: "Plaza Alta" },
      { time: "19:00-20:00", name: "Feria inclusiva sin ruidos", location: "Recinto Ferial" },
      { time: "20:45", name: "Pregón oficial de las Fiestas 2026" },
      { time: "21:00", name: "Concierto de inauguración BSMO" },
      { time: "21:30", name: "Pasacalles oficial y alumbrado del Real" },
      { time: "21:45", name: "Bienvenida de Hulk y brindis", location: "Recinto Ferial" },
      { time: "22:00", name: "Coronación de Reinas, Damas y Míster", location: "Recinto Ferial" },
      { time: "22:25", name: "Chupinazo y castillo de inauguración", location: "Recinto Ferial" },
      { time: "22:30", name: "Orquesta Rebelión", location: "Recinto Ferial" },
      { time: "23:30", name: "Pepe El Caja", location: "Recinto Ferial" },
    ],
  },
  {
    date: "Viernes 11 septiembre",
    shortDate: "Vie 11",
    events: [
      { time: "09:00", name: "Repique de campanas y chupinazo" },
      { time: "09:30-12:00", name: "Orientación a la tercera edad", location: "Plaza Alta" },
      { time: "11:00", name: "Torneo de pádel Fiestas Ogíjares", location: "Polideportivo Loma Linda" },
      { time: "12:00", name: "Programa de COPE en directo", location: "Recinto Ferial" },
      { time: "14:00", name: "Feria de Día", location: "Recinto Ferial" },
      { time: "14:30", name: "\"Con un par de huevos\"", location: "Recinto Ferial" },
      { time: "17:30", name: "Sanfermines de Ogíjares" },
      { time: "19:00", name: "Frontenis", location: "Polideportivo Loma Linda" },
      { time: "19:30", name: "Baile flamenco EMMDO" },
      { time: "20:00", name: "Partido Barça-Madrid +40", location: "Polideportivo Loma Linda" },
      { time: "20:30", name: "Exhibición de Hip-Hop" },
      { time: "20:30-22:30", name: "Charanga Granamusic" },
      { time: "23:30", name: "Orquesta Vintash", location: "Recinto Ferial" },
      { time: "01:30", name: "DJ Tony Grox", location: "Recinto Ferial" },
    ],
  },
  {
    date: "Sábado 12 septiembre",
    shortDate: "Sáb 12",
    events: [
      { time: "09:45", name: "Diana floreada" },
      { time: "10:00", name: "Campeonato de retoy, dominó y mus", location: "Recinto Ferial" },
      { time: "10:15", name: "Tiro con arco", location: "Parking Centro de Salud" },
      { time: "10:30", name: "Zumba acuático", location: "Piscina Municipal" },
      { time: "10:30", name: "Concurso de pintura infantil", location: "Plaza Federico García Lorca" },
      { time: "11:30", name: "Carreras de cintas en bici", location: "Plaza Baja" },
      { time: "11:00-14:30 / 17:30-20:30", name: "Tren turístico patrimonial", location: "Salida Recinto Ferial" },
      { time: "12:30-14:30", name: "Hinchables y agua", location: "Recinto Ferial" },
      { time: "16:00", name: "José Carlos Escobar, flamenco para bailar", location: "Recinto Ferial" },
      { time: "17:00", name: "Concurso lanzamiento de huesos de aceituna", location: "Recinto Ferial" },
      { time: "18:00", name: "Fiesta de la espuma y deslizante acuático", location: "Recinto Ferial" },
      { time: "18:30", name: "Carreras de cintas en moto", location: "Parque de Los Planetas" },
      { time: "19:00", name: "Humor Amarillo", location: "Polideportivo Loma Linda" },
      { time: "21:00", name: "Exhibición Club Gimnasia Rítmica Ogíjares" },
      { time: "23:30", name: "Orquesta Melodías", location: "Recinto Ferial" },
      { time: "01:30", name: "Raya Real", location: "Recinto Ferial" },
    ],
  },
  {
    date: "Domingo 13 septiembre",
    shortDate: "Dom 13",
    events: [
      { time: "11:00", name: "Diana floreada y repique de campanas" },
      { time: "11:00-14:00", name: "Hinchables deportivos", location: "Recinto Ferial" },
      { time: "12:00", name: "Misa en honor al Cristo de la Expiración", location: "Iglesia de Santa Ana" },
      { time: "14:15", name: "Coro Rociero Canela en Rama", location: "Recinto Ferial" },
      { time: "15:00", name: "Paella popular", location: "Recinto Ferial" },
      { time: "15:00", name: "La Vuelta Ciclista a España pasa por Ogíjares" },
      { time: "15:30", name: "Grupo Tuerca", location: "Recinto Ferial" },
      { time: "16:30", name: "Fiesta de la espuma", location: "Recinto Ferial" },
      { time: "20:00", name: "Procesión del Santísimo Cristo de la Expiración", location: "salida Iglesia de Santa Ana, Lugar Bajo" },
      { time: "22:00", name: "Castillo de fuegos artificiales", location: "Plaza Alta" },
      { time: "22:30", name: "DJ Kokodrilo", location: "Recinto Ferial" },
      { time: "00:30", name: "Orquesta Tentación", location: "Recinto Ferial" },
    ],
  },
  {
    date: "Lunes 14 septiembre",
    shortDate: "Lun 14",
    events: [
      { time: "11:00", name: "Romería al Río Dílar" },
      { time: "14:00", name: "Concurso de tortilla de papas y sangría" },
      { time: "14:30", name: "Degustación de pan con uvas y queso" },
      { time: "16:00", name: "Subida al palo jamonero" },
      { time: "17:00", name: "Carrera tradicional de mujeres casadas" },
      { time: "17:15", name: "Degustación de piononos" },
      { time: "17:30", name: "Carreras de sacos infantil y juvenil" },
      { time: "18:30", name: "Regreso de la romería" },
      { time: "19:00", name: "Día del niño en las atracciones", location: "Recinto Ferial" },
      { time: "19:00-20:00", name: "Feria inclusiva sin ruidos", location: "Recinto Ferial" },
      { time: "22:00", name: "Orquesta Odysseus", location: "Recinto Ferial" },
      { time: "23:00", name: "Chambao", location: "Recinto Ferial" },
      { time: "00:45", name: "Traca fin de fiestas", location: "Recinto Ferial" },
    ],
  },
];

export function isFestivalHomePromotionActive(date = new Date()) {
  const madridDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: festivalDates.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  return madridDate >= festivalDates.startDate && madridDate < festivalDates.homePromotionEndsOn;
}
