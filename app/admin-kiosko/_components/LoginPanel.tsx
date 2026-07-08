import { loginAdminKioskoAction } from "../actions";

export function LoginPanel({ hasError, returnTo }: { hasError: boolean; returnTo?: string }) {
  return (
    <main className="flex min-h-screen items-center bg-[#0d0d0d] px-4 py-10 text-white">
      <section className="mx-auto w-full max-w-md rounded-[2rem] border border-white/10 bg-[#151515] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.22)] sm:p-8">
        <div className="inline-flex rounded-full border border-[#d94b2b]/40 bg-[#d94b2b]/12 px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-[#f2c6bb]">
          Zona interna · Acceso solo personal autorizado
        </div>
        <h1 className="mt-6 text-3xl font-black uppercase leading-none tracking-[-0.04em] text-[#fff8ef]">
          Acceso interno Kiosko Alfresko
        </h1>
        <p className="mt-4 text-sm leading-6 text-stone-300">
          Zona privada para personal autorizado.
        </p>
        <form action={loginAdminKioskoAction} className="mt-6 grid gap-4">
          {returnTo ? <input type="hidden" name="next" value={returnTo} /> : null}
          <label className="grid gap-2 text-sm font-semibold text-stone-200">
            Contraseña
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-base text-stone-950 outline-none focus:border-[#d94b2b] focus:ring-2 focus:ring-[#d94b2b]/30"
            />
          </label>
          {hasError ? (
            <p className="rounded-2xl border border-[#d94b2b]/40 bg-[#d94b2b]/12 px-4 py-3 text-sm font-semibold text-[#f2c6bb]">
              Contraseña incorrecta.
            </p>
          ) : null}
          <button
            type="submit"
            className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-stone-950 focus:outline-none focus:ring-2 focus:ring-[#d94b2b] focus:ring-offset-2 focus:ring-offset-[#151515]"
          >
            Entrar al panel
          </button>
        </form>
      </section>
    </main>
  );
}
