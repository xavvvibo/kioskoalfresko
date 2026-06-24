import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getRecentGoodsReceptionRecords } from "@/lib/admin-kiosko/database";
import { saveGoodsReceptionRecordAction } from "../actions";
import { BasicRecordForm } from "../_components/BasicRecordForm";
import { RecordPageShell } from "../_components/RecordPageShell";

export const metadata: Metadata = {
  title: "Recepción de mercancía | Panel interno",
  description: "Control interno de recepción de mercancía y trazabilidad.",
};

export default async function RecepcionMercanciaPage({
  searchParams,
}: {
  searchParams?: Promise<{ saved?: string; error?: string }>;
}) {
  await requireAdminSession();
  const params = await searchParams;
  const records = await getRecentGoodsReceptionRecords();

  return (
    <RecordPageShell
      title="Recepción de mercancía"
      description="Entrada de producto, conformidad, temperatura y trazabilidad."
      saved={params?.saved === "1"}
      error={params?.error === "1"}
      records={records.ok ? records.data : []}
    >
      <BasicRecordForm
        action={saveGoodsReceptionRecordAction}
        subjectName="product"
        subjectLabel="Tipo de mercancía"
        options={["Refrigerado", "Congelado", "Seco", "Bebidas", "Producto fresco", "Otro"]}
      >
        <label className="grid gap-2 text-sm font-semibold text-stone-200">
          Proveedor
          <input required name="supplier" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-stone-200">
          Temperatura entrega
          <input name="delivery_temperature" inputMode="decimal" placeholder="Ej. 3.8 °C" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
        </label>
        <label className="flex items-center gap-3 rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm font-semibold text-stone-200">
          <input name="accepted" type="checkbox" defaultChecked className="h-5 w-5" />
          Mercancía aceptada
        </label>
        <label className="grid gap-2 text-sm font-semibold text-stone-200">
          Lote
          <input name="batch_number" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-stone-200">
          Caducidad
          <input name="expiry_date" type="date" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
        </label>
      </BasicRecordForm>
    </RecordPageShell>
  );
}
