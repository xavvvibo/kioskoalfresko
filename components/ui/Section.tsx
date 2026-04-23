import { ReactNode } from "react";

export function Section({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-4xl">
          {eyebrow ? <p className="text-xs font-black uppercase tracking-[0.28em] text-[#d94b2b]">{eyebrow}</p> : null}
          <h2 className="mt-3 max-w-5xl text-4xl font-black uppercase leading-[0.92] tracking-[-0.04em] text-stone-950 md:text-6xl">{title}</h2>
          {description ? <p className="mt-5 max-w-2xl text-base leading-7 text-stone-700 md:text-lg">{description}</p> : null}
        </div>
        <div className="mt-10 md:mt-12">{children}</div>
      </div>
    </section>
  );
}
