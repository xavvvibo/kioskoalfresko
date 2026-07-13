import Link from "next/link";
import { listOfferRecipients, listShiftOffers } from "@/lib/admin-kiosko/repositories/staff-coverage.repository";
import { ShiftOfferCard } from "@/components/staff/ShiftOfferCard";
import { staffOfferResponseAction } from "../actions";
import { getCurrentStaffEmployeeForPage } from "../_lib/current-employee";

export default async function StaffOffersPage() {
  const current = await getCurrentStaffEmployeeForPage();
  if (!current.ok) return <Empty text={current.error} />;
  const [offers, recipients] = await Promise.all([listShiftOffers(current.employee.id), listOfferRecipients(current.employee.id)]);
  return (
    <main className="min-h-screen bg-[#0d0d0d] px-4 py-6 text-white">
      <div className="mx-auto grid max-w-5xl gap-5">
        <Link href="/staff" className="text-sm font-bold text-[#f2c6bb]">Volver</Link>
        <h1 className="text-4xl font-black uppercase tracking-[-0.05em]">Ofertas de turno</h1>
        <ShiftOfferCard offers={offers.ok ? offers.data : []} recipients={recipients.ok ? recipients.data : []} action={staffOfferResponseAction} />
      </div>
    </main>
  );
}

function Empty({ text }: { text: string }) {
  return <main className="min-h-screen bg-[#0d0d0d] p-6 text-white">{text}</main>;
}
