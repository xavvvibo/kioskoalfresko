"use client";

import { useActionState, useRef, useState } from "react";
import { reprintPrintJobAction, type ReprintPrintJobState } from "../actions";

export function ReprintPrintJobButton({ jobId, disabled }: { jobId: string; disabled?: boolean }) {
  const initialState: ReprintPrintJobState = null;
  const [state, formAction, isPending] = useActionState(reprintPrintJobAction, initialState);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <form
      action={formAction}
      className="grid min-w-[7rem] gap-1"
      onSubmit={() => {
        const nextRequestId = crypto.randomUUID();
        if (inputRef.current) inputRef.current.value = nextRequestId;
        setRequestId(nextRequestId);
      }}
    >
      <input type="hidden" name="job_id" value={jobId} />
      <input ref={inputRef} type="hidden" name="reprint_request_id" value={requestId} readOnly />
      <input
        name="reprint_reason"
        required
        minLength={6}
        maxLength={160}
        placeholder="Motivo reimpresión"
        disabled={disabled || isPending}
        className="min-h-9 rounded-lg border border-stone-300 bg-white px-3 py-2 text-[11px] font-semibold text-stone-950 outline-none focus:border-[#d94b2b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d94b2b] disabled:cursor-not-allowed disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || isPending}
        className="whitespace-nowrap rounded-lg border border-stone-300 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-stone-800 transition duration-150 hover:border-[#d94b2b] hover:text-[#9f2d18] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d94b2b] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Encolando..." : "Reimprimir"}
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
