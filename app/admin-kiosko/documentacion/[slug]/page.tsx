import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { PendingDigitalizationPage } from "../../_components/PendingDigitalizationPage";

export const metadata: Metadata = {
  title: "Documento APPCC | Panel interno",
  description: "Documento interno pendiente de digitalización.",
};

const titles: Record<string, string> = {
  "memoria-tecnico-sanitaria": "Memoria Técnico Sanitaria",
  "buenas-practicas": "Buenas Prácticas de Manipulación",
  "planes-appcc": "Planes APPCC",
  protocolos: "Protocolos",
  alergenos: "Alérgenos",
  "fichas-tecnicas": "Fichas técnicas",
  "libros-registro-appcc": "Libros Registro APPCC",
  "acciones-correctoras": "Acciones correctoras",
};

export default async function DocumentoPendientePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireAdminSession();
  const { slug } = await params;

  return <PendingDigitalizationPage title={titles[slug] || "Documento APPCC"} />;
}
