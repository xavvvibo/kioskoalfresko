"use client";

import { useActionState, useRef, useState } from "react";
import { printMakroReception202607LabelsAction } from "../../actions";

export function MakroPrintButton({
  labelKeys,
  label,
  operativeDate,
  operativeTime,
  responsible,
  variant = "primary",
}: {
  labelKeys: string[];
  label: string;
  operativeDate: string;
  operativeTime: string;
  responsible: string;
  variant?: "primary" | "secondary";
}) {
  const [state, formAction, pending] = useActionState(printMakroReception202607LabelsAction, null);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <form
      action={formAction}
      className="grid gap-2"
      onSubmit={(event) => {
        if (!window.confirm(`${label}: se encolaran ${labelKeys.length} trabajo(s) GoDEX. ¿Continuar?`)) {
          event.preventDefault();
          return;
        }
        const next = crypto.randomUUID();
        if (inputRef.current) inputRef.current.value = next;
        setRequestId(next);
      }}
    >
      <input ref={inputRef} type="hidden" name="request_id" value={requestId} readOnly />
      <input type="hidden" name="operative_date" value={operativeDate} />
      <input type="hidden" name="operative_time" value={operativeTime} />
      <input type="hidden" name="responsible" value={responsible} />
      {labelKeys.map((key) => <input key={key} type="hidden" name="label_key" value={key} />)}
      <button
        type="submit"
        disabled={pending || labelKeys.length === 0}
        className={variant === "primary"
          ? "w-full rounded-xl border border-[#d94b2b] bg-[#d94b2b] px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-[#b83d22] disabled:cursor-not-allowed disabled:opacity-50"
          : "w-full rounded-xl border border-white/20 bg-white/6 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"}
      >
        {pending ? "Encolando..." : label}
      </button>
      {state?.message ? (
        <p className={state.ok ? "text-xs font-semibold text-emerald-200" : "text-xs font-semibold text-[#f2c6bb]"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
