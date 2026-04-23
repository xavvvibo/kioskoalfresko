import { buildMetadata } from "@/lib/metadata";
import { siteConfig } from "@/content/site";
import { getReservationEntryPoint } from "@/lib/integrations/qamarero";
import { ActionButton } from "@/components/ui/ActionButton";

export const metadata = buildMetadata({
  title: "Reservas y contacto | Kiosko Alfresko",
  description: "Canales de contacto y reserva preparados para Kiosko Alfresko.",
  path: "/reservas-contacto",
});

export default function ReservasContactoPage() {
  const reservation = getReservationEntryPoint();
  return (
    <main className="bg-[#fffaf4]">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 md:py-24">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Reservas y contacto</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-950 md:text-5xl">Contactar o preparar una reserva</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-stone-600">Página preparada para activar reservas reales con Qamarero en cuanto tengamos las credenciales o el flujo definitivo.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-stone-950">Canales directos</h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-stone-600">
              <p>Teléfono: {siteConfig.contact.phoneDisplay}</p>
              <p>Email: {siteConfig.contact.email}</p>
              <p>WhatsApp: [PENDIENTE_WHATSAPP]</p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <ActionButton href={siteConfig.contact.phoneHref}>Llamar</ActionButton>
              <ActionButton href="/ubicacion-ogijares" kind="secondary">Cómo llegar</ActionButton>
            </div>
          </article>
          <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-stone-950">Integración Qamarero</h2>
            <p className="mt-4 text-sm leading-6 text-stone-600">Modo actual: <strong>{reservation.type}</strong></p>
            <p className="mt-3 text-sm leading-6 text-stone-500">Si recibimos URL pública, iframe o API real, esta página ya tiene la capa desacoplada lista para activarla.</p>
            {reservation.url ? (
              <div className="mt-6"><ActionButton href={reservation.url}>Abrir reservas</ActionButton></div>
            ) : (
              <div className="mt-6 rounded-2xl bg-stone-50 p-4 text-sm text-stone-600">
                Faltan `NEXT_PUBLIC_QAMARERO_MODE` y la URL/configuración real para publicar el flujo.
              </div>
            )}
          </article>
        </div>
      </div>
    </main>
  );
}
