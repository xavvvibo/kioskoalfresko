export default function LoadingImpresiones() {
  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12">
        <div className="rounded-[2rem] border border-white/10 bg-[#151515] p-5 sm:p-6">
          <div className="h-5 w-44 animate-pulse rounded bg-white/10" />
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-24 animate-pulse rounded-[1.2rem] bg-white/8" />
            ))}
          </div>
          <div className="mt-6 h-14 animate-pulse rounded-[1.2rem] bg-white/8" />
          <div className="mt-6 grid gap-3">
            {[0, 1, 2, 3, 4].map((item) => (
              <div key={item} className="h-16 animate-pulse rounded-[1.2rem] bg-white/8" />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
