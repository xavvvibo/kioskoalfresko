import { springHighlights } from "@/content/site";

export function SpringHighlights() {
  return (
    <div className="grid gap-4 md:grid-cols-[1.1fr_1fr_1fr]">
      {springHighlights.map((item, index) => (
        <article
          key={`${item.date}-${item.title}`}
          className={`rounded-[1.7rem] border border-stone-950 p-5 ${
            index === 0
              ? "bg-stone-950 text-white"
              : index === 2
                ? "bg-[#d94b2b] text-white"
                : "bg-white text-stone-950"
          }`}
        >
          <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${index === 0 || index === 2 ? "text-white/75" : "text-[#d94b2b]"}`}>
            {item.date}
          </p>
          <h3 className="mt-3 text-xl font-black uppercase leading-[0.95] tracking-[-0.04em]">
            {item.title}
          </h3>
          <p className={`mt-4 text-sm leading-6 ${index === 0 || index === 2 ? "text-white/85" : "text-stone-700"}`}>
            {item.detail}
          </p>
        </article>
      ))}
    </div>
  );
}
