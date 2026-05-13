export default function AvisoLegalPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 md:py-24">
      <h1 className="text-4xl font-semibold tracking-tight text-stone-950">Aviso legal</h1>
      <div className="mt-6 space-y-5 text-base leading-7 text-stone-600">
        <p>
          Este sitio web, <span className="font-semibold text-stone-950">kioskoalfresko.es</span>,
          ofrece información comercial, carta, horarios, reservas y canales de contacto de Kiosko Alfresko.
        </p>
        <p>
          Los datos completos del titular del sitio se incorporarán en esta página cuando queden cerrados de forma definitiva.
          Mientras tanto, para cualquier consulta relacionada con el contenido, funcionamiento del sitio o ejercicio de derechos,
          puedes escribir a <a href="mailto:info@kioskoalfresko.es" className="font-semibold text-stone-950">info@kioskoalfresko.es</a>.
        </p>
        <p>
          El uso de esta web implica la aceptación de las presentes condiciones de acceso y uso en la medida en que resulten aplicables.
        </p>
      </div>
    </main>
  );
}
