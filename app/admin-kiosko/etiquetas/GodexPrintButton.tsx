"use client";

import { useActionState } from "react";
import { printGodexLabelAction } from "../actions";

type GodexLabelPayload = {
  model: string;
  product: string;
  batch: string;
  supplier: string;
  elaboration_date: string;
  opening_date: string;
  freezing_date: string;
  defrosting_date: string;
  best_before_date: string;
  responsible: string;
  copies: number;
  qr_payload: string;
  inventory_lot_id: string;
  product_id: string;
  accounting_document_id: string;
  supplier_document_id: string;
  uploaded_document_id: string;
  label_type: string;
  expiry_source: string;
  appcc_review_status: string;
  review_warning: string;
};

export function GodexPrintButton({ payload, disabled }: { payload: GodexLabelPayload; disabled?: boolean }) {
  const [state, formAction, isPending] = useActionState(printGodexLabelAction, null);

  return (
    <form action={formAction} className="grid gap-2">
      {Object.entries(payload).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={String(value ?? "")} />
      ))}
      <button
        type="submit"
        disabled={disabled || isPending}
        className="rounded-full border border-emerald-300 bg-emerald-100 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-emerald-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Imprimiendo..." : "Imprimir Godex"}
      </button>
      {state?.message ? (
        <p className={state.ok ? "text-xs font-semibold text-emerald-200" : "text-xs font-semibold text-[#f2c6bb]"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
