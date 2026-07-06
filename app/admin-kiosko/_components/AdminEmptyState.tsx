import Link from "next/link";

export function AdminEmptyState({
  title,
  description,
  href,
  cta,
}: {
  title: string;
  description: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="rounded-[1.2rem] border border-dashed border-white/20 bg-white/5 p-4 text-sm text-stone-300">
      <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-black/20 text-sm font-black text-[#f2c6bb]">
        KA
      </div>
      <p className="font-black text-white">{title}</p>
      <p className="mt-1 leading-6">{description}</p>
      {href && cta ? (
        <Link
          href={href}
          className="mt-3 inline-flex w-fit items-center justify-center rounded-full border border-[#d94b2b] bg-[#d94b2b] px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white transition hover:bg-stone-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2c6bb]"
        >
          {cta}
        </Link>
      ) : null}
    </div>
  );
}
