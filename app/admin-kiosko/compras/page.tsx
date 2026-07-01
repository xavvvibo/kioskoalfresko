import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getInventoryMovements, getRecentGoodsReceptionRecords, getSupplierProfiles, getExecutiveDashboardMetrics } from "@/lib/admin-kiosko/database";
import { AdminHeader } from "../_components/AdminHeader";

export const metadata: Metadata = {
  title: "Compras y proveedores APPCC | Panel interno",
  description: "OCR, recepciones, proveedores, inventario y documentación de compra.",
};

export default async function ComprasPage() {
  await requireAdminSession();
  const [metricsResult, receptionsResult, suppliersResult, movementsResult] = await Promise.all([
    getExecutiveDashboardMetrics(),
    getRecentGoodsReceptionRecords(),
    getSupplierProfiles(),
    getInventoryMovements(),
  ]);
  const metrics = metricsResult.ok ? metricsResult.data : null;
  const receptions = receptionsResult.ok ? receptionsResult.data : [];
  const suppliers = suppliersResult.ok ? suppliersResult.data : [];
  const movements = movementsResult.ok ? movementsResult.data.filter((movement) => movement.movement_type === "entrada").slice(0, 8) : [];
  const incompleteSuppliers = suppliers.filter((supplier) => !supplier.cif || !supplier.certificates);

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Compras y proveedores" description="Recepciones, OCR, proveedores autorizados e inventario de entrada." />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12">
        <div className="grid gap-6">
          <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            {[
              ["OCR pendientes", metrics?.ocrToReview || 0],
              ["Recepciones mes", metrics?.receptionsThisMonth || receptions.length],
              ["Recepciones rechazadas", metrics?.rejectedReceptions || 0],
              ["Proveedores", suppliers.length],
              ["Pendientes completar", incompleteSuppliers.length],
              ["Stock bajo", metrics?.lowStockProducts || 0],
            ].map(([label, value]) => (
              <article key={label} className="rounded-[1.3rem] border border-white/10 bg-[#151515] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">{label}</p>
                <p className="mt-2 text-2xl font-black text-white">{value}</p>
              </article>
            ))}
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            {[
              ["Escanear factura/albarán", "/admin-kiosko/ia"],
              ["Recepciones", "/admin-kiosko/recepcion-mercancia"],
              ["Proveedores", "/admin-kiosko/proveedores"],
              ["Inventario", "/admin-kiosko/inventario"],
              ["Documentos OCR", "/admin-kiosko/ia/historial"],
              ["Contabilidad", "/admin-kiosko/contabilidad"],
              ["Trazabilidad", "/admin-kiosko/trazabilidad"],
            ].map(([title, href]) => (
              <Link key={href} href={href} className="rounded-[1.5rem] border border-white/10 bg-[#fffaf4] p-5 text-xl font-black uppercase tracking-[-0.03em] text-stone-950">{title}</Link>
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
              <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Últimas entradas</h2>
              <div className="mt-4 grid gap-3">
                {movements.map((movement) => (
                  <Link key={movement.id} href={`/admin-kiosko/inventario?product=${movement.product_id || ""}`} className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4 text-sm text-stone-200">
                    {movement.admin_inventory_products?.name || "Producto"} · {movement.quantity ?? 0} {movement.unit || "ud"} · lote {movement.batch_number || "no consignado"}
                  </Link>
                ))}
              </div>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
              <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">Proveedores pendientes</h2>
              <div className="mt-4 grid gap-3">
                {incompleteSuppliers.slice(0, 8).map((supplier) => (
                  <Link key={supplier.id} href={`/admin-kiosko/proveedores?q=${encodeURIComponent(supplier.supplier)}`} className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4 text-sm text-stone-200">
                    <span className="block font-black text-white">{supplier.supplier}</span>
                    <span className="mt-1 block">Información administrativa o certificados sanitarios pendientes.</span>
                  </Link>
                ))}
                {!incompleteSuppliers.length ? <p className="text-sm text-stone-400">Proveedores principales completos.</p> : null}
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
