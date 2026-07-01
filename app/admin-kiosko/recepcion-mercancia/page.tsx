import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getRecentGoodsReceptionRecords, getSupplierOptions, type SupplierOption } from "@/lib/admin-kiosko/database";
import { saveGoodsReceptionRecordAction } from "../actions";
import { BasicRecordForm } from "../_components/BasicRecordForm";
import { RecordPageShell } from "../_components/RecordPageShell";

export const metadata: Metadata = {
  title: "Recepción de mercancía | Panel interno",
  description: "Control interno de recepción de mercancía y trazabilidad.",
};

function SupplierSelector({ suppliers }: { suppliers: SupplierOption[] }) {
  return (
    <div className="grid gap-3">
      <label className="grid gap-2 text-sm font-semibold text-stone-200">
        Proveedor autorizado
        <select required name="supplier_name" defaultValue={suppliers[0]?.name || "__new__"} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30">
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.name}>{supplier.name}{supplier.tax_id ? ` · ${supplier.tax_id}` : ""}</option>
          ))}
          <option value="__new__">Añadir nuevo proveedor</option>
        </select>
      </label>
      <details className="rounded-2xl border border-amber-300/30 bg-amber-100 px-4 py-3 text-amber-950">
        <summary className="cursor-pointer text-sm font-black uppercase tracking-[0.12em]">Añadir nuevo proveedor</summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input name="new_supplier_name" placeholder="Nombre proveedor" className="rounded-xl border border-amber-950/15 bg-white px-3 py-2 text-sm text-stone-950" />
          <input name="new_supplier_tax_id" placeholder="CIF/NIF" className="rounded-xl border border-amber-950/15 bg-white px-3 py-2 text-sm text-stone-950" />
          <input name="new_supplier_phone" placeholder="Teléfono" className="rounded-xl border border-amber-950/15 bg-white px-3 py-2 text-sm text-stone-950" />
          <input name="new_supplier_email" placeholder="Email" className="rounded-xl border border-amber-950/15 bg-white px-3 py-2 text-sm text-stone-950" />
          <input name="new_supplier_contact" placeholder="Persona contacto" className="rounded-xl border border-amber-950/15 bg-white px-3 py-2 text-sm text-stone-950" />
          <input name="new_supplier_observations" placeholder="Observaciones" className="rounded-xl border border-amber-950/15 bg-white px-3 py-2 text-sm text-stone-950" />
        </div>
        <p className="mt-3 text-sm font-semibold">Proveedor registrado. Información administrativa pendiente de completar.</p>
      </details>
    </div>
  );
}

export default async function RecepcionMercanciaPage({
  searchParams,
}: {
  searchParams?: Promise<{ saved?: string; error?: string }>;
}) {
  await requireAdminSession();
  const params = await searchParams;
  const [records, suppliersResult] = await Promise.all([
    getRecentGoodsReceptionRecords(),
    getSupplierOptions(),
  ]);
  const suppliers = suppliersResult.ok ? suppliersResult.data : [];

  return (
    <RecordPageShell
      title="Recepción de mercancía"
      description="Entrada de producto, conformidad, temperatura y trazabilidad."
      saved={params?.saved === "1"}
      error={params?.error}
      records={records.ok ? records.data : []}
    >
      <BasicRecordForm
        action={saveGoodsReceptionRecordAction}
        subjectName="product"
        subjectLabel="Tipo de mercancía"
        options={["Refrigerado", "Congelado", "Seco", "Bebidas", "Producto fresco", "Otro"]}
      >
        <SupplierSelector suppliers={suppliers} />
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
