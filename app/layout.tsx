import type { Metadata } from "next";
import "./globals.css";
import { siteConfig } from "@/content/site";
import { AnalyticsNoScript, AnalyticsScripts } from "@/components/analytics/AnalyticsScripts";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { StickyMobileActions } from "@/components/layout/StickyMobileActions";

export const metadata: Metadata = {
  title: "Kiosko Alfresko | Terraza para tomar algo en Ogíjares",
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.siteUrl),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[#fffaf4] text-stone-950 antialiased">
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
