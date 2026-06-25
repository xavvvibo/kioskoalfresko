"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { evaluateTemperature, getTemperatureEquipment, temperatureEquipment } from "@/lib/admin-kiosko/temperature-rules";

function getToday() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCurrentTime() {
  const date = new Date();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function TemperatureForm({ action }: { action: (formData: FormData) => void | Promise<void> }) {
  const [initialDate] = useState(getToday);
  const [initialTime] = useState(getCurrentTime);
  const firstActiveEquipment = temperatureEquipment.find((equipment) => equipment.active)?.name || "";
  const [selectedEquipment, setSelectedEquipment] = useState(firstActiveEquipment);
  const [temperatureInput, setTemperatureInput] = useState("");
  const selectedEquipmentConfig = getTemperatureEquipment(selectedEquipment);
  const parsedTemperature = Number(temperatureInput.replace(",", "."));
  const evaluation = Number.isFinite(parsedTemperature)
    ? evaluateTemperature(selectedEquipment, parsedTemperature)
    : null;
  const groupedEquipment = ["Barra", "Cocina", "Almacén"].map((zone) => ({
    zone,
    items: temperatureEquipment.filter((equipment) => equipment.zone === zone),
  }));

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="status" value={evaluation?.status || "correcto"} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-stone-200">
          Fecha
          <input required defaultValue={initialDate} type="date" name="record_date" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-stone-200">
          Hora
          <input required defaultValue={initialTime} type="time" name="record_time" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-semibold text-stone-200">
        Equipo APPCC
        <select
          required
          name="equipment"
          value={selectedEquipment}
          onChange={(event) => setSelectedEquipment(event.target.value)}
          className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30"
        >
          {groupedEquipment.map((group) => (
            <optgroup key={group.zone} label={group.zone}>
              {group.items.map((equipment) => (
                <option key={equipment.name} value={equipment.name} disabled={!equipment.active}>
                  {equipment.name}{equipment.note ? ` · ${equipment.note}` : ""}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      {selectedEquipmentConfig ? (
        <p className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-semibold leading-6 text-stone-200">
          Rango aceptable: {selectedEquipmentConfig.kind === "freezer" ? "-25 ºC a -18 ºC" : "0 ºC a 5 ºC"}.
        </p>
      ) : null}
      <label className="grid gap-2 text-sm font-semibold text-stone-200">
        Temperatura registrada
        <input
          required
          name="temperature"
          inputMode="decimal"
          value={temperatureInput}
          onChange={(event) => setTemperatureInput(event.target.value)}
          placeholder="Ej. 4.2 °C"
          className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30"
        />
      </label>
      {evaluation ? (
        <p className={`rounded-2xl border px-4 py-3 text-sm font-semibold leading-6 ${
          evaluation.status === "correcto"
            ? "border-emerald-300 bg-emerald-100 text-emerald-950"
            : evaluation.status === "revisar"
              ? "border-amber-300 bg-amber-100 text-amber-950"
              : "border-[#d94b2b]/40 bg-[#d94b2b]/12 text-[#f2c6bb]"
        }`}>
          {evaluation.message} Estado que se guardará: {evaluation.status}.
        </p>
      ) : null}
      <label className="grid gap-2 text-sm font-semibold text-stone-200">
        Observaciones
        <textarea name="observations" rows={4} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-stone-200">
        Responsable
        <input name="responsible" className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30" />
      </label>
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-stone-950 focus:outline-none focus:ring-2 focus:ring-[#d94b2b] focus:ring-offset-2 focus:ring-offset-[#151515] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Guardando..." : "Guardar"}
    </button>
  );
}
