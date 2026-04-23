import { siteConfig } from "@/content/site";
import { ActionButton } from "@/components/ui/ActionButton";

export function ContactPanel() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <article className="rounded-[1.75rem] border border-stone-950 bg-white p-6">
        <h3 className="text-2xl font-black uppercase tracking-[-0.03em] text-stone-950">Llamas.</h3>
        <p className="mt-3 text-sm leading-6 text-stone-700">Si quieres resolverlo rápido antes de salir.</p>
        <div className="mt-5"><ActionButton href={siteConfig.contact.phoneHref}>Llamar</ActionButton></div>
      </article>
      <article className="rounded-[1.75rem] border border-stone-950 bg-[#d94b2b] p-6 text-white">
        <h3 className="text-2xl font-black uppercase tracking-[-0.03em]">Escribes.</h3>
        <p className="mt-3 text-sm leading-6 text-white/85">Si prefieres dejar una duda o preparar reserva cuando el canal real esté activo.</p>
        <div className="mt-5"><ActionButton href="/reservas-contacto" kind="secondary">Reservas y contacto</ActionButton></div>
      </article>
      <article className="rounded-[1.75rem] border border-stone-950 bg-stone-950 p-6 text-white">
        <h3 className="text-2xl font-black uppercase tracking-[-0.03em]">Vienes.</h3>
        <p className="mt-3 text-sm leading-6 text-stone-300">Si el horario encaja, abrís la ruta y asunto resuelto.</p>
        <div className="mt-5"><ActionButton href="/ubicacion-ogijares" kind="secondary">Cómo llegar</ActionButton></div>
      </article>
    </div>
  );
}
