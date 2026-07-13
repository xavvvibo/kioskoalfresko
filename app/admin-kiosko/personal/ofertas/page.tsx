import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { listOfferRecipients, listShiftOffers } from "@/lib/admin-kiosko/repositories/staff-coverage.repository";
import { ShiftOfferCard } from "@/components/staff/ShiftOfferCard";
import { AdminHeader } from "../../_components/AdminHeader";

export default async function ShiftOffersAdminPage() {
  await requireAdminPermission("staff:shift-offer:read");
  const [offers, recipients] = await Promise.all([listShiftOffers(), listOfferRecipients()]);
  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Ofertas de turno" description="Ofertas internas, respuestas y adjudicación manual." />
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <ShiftOfferCard offers={offers.ok ? offers.data : []} recipients={recipients.ok ? recipients.data : []} />
      </section>
    </main>
  );
}
