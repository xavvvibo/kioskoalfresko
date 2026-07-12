import type { MenuPromo, MenuSection } from "@/types/site";

export const menuHero = {
  eyebrow: "Carta",
  title: "SMASH LAB by Alfresko y carta para compartir",
  subtitle: "Smash burgers, cocina para compartir, bebidas con tapa y terraza.",
  supportingText:
    "Kiosko Alfresko presenta SMASH LAB by Alfresko: burgers con patatas incluidas, platos para compartir y pedidos para recoger en Ogíjares.",
};

export const smashPromo: MenuPromo = {
  title: "SMASH LAB",
  subtitle: "by Alfresko · todas las burgers con patatas incluidas",
  claim: "Nueva submarca",
  price: "14,00 €",
  variants: ["FERXA TRUFADA", "BOURBON BACON", "POLLO KICK"],
  image: {
    src: "/menu/smash-burgers-hero-clean.png",
    alt: "Smash burgers de SMASH LAB by Alfresko con patatas",
  },
};

export const featuredBurgers = [
  {
    name: "FERXA TRUFADA",
    description: "Doble smash, cheddar, cebolla caramelizada, mayo trufada, parmesano y cebollino.",
    price: "14,00 €",
    badge: "NUEVA",
  },
  {
    name: "BOURBON BACON",
    description: "Doble smash, cheddar, bacon crujiente, cebolla caramelizada y BBQ bourbon casera.",
    price: "14,00 €",
    badge: "NUEVA",
  },
  {
    name: "POLLO KICK",
    description: "Contramuslo de pollo crujiente, ranch casera, pepinillos y miel ahumada.",
    price: "14,00 €",
    badge: "NUEVA",
  },
];

export const foodSections: MenuSection[] = [
  {
    id: "smash-lab",
    title: "SMASH LAB by Alfresko",
    eyebrow: "Burgers · Patatas incluidas",
    intro: "Todas las burgers a 14,00 €. Las tres nuevas recetas aparecen destacadas como NUEVA.",
    accent: "red",
    items: [
      {
        name: "FERXA TRUFADA",
        price: "14,00 €",
        description: "Doble smash, cheddar, cebolla caramelizada, mayo trufada, parmesano y cebollino.",
        badge: "NUEVA",
      },
      {
        name: "BOURBON BACON",
        price: "14,00 €",
        description: "Doble smash, cheddar, bacon crujiente, cebolla caramelizada y BBQ bourbon casera.",
        badge: "NUEVA",
      },
      {
        name: "POLLO KICK",
        price: "14,00 €",
        description: "Contramuslo de pollo crujiente, ranch casera, pepinillos y miel ahumada.",
        badge: "NUEVA",
      },
      {
        name: "BACONERA",
        price: "14,00 €",
        description: "Doble smash, cheddar americano y mermelada de bacon casera.",
      },
      {
        name: "AHUMADA",
        price: "14,00 €",
        description: "Doble smash, queso ahumado y ajonesa ahumada casera.",
      },
      {
        name: "CABRA LOCA",
        price: "14,00 €",
        description: "Doble smash, queso de cabra, cebolla caramelizada y BBQ casera.",
      },
    ],
  },
  {
    id: "lab-extras",
    title: "Lab extras",
    accent: "dark",
    items: [
      { name: "Huevo a la plancha", price: "+1,50 €" },
      { name: "Bacon extra", price: "+1,50 €" },
      { name: "Queso extra", price: "+1,50 €" },
      { name: "Pepinillos extra", price: "+1,50 €" },
      { name: "Jalapeños", price: "+1,00 €" },
      { name: "Salsa extra", price: "+1,00 €" },
    ],
  },
  {
    id: "para-compartir",
    title: "Para compartir",
    accent: "dark",
    items: [
      {
        name: "NACHOS SUPREME",
        price: "15,00 €",
        description: "Totopos de maíz, cheddar fundido, carne smash, pico de gallo, guacamole casero y jalapeños.",
      },
      {
        name: "ALITAS BBQ",
        price: "11,00 € / 18,00 €",
        description: "Jugosas alitas de pollo con nuestra salsa BBQ casera.",
        note: "6 unidades: 11,00 € · 10 unidades: 18,00 €",
      },
      {
        name: "CROQUETAS CASERAS",
        price: "12,00 €",
        description: "8 unidades. A elegir 4 tipos: jamón ibérico, queso azul, boletus y vacuno.",
      },
      {
        name: "PROVOLONE TRUFADO Y PASAS",
        price: "15,00 €",
        description: "Provolone fundido al horno con aceite de trufa y pasas.",
      },
      {
        name: "ENSALADA CAPRESE",
        price: "13,00 €",
        description: "Tomate en rodajas, burrata al centro, albahaca fresca y aceite de albahaca.",
      },
    ],
  },
  {
    id: "huevos",
    title: "No me toques los huevos",
    accent: "light",
    items: [
      { name: "Con jamón", price: "13,00 €" },
      { name: "Con gulas", price: "14,00 €" },
      { name: "Con secreto", price: "16,00 €" },
      { name: "Con morcilla", price: "13,00 €" },
      { name: "Con chistorra", price: "13,00 €" },
    ],
  },
  {
    id: "patatas",
    title: "Patatas con toppings",
    accent: "light",
    items: [
      {
        name: "BACON CHEDDAR",
        price: "7,00 €",
        description: "Patatas fritas, cheddar fundido, bacon crujiente y cebollino.",
      },
      {
        name: "SMASH FRIES",
        price: "8,50 €",
        description: "Patatas fritas, carne smash, cheddar, pico de gallo y salsa Smash Lab.",
      },
      {
        name: "TRUFADAS",
        price: "8,00 €",
        description: "Patatas fritas, parmesano, alioli trufado, cebolla crispy y cebollino.",
      },
    ],
  },
  {
    id: "carnes",
    title: "Carnes",
    accent: "dark",
    items: [
      {
        name: "COSTILLAS BBQ",
        price: "18,00 €",
        description: "600 g aproximadamente. Tiernas costillas cocinadas a baja temperatura con nuestra salsa BBQ casera.",
      },
      {
        name: "SECRETO",
        price: "17,00 €",
        description: "300 g aproximadamente. Secreto ibérico a la brasa.",
      },
      {
        name: "CACHOPO SERRANO Y QUESO",
        price: "18,00 €",
        description: "Con jamón serrano y queso.",
      },
      {
        name: "CACHOPO DE RULO DE CABRA Y CEBOLLA CARAMELIZADA",
        price: "18,00 €",
        description: "Con rulo de cabra y cebolla caramelizada.",
      },
    ],
  },
];

