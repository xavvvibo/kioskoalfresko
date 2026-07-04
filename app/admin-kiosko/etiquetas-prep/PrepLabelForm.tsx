"use client";

import { useActionState } from "react";
import { printPrepLabelAction, type PrepPrintState } from "../actions";

type PrepLabelFormProps = {
  defaultProductionDateTime: string;
  defaultExpiryDateTime: string;
};

const initialState: PrepPrintState = null;

export function PrepLabelForm({ defaultProductionDateTime, defaultExpiryDateTime }: PrepLabelFormProps) {
  const [state, formAction, isPending] = useActionState(printPrepLabelAction, initialState);

  return (
    <form action={formAction} className="grid gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="grid gap-1">
        <label className="text-sm font-semibold text-stone-700" htmlFor="prepName">
          Nombre preparacion
        </label>
        <input
          id="prepName"
          name="prepName"
          type="text"
          required
          maxLength={36}
          placeholder="GUACAMOLE"
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-950 outline-none focus:border-stone-950"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-1">
          <label className="text-sm font-semibold text-stone-700" htmlFor="productionDateTime">
            Fecha/hora elaboracion
          </label>
          <input
            id="productionDateTime"
            name="productionDateTime"
            type="datetime-local"
            required
            defaultValue={defaultProductionDateTime}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-950 outline-none focus:border-stone-950"
          />
        </div>

        <div className="grid gap-1">
          <label className="text-sm font-semibold text-stone-700" htmlFor="expiryDateTime">
            Fecha/hora caducidad
          </label>
          <input
            id="expiryDateTime"
            name="expiryDateTime"
            type="datetime-local"
            required
            defaultValue={defaultExpiryDateTime}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-950 outline-none focus:border-stone-950"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex w-fit items-center justify-center rounded-lg bg-stone-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Enviando..." : "Imprimir etiqueta"}
      </button>

      {state ? (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${
            state.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          <p className="font-semibold">{state.message}</p>
          {state.jobId ? <p className="mt-1 font-mono text-xs">Job: {state.jobId}</p> : null}
          {state.status ? <p className="mt-1 text-xs">Estado inicial: {state.status}</p> : null}
        </div>
      ) : null}
    </form>
  );
}
