import type { ShiftOffer, ShiftOfferRecipient } from "@/lib/admin-kiosko/repositories/staff-coverage.repository";

export function ShiftOfferCard({
  offers,
  recipients,
  action,
}: {
  offers: ShiftOffer[];
  recipients: ShiftOfferRecipient[];
  action?: (formData: FormData) => Promise<void>;
}) {
  const recipientByOffer = new Map(recipients.map((recipient) => [recipient.offer_id, recipient]));
  return (
    <section className="grid gap-3">
      {offers.length ? offers.map((offer) => {
        const recipient = recipientByOffer.get(offer.id);
        return (
          <article key={offer.id} className="rounded-2xl border border-white/10 bg-[#151515] p-4">
            <p className="font-black text-white">{offer.title} · {offer.status}</p>
            <p className="mt-1 text-sm text-stone-300">{new Date(offer.starts_at).toLocaleString("es-ES")} - {new Date(offer.ends_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#f2c6bb]">Respuesta: {recipient?.response || "pendiente"}</p>
            {action && recipient?.response === "pending" ? (
              <form action={action} className="mt-3 flex flex-wrap gap-2">
                <input type="hidden" name="offerId" value={offer.id} />
                <input name="comment" placeholder="Comentario opcional" className="min-w-52 rounded-2xl border border-white/10 bg-white px-4 py-2 text-sm text-stone-950" />
                <button name="response" value="accepted" className="rounded-full bg-emerald-400 px-4 py-2 text-xs font-black uppercase text-stone-950">Aceptar</button>
                <button name="response" value="interested" className="rounded-full bg-amber-300 px-4 py-2 text-xs font-black uppercase text-stone-950">Me interesa</button>
                <button name="response" value="declined" className="rounded-full bg-[#d94b2b] px-4 py-2 text-xs font-black uppercase text-white">Rechazar</button>
              </form>
            ) : null}
          </article>
        );
      }) : <p className="rounded-2xl border border-white/10 bg-[#151515] p-5 text-stone-300">No hay ofertas abiertas.</p>}
    </section>
  );
}
