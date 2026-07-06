export default function LoadingEtiquetas() {
  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-8 sm:px-6 md:py-12 xl:grid-cols-[minmax(19rem,23rem)_minmax(0,1fr)]">
        <div className="grid content-start gap-4">
          {[0, 1, 2].map((item) => (
            <div key={item} className="rounded-[1.5rem] border border-white/10 bg-[#151515] p-5">
              <div className="h-4 w-28 animate-pulse rounded bg-white/10" />
              <div className="mt-4 h-24 animate-pulse rounded-xl bg-white/8" />
            </div>
          ))}
        </div>
        <div className="rounded-[1.5rem] border border-white/10 bg-[#151515] p-5">
          <div className="h-5 w-40 animate-pulse rounded bg-white/10" />
          <div className="mt-6 aspect-[8/5] max-w-[34rem] animate-pulse rounded-xl bg-white/8" />
        </div>
      </section>
    </main>
  );
}
