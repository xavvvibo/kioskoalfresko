export default function PrivacidadPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 md:py-24">
      <h1 className="text-4xl font-semibold tracking-tight text-stone-950">Política de privacidad</h1>
      <div className="mt-6 space-y-5 text-base leading-7 text-stone-600">
        <p>
          En esta web se pueden recoger datos personales a través de los canales de contacto disponibles,
          como email, teléfono, WhatsApp y el sistema de reservas de Qamarero cuando el usuario decide utilizarlos.
        </p>
        <p>
          La finalidad principal de estos datos es gestionar consultas, responder mensajes, tramitar reservas y atender solicitudes relacionadas con Kiosko Alfresko.
        </p>
        <p>
          La información adicional sobre responsables, base jurídica, plazos de conservación y ejercicio de derechos se completará aquí cuando la política definitiva quede cerrada.
          Mientras tanto, para cualquier cuestión sobre privacidad puedes contactar en
          {" "}
          <a href="mailto:info@kioskoalfresko.es" className="font-semibold text-stone-950">info@kioskoalfresko.es</a>.
        </p>
      </div>
    </main>
  );
}
