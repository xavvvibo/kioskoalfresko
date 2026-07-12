import { smashPromo } from "@/content/menu";
import { buildMetadata } from "@/lib/metadata";
import { SmashBarScreen } from "@/components/menu/SmashBarScreen";

export const metadata = buildMetadata({
  title: "SMASH LAB by Alfresko | Pantalla de barra | Kiosko Alfresko",
  description:
    "Pantalla promocional de Kiosko Alfresko para SMASH LAB by Alfresko: FERXA TRUFADA, BOURBON BACON y POLLO KICK.",
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
