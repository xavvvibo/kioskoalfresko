"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/8 px-4 py-3 text-center text-xs font-black uppercase tracking-[0.12em] text-white transition duration-150 hover:border-[#d94b2b] hover:bg-white/12 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2c6bb] print:hidden sm:w-auto"
    >
      <span className="grid h-5 min-w-8 place-items-center rounded-md border border-white/20 bg-black/20 text-[9px] text-white">PDF</span>
      PDF
    </button>
  );
}
