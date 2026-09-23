import type { Metadata } from "next";
import "./globals.css";
import { siteConfig } from "@/content/site";
import { AnalyticsNoScript, AnalyticsScripts } from "@/components/analytics/AnalyticsScripts";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { StickyMobileActions } from "@/components/layout/StickyMobileActions";

export const metadata: Metadata = {
  title: "Kiosko Alfresko | Gracias por este verano",
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.siteUrl),
};

const restaurantJsonLd = {
  "@context": "https://schema.org",
  "@type": "Restaurant",
  "@id": `${siteConfig.siteUrl}/#restaurant`,
  name: siteConfig.name,
  legalName: siteConfig.legalName,
  url: siteConfig.siteUrl,
  telephone: siteConfig.contact.phoneDisplay,
  email: siteConfig.contact.email,
  servesCuisine: ["Smash burgers", "Hamburguesas", "Cocina para compartir", "Tapas"],
  priceRange: "€€",
  hasMenu: `${siteConfig.siteUrl}/carta`,
  sameAs: [siteConfig.contact.instagramUrl],
  event: {
    "@type": "Event",
    name: "Cierre de temporada 2026 de Kiosko Alfresko",
    eventStatus: "https://schema.org/EventCompleted",
    description: "Kiosko Alfresko ha cerrado su temporada 2026 y prepara una nueva apertura en el centro de Granada.",
  },
  address: {
    "@type": "PostalAddress",
    streetAddress: siteConfig.location.addressLine,
    addressLocality: siteConfig.location.city,
    addressRegion: siteConfig.location.region,
    postalCode: siteConfig.location.postalCode,
    addressCountry: "ES",
  },
  department: {
    "@type": "FoodEstablishment",
    name: siteConfig.subBrand.fullName,
    servesCuisine: "Smash burgers",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[#fffaf4] text-stone-950 antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantJsonLd) }}
        />
        <AnalyticsNoScript />
        <AnalyticsScripts />
        <SiteHeader />
        {children}
        <SiteFooter />
        <StickyMobileActions />
      </body>
    </html>
  );
}
