"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="w-full rounded-full border border-white/20 px-5 py-3 text-center text-sm font-black uppercase tracking-[0.14em] text-white print:hidden sm:w-auto"
    >
      Imprimir / PDF A4
    </button>
  );
}
