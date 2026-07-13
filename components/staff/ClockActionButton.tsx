import type { ReactNode } from "react";

export function ClockActionButton({
  children,
  name,
  value,
  variant = "primary",
  disabled = false,
}: {
  children: ReactNode;
  name?: string;
  value?: string;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
}) {
  const className = variant === "danger"
    ? "border-[#d94b2b] bg-[#d94b2b] text-white"
    : variant === "secondary"
      ? "border-white/15 bg-white/8 text-white"
      : "border-emerald-400 bg-emerald-500 text-stone-950";

  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={disabled}
      className={`min-h-16 rounded-2xl border px-5 py-4 text-base font-black uppercase tracking-[0.08em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2c6bb] disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
    >
      {children}
    </button>
  );
}
