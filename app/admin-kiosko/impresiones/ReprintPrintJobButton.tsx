"use client";

import { useActionState } from "react";
import { reprintPrintJobAction, type ReprintPrintJobState } from "../actions";

export function ReprintPrintJobButton({ jobId, disabled }: { jobId: string; disabled?: boolean }) {
  const initialState: ReprintPrintJobState = null;
  const [state, formAction, isPending] = useActionState(reprintPrintJobAction, initialState);

  return (
    <form action={formAction} className="grid min-w-[8rem] gap-1">
      <input type="hidden" name="job_id" value={jobId} />
      <button
        type="submit"
        disabled={disabled || isPending}
        className="whitespace-nowrap rounded-full border border-stone-950 bg-stone-950 px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-white transition hover:bg-[#d94b2b] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Enviando..." : "Reimprimir"}
      </button>
      {state?.message ? (
        <div className={state.ok ? "max-w-[13rem] text-[11px] font-semibold leading-4 text-emerald-800" : "max-w-[13rem] text-[11px] font-semibold leading-4 text-[#9f2d18]"}>
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
