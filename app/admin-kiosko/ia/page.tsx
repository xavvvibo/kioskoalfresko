import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { AdminHeader } from "../_components/AdminHeader";
import { IaAssistantClient } from "./IaAssistantClient";

export const metadata: Metadata = {
  title: "Asistente IA APPCC | Panel interno",
  description: "Base interna para OCR y clasificación inteligente de documentos APPCC.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function IaAppccPage() {
  await requireAdminSession();

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Asistente IA APPCC" description="Subida y clasificación inteligente de documentos sanitarios, albaranes, facturas, etiquetas y registros." />
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12">
        <IaAssistantClient />
      </section>
    </main>
  );
}
