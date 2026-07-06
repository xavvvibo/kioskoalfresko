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
    <form action={formAction} className="grid min-w-0 gap-2">
      {Object.entries(payload).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={String(value ?? "")} />
      ))}
      <button
        type="submit"
        disabled={disabled || isPending}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#d94b2b] bg-[#d94b2b] px-4 py-3 text-center text-xs font-black uppercase tracking-[0.12em] text-white transition duration-150 hover:bg-[#b83d22] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2c6bb] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        <span className="grid h-5 w-5 place-items-center rounded-md bg-white text-[10px] text-[#d94b2b]">G</span>
        {isPending ? "Imprimiendo..." : "Godex"}
      </button>
      {state?.message ? (
        <p className={state.ok ? "text-xs font-semibold text-emerald-200" : "text-xs font-semibold text-[#f2c6bb]"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
