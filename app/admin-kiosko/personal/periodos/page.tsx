import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { listPeriodLocks } from "@/lib/admin-kiosko/repositories/staff-leave.repository";
import { PeriodLockForm, PeriodLockList } from "@/components/staff/LeaveAdmin";
import { AdminHeader } from "../../_components/AdminHeader";
import { createPeriodLockAction } from "../ausencias/actions";

export default async function PeriodLocksPage() {
  await requireAdminPermission("staff:period:lock");
  const locks = await listPeriodLocks();
  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Bloqueo de periodos" description="Bloqueos operativos para fichajes, ausencias, saldos y variables de nómina." />
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6">
        <PeriodLockForm action={createPeriodLockAction} />
        <PeriodLockList locks={locks.ok ? locks.data : []} />
      </section>
    </main>
  );
}
