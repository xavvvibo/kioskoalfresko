export function FormFeedback({ saved, error }: { saved?: boolean; error?: string }) {
  if (saved) {
    return (
      <p className="rounded-2xl border border-emerald-300 bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-950">
        Registro guardado correctamente.
      </p>
    );
  }

  if (error) {
    return (
      <p className="rounded-2xl border border-[#d94b2b]/40 bg-[#d94b2b]/12 px-4 py-3 text-sm font-semibold text-[#f2c6bb]">
        No se ha podido guardar el registro: {error}
      </p>
    );
  }

  return null;
}
