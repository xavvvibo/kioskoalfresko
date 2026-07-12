import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { createInventoryLotLabelRecord, createLabelRecord, listLabelEligibleInventoryLots } from "@/lib/admin-kiosko/database";
import { createDomainEvent, emitDomainEventSafe } from "@/lib/admin-kiosko/domain";
import { zebraDefaultConfig } from "@/lib/admin-kiosko/zebra";

export async function POST(request: Request) {
  await requireAdminPermission("labels:basic_print");
  const body = await request.json() as Record<string, unknown>;
  const inventoryLotId = String(body.inventory_lot_id || "");

  const result = inventoryLotId
    ? await (async () => {
        const lots = await listLabelEligibleInventoryLots(1000);
        if (!lots.ok) return lots;
        const lot = lots.data.find((item) => item.inventory_lot_id === inventoryLotId);
        if (!lot) return { ok: false as const, error: "Lote no localizado para impresión." };
        return createInventoryLotLabelRecord({
          lot,
          copies: Number(body.copies || zebraDefaultConfig.defaultCopies),
          printer: String(body.printer || zebraDefaultConfig.model),
          printedAt: new Date().toISOString(),
          responsible: String(body.responsible || "F. Javier Bocanegra Sanjuan"),
          template: String(body.template || "inventory_lot"),
          zplVersion: zebraDefaultConfig.zplVersion,
          overridePendingReview: body.override_pending_review === true,
        });
      })()
    : await createLabelRecord({
    model: String(body.model || body.template || "Elaboración"),
    product: String(body.product || ""),
    batch: String(body.batch || ""),
    supplier: String(body.supplier || ""),
    elaboration_date: String(body.elaboration_date || body.production_date || ""),
    freezing_date: String(body.freezing_date || ""),
    defrosting_date: String(body.defrosting_date || ""),
    best_before_date: String(body.best_before_date || body.expiry_date || ""),
    responsible: String(body.responsible || "F. Javier Bocanegra Sanjuan"),
    print_format: "zpl",
    copies: Number(body.copies || zebraDefaultConfig.defaultCopies),
    printed_at: new Date().toISOString(),
    printer: String(body.printer || zebraDefaultConfig.model),
    template: String(body.template || "elaboracion"),
    zpl_version: zebraDefaultConfig.zplVersion,
    inventory_lot_id: String(body.inventory_lot_id || ""),
    product_id: String(body.product_id || ""),
    accounting_document_id: String(body.accounting_document_id || ""),
    supplier_document_id: String(body.supplier_document_id || ""),
    uploaded_document_id: String(body.uploaded_document_id || ""),
    label_type: String(body.label_type || ""),
    expiry_source: String(body.expiry_source || ""),
    appcc_review_status: String(body.appcc_review_status || ""),
    review_warning: String(body.review_warning || ""),
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  await emitDomainEventSafe(createDomainEvent("LabelPrinted", {
    source: "labels",
    payload: {
      template: String(body.template || "elaboracion"),
      copies: Number(body.copies || zebraDefaultConfig.defaultCopies),
      printer: String(body.printer || zebraDefaultConfig.model),
    },
  }));

  return NextResponse.json({ ok: true });
}
