import type { Metadata } from "next";
import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { getInboxMetrics, listInboxDocuments, listInboxGroups } from "@/lib/admin-kiosko/database";
import { AdminHeader } from "../_components/AdminHeader";
import { InboxClient } from "./InboxClient";

export const metadata: Metadata = {
  title: "Bandeja de entrada inteligente | Panel interno",
  description: "Entrada documental única del ERP APPCC interno.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function InboxPage({
  searchParams,
}: {
  searchParams?: Promise<{ saved?: string; error?: string }>;
}) {
  await requireAdminPermission("settings:manage");
  const params = await searchParams;
  const [documentsResult, groupsResult, metricsResult] = await Promise.all([
    listInboxDocuments({ limit: 200 }),
    listInboxGroups(40),
    getInboxMetrics(),
  ]);

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader
        title="Bandeja de entrada inteligente"
        description="Arrastra documentos, revisa la clasificación y confirma la entrada única hacia compras, APPCC, inventario, trazabilidad y etiquetas."
      />
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12">
        {!documentsResult.ok ? (
          <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-950">
            La bandeja necesita aplicar el SQL documental antes de listar documentos: {documentsResult.error}
          </div>
        ) : null}
        <InboxClient
          documents={documentsResult.ok ? documentsResult.data : []}
          groups={groupsResult.ok ? groupsResult.data : []}
          metrics={metricsResult.ok ? metricsResult.data : null}
          saved={params?.saved === "1"}
          errorMessage={params?.error}
        />
      </section>
    </main>
  );
}
