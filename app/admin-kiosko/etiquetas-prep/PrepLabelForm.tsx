"use client";

import { useActionState, useMemo, useState } from "react";
import { printPrepLabelAction, type PrepPrintState } from "../actions";
import { generatePrepBatchCode } from "@/lib/admin-kiosko/printing/prep-label-utils";
import { Label80x50Preview } from "../_components/Label80x50Preview";

type PrepLabelFormProps = {
  defaultProductionDateTime: string;
  defaultExpiryDateTime: string;
};

const initialState: PrepPrintState = null;

export function PrepLabelForm({ defaultProductionDateTime, defaultExpiryDateTime }: PrepLabelFormProps) {
  const [state, formAction, isPending] = useActionState(printPrepLabelAction, initialState);
  const [prepName, setPrepName] = useState("GUACAMOLE");
  const [batchCode, setBatchCode] = useState("");
  const automaticBatchCode = useMemo(() => generatePrepBatchCode(prepName), [prepName]);
  const visibleBatchCode = batchCode || automaticBatchCode;

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
          value={prepName}
          onChange={(event) => setPrepName(event.target.value)}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-950 outline-none focus:border-stone-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d94b2b]"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-1">
          <label className="text-sm font-semibold text-stone-700" htmlFor="template">
            Plantilla
          </label>
          <select
            id="template"
            name="template"
            defaultValue="prep_label_professional"
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-950 outline-none focus:border-stone-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d94b2b]"
          >
            <option value="prep_label_professional">Profesional compacta</option>
            <option value="prep_label_basic">Basica compatible</option>
          </select>
        </div>

        <div className="grid gap-1">
          <label className="text-sm font-semibold text-stone-700" htmlFor="batchCode">
            Lote interno
          </label>
          <input
            id="batchCode"
            name="batchCode"
            type="text"
            maxLength={36}
            value={visibleBatchCode}
            onChange={(event) => setBatchCode(event.target.value)}
            placeholder="GM-050726-0017"
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-950 outline-none focus:border-stone-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d94b2b]"
          />
          <p className="text-xs text-stone-500">Autogenerado si se deja sin editar: {automaticBatchCode}</p>
        </div>
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
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-950 outline-none focus:border-stone-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d94b2b]"
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
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-950 outline-none focus:border-stone-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d94b2b]"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-1">
          <label className="text-sm font-semibold text-stone-700" htmlFor="responsibleName">
            Responsable
          </label>
          <input
            id="responsibleName"
            name="responsibleName"
            type="text"
            maxLength={36}
            defaultValue="J. Bocanegra"
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-950 outline-none focus:border-stone-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d94b2b]"
          />
        </div>

        <div className="grid gap-1">
          <label className="text-sm font-semibold text-stone-700" htmlFor="storageCondition">
            Conservacion
          </label>
          <input
            id="storageCondition"
            name="storageCondition"
            type="text"
            maxLength={36}
            defaultValue="Refrigerado 0-4 C"
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-950 outline-none focus:border-stone-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d94b2b]"
          />
        </div>
      </div>

      <div className="grid gap-1">
        <label className="text-sm font-semibold text-stone-700" htmlFor="copies">
          Copias
        </label>
        <input
          id="copies"
          name="copies"
          type="number"
          min={1}
          max={8}
          step={1}
          defaultValue={1}
          required
          className="w-32 rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-950 outline-none focus:border-stone-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d94b2b]"
        />
      </div>

      <label className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
        <input type="hidden" name="includeQr" value="true" />
        <span className="mt-1 h-4 w-4 rounded-full border border-emerald-300 bg-emerald-100" />
        <span>
          <span className="block font-semibold">Incluir QR interno</span>
          <span className="mt-1 block text-xs">Activo por defecto. Codifica ERP:prep_batch:{visibleBatchCode || "LOTE"}.</span>
        </span>
      </label>

      <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
        <Label80x50Preview
          title={prepName}
          kind="PREPARACION"
          batch={visibleBatchCode}
          productionDate="fecha/hora elaboracion"
          expiryDate="fecha/hora caducidad"
          responsible="responsable"
          storage="conservacion"
          trace={visibleBatchCode ? `ERP:prep_batch:${visibleBatchCode}` : ""}
          observations="conservacion"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex w-fit items-center justify-center rounded-lg bg-stone-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d94b2b] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Encolando..." : "Enviar a impresora"}
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
          {state.status ? <p className="mt-1 text-xs">Estado inicial del trabajo: {state.status}</p> : null}
        </div>
      ) : null}
    </form>
  );
}
