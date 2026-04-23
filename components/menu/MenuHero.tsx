type MenuHeroProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  supportingText?: string;
};

export function MenuHero({
  eyebrow,
  title,
  subtitle,
  supportingText,
}: MenuHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(217,75,43,0.28),transparent_18%),linear-gradient(180deg,#050505_0%,#171717_100%)] p-6 text-white shadow-[0_28px_90px_rgba(0,0,0,0.32)] md:p-10">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.03)_30%,transparent_70%)]" />
      <div className="absolute inset-0 opacity-35 mix-blend-screen [background-image:radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.05),transparent_20%),radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.04),transparent_18%),linear-gradient(transparent_0%,rgba(255,255,255,0.02)_50%,transparent_100%)]" />
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] [background-size:18px_18px]" />
      <div className="relative z-10 max-w-4xl">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#f2c6bb]">
          {eyebrow}
        </p>
        <h1 className="mt-4 text-[3rem] font-black uppercase leading-[0.88] tracking-[-0.06em] text-[#fff8ef] md:text-[5.6rem]">
          {title}
        </h1>
        <p className="mt-4 text-lg font-bold uppercase tracking-[-0.03em] text-[#d94b2b] md:text-2xl">
          {subtitle}
        </p>
        {supportingText ? (
          <p className="mt-5 max-w-2xl text-sm leading-7 text-stone-300 md:text-base">
            {supportingText}
          </p>
        ) : null}
      </div>
    </section>
  );
}
