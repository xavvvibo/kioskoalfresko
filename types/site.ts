export type SeasonStatus = "confirmed" | "pending" | "special";

export type SeasonalScheduleItem = {
  month: string;
  status: SeasonStatus;
  summary: string;
  note?: string;
  highlight?: boolean;
};

export type ScheduleEvent = {
  date: string;
  title: string;
  hours: string;
  note?: string;
  highlight?: boolean;
};

export type MenuCategory = {
  id: string;
  title: string;
  description: string;
  placeholder: boolean;
};

export type SeoLanding = {
  slug: string;
  shortTitle: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  bullets: string[];
};

export type ActionLink = {
  label: string;
  href: string;
  kind?: "primary" | "secondary" | "ghost";
};

export type MenuItem = {
  name: string;
  price: string;
  description?: string;
  note?: string;
  badge?: string;
};

export type MenuSection = {
  id: string;
  title: string;
  eyebrow?: string;
  intro?: string;
  accent?: "light" | "dark" | "red";
  items: MenuItem[];
};

export type MenuPromo = {
  title: string;
  subtitle: string;
  claim: string;
  price: string;
  variants: string[];
  image?: {
    src: string;
    alt: string;
  };
};

export type MenuArtwork = {
  src: string;
  alt: string;
};
