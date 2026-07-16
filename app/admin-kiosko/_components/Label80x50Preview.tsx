function cleanPreviewValue(value?: string | null) {
  const text = String(value || "").trim();
  return ["", "-", "0", "0.", "0.0", "undefined", "null"].includes(text.toLowerCase()) ? "" : text;
}

export function Label80x50Preview({
  title,
  kind = "PREPARACION",
  batch,
  productionDate,
  expiryDate,
  quantity,
  responsible,
  storage,
  trace,
  observations,
}: {
  title?: string | null;
  kind?: string;
  batch?: string | null;
  productionDate?: string | null;
  expiryDate?: string | null;
  quantity?: string | null;
  responsible?: string | null;
  storage?: string | null;
  trace?: string | null;
  observations?: string | null;
}) {
  const rows = [
    ["Responsable", cleanPreviewValue(responsible)],
    ["Lote", cleanPreviewValue(batch)],
    ["Produccion", cleanPreviewValue(productionDate)],
    ["Caducidad", cleanPreviewValue(expiryDate)],
    ["Cantidad", cleanPreviewValue(quantity)],
  ].filter(([, value]) => value);
  const batchText = cleanPreviewValue(batch);
  const traceText = cleanPreviewValue(trace)
    || (batchText ? `https://kioskoalfresko.es/admin-kiosko/qr/ERP%3Aprep_batch%3A${encodeURIComponent(batchText)}` : "");
  const noteText = cleanPreviewValue(observations) || cleanPreviewValue(storage);

  return (
    <div className="w-full max-w-[34rem]">
      <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.14em] text-stone-500">
        <span>Preview fisica</span>
        <span>80x50 mm</span>
      </div>
      <div className="rounded-xl border border-white/10 bg-stone-950/35 p-3 shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
        <div className="aspect-[8/5] overflow-hidden rounded-[0.55rem] border border-stone-300 bg-[#fffaf0] p-[3%] text-stone-950 shadow-[0_2px_10px_rgba(0,0,0,0.18)]">
          <div className="grid h-full grid-rows-[auto_auto_1fr_auto] rounded-[0.35rem] border border-dashed border-stone-300/80 p-[3%]">
            <header className="border-b border-stone-950 pb-[2%]">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[12px] font-black uppercase leading-none tracking-[0.08em]">KIOSKO ALFRESKO</p>
                <p className="text-right text-[10px] font-black uppercase leading-none tracking-[0.08em]">{kind}</p>
              </div>
            </header>
            <section className="py-[3%]">
              <p className="line-clamp-2 text-[24px] font-black uppercase leading-[0.9] tracking-normal">
                {cleanPreviewValue(title) || "PRODUCTO"}
              </p>
            </section>
            <section className="grid min-h-0 grid-cols-[1fr_32%] gap-[5%] border-t border-stone-950 pt-[3%]">
              <div className="grid content-start gap-[4px] text-[10px] leading-tight">
                {rows.length ? rows.map(([label, value]) => (
                  <p key={label} className="grid grid-cols-[4.6rem_1fr] gap-1">
                    <span className="font-black uppercase text-stone-700">{label}</span>
                    <span className="truncate font-semibold">{value}</span>
                  </p>
                )) : (
                  <p className="font-black uppercase text-stone-500">Datos pendientes</p>
                )}
              </div>
              {traceText ? (
                <div className="grid content-start gap-1">
                  <div className="grid aspect-square place-items-center border border-stone-950 bg-white p-[7%]">
                    <div className="grid h-full w-full grid-cols-7 grid-rows-7 gap-[1px]">
                      {Array.from({ length: 49 }).map((_, index) => (
                        <span
                          key={index}
                          className={(index * 3 + Math.floor(index / 7)) % 5 < 2 || [0, 1, 7, 8, 40, 41, 47, 48].includes(index) ? "bg-stone-950" : "bg-white"}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="truncate text-center text-[7px] font-black uppercase tracking-normal text-stone-700">QR interno</p>
                </div>
              ) : <div />}
            </section>
            <footer className="mt-[2%] border-t border-stone-300 pt-[1.5%]">
              <p className="truncate text-[9px] font-semibold text-stone-700">
                {noteText ? `Obs. ${noteText}` : "APPCC trazabilidad interna"}
              </p>
            </footer>
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs leading-5 text-stone-500">
        Simulacion de papel termico con margen de impresion y zona segura. El QR real se genera como bitmap EZPL en servidor.
      </p>
    </div>
  );
}