export const drinksSections: MenuSection[] = [
  {
    id: "refrescos",
    title: "Bebidas con tapa",
    eyebrow: "Refrescos",
    intro: "Refrescos a 2,80 €.",
    accent: "light",
    items: [
      {
        name: "REFRESCOS",
        price: "2,80 €",
        description: "Coca-Cola, Coca-Cola Zero Zero, Fanta Naranja, Fanta Limón, Aquarius Limón, Aquarius Naranja, Fuze Tea Limón, Fuze Tea Maracuyá y 7UP.",
      },
      { name: "Mosto sin alcohol", price: "2,50 €" },
      { name: "Zumos", price: "2,00 €" },
      { name: "Agua mineral", price: "2,00 €" },
      { name: "Agua con gas", price: "2,50 €" },
    ],
  },
  {
    id: "cervezas",
    title: "Cervezas",
    accent: "dark",
    items: [
      { name: "Alhambra Especial barril", price: "3,00 €" },
      { name: "Alhambra Especial tercio", price: "3,50 €" },
      { name: "Alhambra Sin Alcohol", price: "3,00 €" },
      { name: "Alhambra Radler tercio", price: "3,50 €" },
      { name: "Alhambra 1925", price: "3,80 €" },
      { name: "Alhambra 0,0 Tostada", price: "3,00 €" },
      { name: "Corona 0,0", price: "3,50 €" },
    ],
  },
  {
    id: "vinos-copas",
    title: "Vinos y copas",
    accent: "red",
    items: [
      { name: "Tinto de verano", price: "3,00 €" },
      { name: "Ribera del Duero", price: "3,80 €" },
      { name: "Rioja", price: "3,80 €" },
      { name: "Rueda Verdejo", price: "3,00 €" },
      { name: "Combinados premium", price: "6,00 €" },
    ],
  },
];

export const menuArtwork = {
  foodAndDrinks: {
    src: "/menu/kiosko-alfresko-carta-comida-bebida.jpg",
    alt: "Carta visual de comida y bebida de Kiosko Alfresko",
  },
  smashLabLegacy: {
    src: "/menu/smash-lab-burgers.jpg",
    alt: "Carta visual antigua de SMASH LAB by Alfresko",
  },
};

export const menuFooter = {
  claim: "SMASH LAB, cocina para compartir y terraza para quedarse un poco más.",
  social: "@alfresko.granada",
};
