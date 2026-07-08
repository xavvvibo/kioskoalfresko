"use client";

import { useFormStatus } from "react-dom";

export function ManualGoodsReceptionSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-[#d94b2b] px-4 py-2.5 text-sm font-black uppercase tracking-[0.08em] text-white transition hover:bg-[#b73b22] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2c6bb] disabled:cursor-not-allowed disabled:bg-stone-600 disabled:text-stone-300"
    >
      {pending ? "Registrando..." : "Registrar recepción"}
    </button>
  );
}
