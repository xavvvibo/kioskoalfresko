"use client";

import { useActionState, useRef, useState } from "react";
import { printFreezerInventory20260708LabelsAction } from "../../actions";

export function FreezerInventoryPrintButton({
  scope,
  count,
  disabled,
  disabledReason,
}: {
  scope: "apt" | "review_or_quarantine";
  count: number;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [state, formAction, pending] = useActionState(printFreezerInventory20260708LabelsAction, null);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const inputRef = useRef<HTMLInputElement>(null);
  const label = scope === "apt" ? "Imprimir todas las etiquetas aptas" : "Imprimir etiquetas de revisión/cuarentena";

  return (
    <form
      action={formAction}
      className="grid gap-2"
      onSubmit={(event) => {
        if (disabled) {
          event.preventDefault();
          return;
        }
        if (!window.confirm(`${label}: se encolarán ${count} trabajos GoDEX. ¿Continuar?`)) {
          event.preventDefault();
          return;
        }
        const next = crypto.randomUUID();
        if (inputRef.current) inputRef.current.value = next;
        setRequestId(next);
      }}
    >
      <input ref={inputRef} type="hidden" name="request_id" value={requestId} readOnly />
      <input type="hidden" name="scope" value={scope} />
      <button
        type="submit"
        disabled={disabled || pending || count <= 0}
        className={scope === "apt"
          ? "w-full rounded-xl border border-[#d94b2b] bg-[#d94b2b] px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-[#b83d22] disabled:cursor-not-allowed disabled:opacity-50"
          : "w-full rounded-xl border border-amber-200/40 bg-amber-100/10 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-amber-100 transition hover:bg-amber-100/15 disabled:cursor-not-allowed disabled:opacity-50"}
      >
        {pending ? "Encolando..." : `${label} (${count})`}
      </button>
      {state?.message ? (
        <p className={state.ok ? "text-xs font-semibold text-emerald-200" : "text-xs font-semibold text-[#f2c6bb]"}>
          {state.message}
        </p>
      ) : null}
      {disabled && disabledReason ? (
        <p className="text-xs font-semibold text-amber-100">{disabledReason}</p>
      ) : null}
    </form>
  );
}
