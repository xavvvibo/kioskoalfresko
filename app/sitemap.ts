import type { MetadataRoute } from "next";
import { seoLandings, siteConfig } from "@/content/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ["", "/carta", "/horarios", "/ubicacion-ogijares", "/reservas-contacto", "/owner", "/aviso-legal", "/privacidad", "/cookies"];
  return [
    ...staticRoutes.map((path) => ({
      url: `${siteConfig.siteUrl}${path}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.7,
    })),
    ...seoLandings.map((page) => ({
      url: `${siteConfig.siteUrl}/${page.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
