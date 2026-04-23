import type { MenuPromo, MenuSection } from "@/types/site";

export const menuHero = {
  eyebrow: "Carta",
  title: "No es un kiosko. Es el plan.",
  subtitle: "Pide rápido. Comparte. Alárgalo.",
  supportingText:
    "Carta en bloques claros, precios visibles y el foco donde tiene que estar: smash burgers, parrilla y cosas para quedarse más de la cuenta.",
};

export const smashPromo: MenuPromo = {
  title: "Smash Burgers 180G 🔥",
  subtitle: "Doble carne smash + patatas incluidas",
  claim: "Las más pedidas 🔥",
  price: "14,00€",
  variants: ["Ahumada", "Baiconera", "Cabra Loca"],
  image: {
    src: "/menu/smash-burgers-hero.png",
    alt: "Smash burgers de Kiosko Alfresko con patatas",
  },
};

export const foodSections: MenuSection[] = [
  {
    id: "smash-burgers",
    title: "Smash Burgers 180G 🔥",
    eyebrow: "Las más pedidas",
    intro: "Doble carne smash + patatas incluidas",
    accent: "red",
    items: [
      {
        name: "Ahumada",
        price: "14,00€",
        description: "queso, bacon y salsa ahumada",
      },
      {
        name: "Baiconera",
        price: "14,00€",
        description: "doble bacon, queso y salsa kiosko",
      },
      {
        name: "Cabra Loca",
        price: "14,00€",
        description: "queso de cabra, cebolla caramelizada y salsa kiosko",
      },
    ],
  },
  {
    id: "parrilla-premium",
    title: "Parrilla Premium",
    accent: "dark",
    items: [
      {
        name: "Chuletón",
        price: "50,00€",
        note: "1kg aprox. · vaca / ternera",
      },
      {
        name: "Tomahawk",
        price: "40,00€",
        note: "800g",
      },
    ],
  },
  {
    id: "brasa",
    title: "Brasa",
    accent: "light",
    items: [
      { name: "Morcilla", price: "7,50€" },
      { name: "Chorizo / Longaniza", price: "7,50€" },
      { name: "Panceta", price: "7,50€" },
    ],
  },
  {
    id: "para-compartir",
    title: "Para Compartir",
    accent: "dark",
    items: [
      { name: "Cachopo", price: "18,00€" },
      { name: "Secreto ibérico", price: "17,00€" },
      { name: "Alitas (6 unidades)", price: "11,00€" },
      { name: "Alitas (10 unidades)", price: "18,00€" },
      { name: "Costillas BBQ", price: "14,00€" },
    ],
  },
  {
    id: "patatas",
    title: "Patatas",
    accent: "light",
    items: [
      { name: "Patatas con cheddar y bacon", price: "6,00€" },
      { name: "Patatas con aliño casero", price: "4,50€" },
      { name: "Patatas trufadas", price: "6,00€" },
    ],
  },
  {
    id: "sin-complicarse",
    title: "Sin Complicarse",
    accent: "light",
    items: [
      { name: "Nachos con guacamole y carne", price: "13,00€" },
      { name: "Provolone trufado", price: "15,00€" },
      { name: "Alcachofas con anchoas", price: "13,00€" },
      { name: "Ensalada caprese", price: "13,00€" },
    ],
  },
  {
    id: "huevos",
    title: "No Me Toques los Huevos",
    accent: "dark",
    items: [
      { name: "Huevos con jamón", price: "13,00€" },
      { name: "Huevos con gulas", price: "14,00€" },
      { name: "Huevos con foie", price: "16,00€" },
    ],
  },
  {
    id: "peques",
    title: "Peques",
    accent: "light",
    items: [
      { name: "Burger peques con patatas", price: "7,50€" },
      { name: "Nuggets de pollo con patatas", price: "7,50€" },
    ],
  },
  {
    id: "planes",
    title: "Planes",
    accent: "red",
    items: [
      {
        name: "BBQ Rápido",
        price: "20,00€",
        description: "morcilla + chorizo + panceta",
      },
      {
        name: "Plan Pareja",
        price: "25,00€",
        description: "provolone + alitas (6) + 2 bebidas",
      },
      {
        name: "Plan Grupo",
        price: "35,00€",
        description: "cachopo + costillas + 4 bebidas",
      },
    ],
  },
];

export const drinksSections: MenuSection[] = [
  {
    id: "refrescos",
    title: "Refrescos",
    accent: "light",
    items: [
      { name: "Coca-Cola", price: "2,80€" },
      { name: "Coca-Cola Zero", price: "2,80€" },
      { name: "Fanta Naranja", price: "2,80€" },
      { name: "Fanta Limón", price: "2,80€" },
      { name: "Nestea", price: "3,00€" },
      { name: "Aquarius Limón", price: "3,00€" },
      { name: "Sprite", price: "2,80€" },
      { name: "Trina Naranja", price: "2,80€" },
      { name: "Trina Limón", price: "2,80€" },
      { name: "Agua (50cl)", price: "2,00€" },
    ],
  },
  {
    id: "cervezas",
    title: "Cervezas",
    accent: "dark",
    items: [
      { name: "Alhambra Especial", price: "3,00€" },
      { name: "Tercio Alhambra (33cl)", price: "3,50€" },
      { name: "Alhambra Reserva 1925", price: "3,00€" },
      { name: "Heineken 0,0", price: "3,00€" },
    ],
  },
  {
    id: "packs",
    title: "Packs",
    intro: "Sin tapa",
    accent: "red",
    items: [
      { name: "Cubo 3 tercios", price: "8,50€" },
      { name: "Cubo 5 tercios", price: "14,00€" },
      { name: "Cubo 10 tercios", price: "24,00€", badge: "El más pedido 🔥" },
    ],
  },
];

export const menuFooter = {
  claim: "Bebe. Come. Quédate.",
  social: "@alfresko.granada",
};
