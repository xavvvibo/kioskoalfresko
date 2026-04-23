import type { MenuSection } from "@/types/site";
import { MenuItemRow } from "@/components/menu/MenuItemRow";

const sectionStyles = {
  light:
    "border-stone-950/12 bg-[#fff8ef] text-stone-950 shadow-[0_18px_40px_rgba(0,0,0,0.08)]",
  dark:
    "border-white/10 bg-[linear-gradient(180deg,#121212_0%,#1b1b1b_100%)] text-white shadow-[0_24px_60px_rgba(0,0,0,0.16)]",
  red:
    "border-[#d94b2b]/40 bg-[linear-gradient(180deg,#d94b2b_0%,#b9381c_100%)] text-white shadow-[0_24px_60px_rgba(217,75,43,0.22)]",
} as const;

export function MenuSectionBlock({
  section,
  className = "",
}: {
  section: MenuSection;
  className?: string;
}) {
  const accent = section.accent ?? "light";
  const dark = accent !== "light";

  return (
    <section
      aria-labelledby={section.id}
      className={`rounded-[2rem] border p-5 transition duration-200 hover:-translate-y-0.5 md:p-6 ${sectionStyles[accent]} ${className}`}
    >
      {section.eyebrow ? (
        <p className={`text-[11px] font-black uppercase tracking-[0.22em] ${dark ? "text-[#f2c6bb]" : "text-[#d94b2b]"}`}>
          {section.eyebrow}
        </p>
      ) : null}
      <h2
        id={section.id}
        className="mt-2 text-[2rem] font-black uppercase leading-[0.92] tracking-[-0.05em] md:text-[2.4rem]"
      >
        {section.title}
      </h2>
      {section.intro ? (
        <p className={`mt-3 text-sm leading-6 ${dark ? "text-white/78" : "text-stone-700"}`}>
          {section.intro}
        </p>
      ) : null}
      <ul className="mt-5 space-y-3">
        {section.items.map((item) => (
          <MenuItemRow
            key={`${section.id}-${item.name}`}
            item={item}
            highlighted={dark}
          />
        ))}
      </ul>
    </section>
  );
}
