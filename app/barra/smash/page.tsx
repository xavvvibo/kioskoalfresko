import { smashPromo } from "@/content/menu";
import { buildMetadata } from "@/lib/metadata";
import { SmashBarScreen } from "@/components/menu/SmashBarScreen";

export const metadata = buildMetadata({
  title: "Smash Burgers 180G | Pantalla de barra | Kiosko Alfresko",
  description:
    "Pantalla promocional de Kiosko Alfresko para pedir Smash Burgers 180G con doble carne smash y patatas incluidas.",
  path: "/barra/smash",
});

export default function SmashBarPage() {
  return (
    <main className="bg-black px-3 py-4 text-white sm:px-5 sm:py-6">
      <div className="mx-auto max-w-[72rem]">
        <SmashBarScreen
          promo={smashPromo}
          variant="vertical"
          theme="dark"
          showSecondaryAction
        />
      </div>
    </main>
  );
}
