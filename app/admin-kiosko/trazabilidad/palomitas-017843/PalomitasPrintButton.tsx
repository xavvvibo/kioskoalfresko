"use client";

import { useActionState, useRef, useState } from "react";
import { printPalomitasTraceabilityLabelAction } from "../../actions";

export function PalomitasPrintButton({
  parentLotId,
  variant,
  responsible,
  disabled,
}: {
  parentLotId: string;
  variant: "defrosting" | "frozen";
  responsible: string;
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState(printPalomitasTraceabilityLabelAction, null);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <form
      action={formAction}
      className="grid gap-2"
      onSubmit={() => {
        const next = crypto.randomUUID();
        if (inputRef.current) inputRef.current.value = next;
        setRequestId(next);
      }}
    >
      <input ref={inputRef} type="hidden" name="request_id" value={requestId} readOnly />
      <input type="hidden" name="parent_lot_id" value={parentLotId} />
      <input type="hidden" name="variant" value={variant} />
      <input type="hidden" name="responsible" value={responsible} />
      <button
        type="submit"
        disabled={disabled || pending}
        className="w-full rounded-xl border border-[#d94b2b] bg-[#d94b2b] px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-[#b83d22] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Encolando..." : variant === "defrosting" ? "Imprimir etiqueta A" : "Imprimir etiqueta B"}
      </button>
      {state?.message ? (
        <p className={state.ok ? "text-xs font-semibold text-emerald-200" : "text-xs font-semibold text-[#f2c6bb]"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
