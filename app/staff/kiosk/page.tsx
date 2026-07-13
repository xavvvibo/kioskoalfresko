import type { Metadata } from "next";
import { getStaffEmployeeById, listStaffEmployees } from "@/lib/admin-kiosko/repositories/staff.repository";
import { SharedKioskClockPanel, SharedKioskLogin } from "@/components/staff/SharedKiosk";
import { getKioskState, sharedKioskClockAction, sharedKioskLoginAction } from "../actions";

export const metadata: Metadata = {
  title: "Kiosko de fichaje | Kiosko Alfresko",
  robots: { index: false, follow: false },
};

export default async function StaffKioskPage({
  searchParams,
}: {
  searchParams?: Promise<{ employee?: string; error?: string; ok?: string }>;
}) {
  const params = await searchParams;
  const employees = await listStaffEmployees();
  const selectedEmployeeId = params?.employee;
  const selected = selectedEmployeeId ? await getStaffEmployeeById(selectedEmployeeId) : null;

  if (selected?.ok && selected.data) {
    const state = await getKioskState(selected.data.id);
    return (
      <main className="min-h-screen bg-[#0d0d0d] px-4 py-8 text-white">
        <SharedKioskClockPanel employee={selected.data} openEntry={state.openEntry} openBreak={state.openBreak} action={sharedKioskClockAction} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0d0d0d] px-4 py-8 text-white">
      {params?.error ? <p className="mx-auto mb-4 max-w-xl rounded-2xl border border-[#d94b2b]/40 bg-[#d94b2b]/12 p-4 text-sm font-bold text-[#f2c6bb]">PIN incorrecto o empleado no activo.</p> : null}
      {params?.ok ? <p className="mx-auto mb-4 max-w-xl rounded-2xl border border-emerald-400/40 bg-emerald-500/12 p-4 text-sm font-bold text-emerald-100">Operación registrada.</p> : null}
      <SharedKioskLogin employees={employees.ok ? employees.data.filter((employee) => employee.status === "active") : []} action={sharedKioskLoginAction} />
    </main>
  );
}
