import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { createLabelRecord } from "@/lib/admin-kiosko/database";
import { createDomainEvent, emitDomainEventSafe } from "@/lib/admin-kiosko/domain";
import { zebraDefaultConfig } from "@/lib/admin-kiosko/zebra";

export async function POST(request: Request) {
  await requireAdminSession();
  const body = await request.json() as Record<string, unknown>;

  const result = await createLabelRecord({
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
