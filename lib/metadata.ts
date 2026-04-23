import type { Metadata } from "next";
import { siteConfig } from "@/content/site";

export function buildMetadata(args: { title: string; description: string; path?: string }): Metadata {
  const url = `${siteConfig.siteUrl}${args.path || ""}`;
  return {
    title: args.title,
    description: args.description,
    metadataBase: new URL(siteConfig.siteUrl),
    openGraph: {
      title: args.title,
      description: args.description,
      url,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: args.title,
      description: args.description,
    },
    alternates: {
      canonical: args.path || "/",
    },
  };
}
