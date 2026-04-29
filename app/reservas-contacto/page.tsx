import { buildMetadata } from "@/lib/metadata";
import { siteConfig } from "@/content/site";
import { getReservationEntryPoint } from "@/lib/integrations/qamarero";
import { ActionButton } from "@/components/ui/ActionButton";

export const metadata = buildMetadata({
  title: "Reservas y contacto | Kiosko Alfresko (Ogíjares, Granada)",
  description:
    "Contacta con Kiosko Alfresko para reservar mesa, consultar horarios o llegar al Parque San Sebastián de Ogíjares. Teléfono, WhatsApp y correo disponibles.",
  path: "/reservas-contacto",
});

export default function ReservasContactoPage() {
  const reservation = getReservationEntryPoint();
  return (
    <main className="bg-[#fffaf4]">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 md:py-24">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Reservas y contacto</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-950 md:text-5xl">
          Reservas y contacto en Kiosko Alfresko
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-stone-600">
          Llámanos, escríbenos por WhatsApp o ven directamente al Parque San Sebastián de Ogíjares.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-stone-950">Canales directos</h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-stone-600">
              <p>
                Teléfono: <a href={siteConfig.contact.phoneHref} className="font-semibold text-stone-950">{siteConfig.contact.phoneDisplay}</a>
              </p>
              <p>
                Email: <a href={siteConfig.contact.emailHref} className="font-semibold text-stone-950">{siteConfig.contact.email}</a>
              </p>
              <p>
                WhatsApp: <a href={siteConfig.contact.whatsappUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-stone-950">{siteConfig.contact.whatsappDisplay}</a>
              </p>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-stone-950/10 bg-[#f8f1e7] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-stone-950">Parque San Sebastián · Ogíjares</span>
              <span className="rounded-full border border-stone-950/10 bg-[#f8f1e7] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-stone-950">Smash 180G + patatas</span>
              <span className="rounded-full border border-stone-950/10 bg-[#f8f1e7] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-stone-950">Cada bebida con tapa</span>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <ActionButton href={siteConfig.contact.phoneHref}>Llamar</ActionButton>
              <ActionButton href={siteConfig.contact.whatsappUrl} kind="secondary" newTab>WhatsApp</ActionButton>
              <ActionButton href={siteConfig.location.mapsUrl} kind="ghost" newTab>📍 Llegar ahora</ActionButton>
              <ActionButton href="/carta" kind="secondary">Ver carta</ActionButton>
            </div>
          </article>
          <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-stone-950">Ven directo al parque</h2>
            <p className="mt-4 text-sm leading-6 text-stone-600">
              Estamos en {siteConfig.location.area}, {siteConfig.location.city}, {siteConfig.location.province}. Si os encaja el plan, abrid ruta y venid directamente.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ActionButton href={siteConfig.location.mapsUrl} newTab>📍 Llegar ahora</ActionButton>
              <ActionButton href="/horarios" kind="secondary">Ver horarios</ActionButton>
            </div>
          </article>
        </div>
        {reservation.url ? (
          <article className="mt-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-stone-950">Carta digital y reservas online</h2>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-stone-600">
              Si prefieres verlo todo desde el móvil, puedes abrir nuestra carta digital o entrar al flujo online de reserva.
            </p>
            <div className="mt-6">
              <ActionButton href={reservation.url} newTab>Abrir reservas</ActionButton>
            </div>
          </article>
        ) : null}
      </div>
    </main>
  );
}
