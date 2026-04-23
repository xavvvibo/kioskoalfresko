import { seoLandings } from "@/content/site";
import { buildMetadata } from "@/lib/metadata";
import { LocalLanding } from "@/components/seo/LocalLanding";

const page = seoLandings.find((item) => item.slug === "bar-en-ogijares")!;
export const metadata = buildMetadata({ title: page.title, description: page.description, path: `/${page.slug}` });
export default function SeoPage() { return <LocalLanding page={page} />; }
