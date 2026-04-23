import type { MenuItem } from "@/types/site";

export function MenuItemRow({ item, highlighted = false }: { item: MenuItem; highlighted?: boolean }) {
  return (
    <li className={`list-none rounded-[1.35rem] border px-4 py-4 transition duration-200 ${highlighted ? "border-white/20 bg-white/6 hover:bg-white/10" : "border-stone-900/10 bg-black/5 hover:border-stone-950/20 hover:bg-black/7"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-base font-black uppercase leading-tight tracking-[-0.03em] md:text-lg">
              {item.name}
            </h4>
            {item.badge ? (
              <span className="rounded-full border border-[#f0d28f]/40 bg-[#f0d28f]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#f6e0af]">
                {item.badge}
              </span>
            ) : null}
          </div>
          {item.description ? (
            <p className={`mt-2 text-sm leading-6 ${highlighted ? "text-white/78" : "text-stone-700"}`}>
              {item.description}
            </p>
          ) : null}
          {item.note ? (
            <p className={`mt-2 text-xs font-semibold uppercase tracking-[0.14em] ${highlighted ? "text-white/60" : "text-stone-500"}`}>
              {item.note}
            </p>
          ) : null}
        </div>
        <div className={`shrink-0 text-[1.35rem] font-black uppercase tracking-[-0.05em] md:text-[1.7rem] ${highlighted ? "text-[#fff8ef]" : "text-[#d94b2b]"}`}>
          {item.price}
        </div>
      </div>
    </li>
  );
}
