import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getProductionBatchByBatchCode } from "@/lib/admin-kiosko/database";
import { AdminHeader } from "../../_components/AdminHeader";

export const metadata: Metadata = {
  title: "Resolver QR interno | Panel interno",
  description: "Resolucion interna protegida de codigos QR del ERP.",
};

function decodeQrValue(value: string) {
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return "";
  }
}

function ErrorPanel({ title, detail, qrValue }: { title: string; detail: string; qrValue?: string }) {
  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="QR interno" description="No se pudo resolver el codigo escaneado." />
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 md:py-12">
        <div className="rounded-[2rem] border border-[#d94b2b]/40 bg-[#151515] p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f2c6bb]">Resolucion QR</p>
          <h1 className="mt-2 text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">{title}</h1>
          <p className="mt-3 text-sm font-semibold text-stone-300">{detail}</p>
          {qrValue ? (
            <p className="mt-4 break-all rounded-[1.2rem] border border-white/10 bg-white/6 p-4 font-mono text-xs text-stone-200">{qrValue}</p>
          ) : null}
          <Link href="/admin-kiosko/produccion#lotes" className="mt-5 inline-flex rounded-full border border-white/15 bg-white/8 px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white">
            Ver lotes internos
          </Link>
        </div>
      </section>
    </main>
  );
}

export default async function InternalQrResolverPage({
  params,
}: {
  params: Promise<{ value: string }>;
}) {
  await requireAdminSession();
  const { value } = await params;
  const qrValue = decodeQrValue(value);
  const prefix = "ERP:prep_batch:";

  if (!qrValue || !qrValue.startsWith(prefix)) {
    return (
      <ErrorPanel
        title="Formato de QR no valido"
        detail="Este codigo no corresponde a un lote interno de subelaboracion del ERP."
        qrValue={qrValue || value}
      />
    );
  }

  const batchCode = qrValue.slice(prefix.length).trim();
  if (!batchCode) {
    return (
      <ErrorPanel
        title="Lote no informado"
        detail="El QR indica un lote de subelaboracion, pero no contiene codigo de lote."
        qrValue={qrValue}
      />
    );
  }

  const result = await getProductionBatchByBatchCode(batchCode);
  if (!result.ok) {
    return (
      <ErrorPanel
        title="No se pudo consultar el lote"
        detail={result.error}
        qrValue={qrValue}
      />
    );
  }

  if (!result.data) {
    return (
      <ErrorPanel
        title="Lote no encontrado"
        detail={`No existe ningun lote interno con codigo ${batchCode}.`}
        qrValue={qrValue}
      />
    );
  }

  redirect(`/admin-kiosko/produccion/lotes/${result.data.id}`);
}
