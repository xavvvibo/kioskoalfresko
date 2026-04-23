import { buildMetadata } from "@/lib/metadata";
import { OwnerDashboard } from "@/components/owner/OwnerDashboard";

export const metadata = buildMetadata({
  title: "Owner dashboard | Kiosko Alfresko",
  description: "Base privada de administración preparada para contenido, horarios y SEO.",
  path: "/owner",
});

export default function OwnerPage() {
  return <OwnerDashboard />;
}
