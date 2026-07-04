"use client";

import { useActionState } from "react";
import { printIngredientLabelAction } from "../actions";
import type { IngredientPrintState } from "../actions";

export function IngredientPrintButton({ productId }: { productId: string }) {
  const initialState: IngredientPrintState = null;
  const [state, formAction, isPending] = useActionState(printIngredientLabelAction, initialState);

  return (
    <form action={formAction} className="grid min-w-[9rem] gap-1">
      <input type="hidden" name="product_id" value={productId} />
      <input type="hidden" name="requested_by" value="admin-kiosko" />
      <button
        type="submit"
        disabled={isPending}
        className="whitespace-nowrap rounded-full border border-emerald-700 bg-emerald-100 px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Enviando..." : "Imprimir etiqueta"}
      </button>
      {state?.message ? (
        <div className={state.ok ? "max-w-[15rem] text-[11px] font-semibold leading-4 text-emerald-800" : "max-w-[15rem] text-[11px] font-semibold leading-4 text-[#9f2d18]"}>
          <p>{state.message}</p>
          {state.ok && state.jobId ? (
            <p className="mt-1 font-mono text-[10px] leading-4 text-stone-700">
              job {state.jobId}
              {state.status ? <span className="block font-sans font-black uppercase tracking-[0.1em] text-emerald-900">Estado inicial: {state.status}</span> : null}
            </p>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
