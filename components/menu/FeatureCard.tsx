export function FeatureCard({
  eyebrow,
  title,
  text,
  accent = "dark",
}: {
  eyebrow?: string;
  title: string;
  text?: string;
  accent?: "dark" | "red" | "cream";
}) {
  const styles =
    accent === "red"
      ? "border-[#d94b2b]/40 bg-[linear-gradient(180deg,#d94b2b_0%,#b9381c_100%)] text-white"
      : accent === "cream"
        ? "border-stone-950 bg-[#fff8ef] text-stone-950"
        : "border-white/10 bg-[linear-gradient(180deg,#0f0f0f_0%,#171717_100%)] text-white";

  return (
    <article className={`rounded-[2rem] border p-6 shadow-[0_20px_50px_rgba(0,0,0,0.16)] transition duration-200 hover:-translate-y-0.5 ${styles}`}>
      {eyebrow ? (
        <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${accent === "cream" ? "text-[#d94b2b]" : "text-[#f2c6bb]"}`}>
          {eyebrow}
        </p>
      ) : null}
      <h3 className="mt-3 text-[2.2rem] font-black uppercase leading-[0.9] tracking-[-0.05em]">
        {title}
      </h3>
      {text ? (
        <p className={`mt-4 text-sm leading-6 ${accent === "cream" ? "text-stone-700" : "text-white/82"}`}>
          {text}
        </p>
      ) : null}
    </article>
  );
}
