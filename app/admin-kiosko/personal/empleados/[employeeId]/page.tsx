import { notFound } from "next/navigation";
import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { getStaffEmployeeById, listStaffContracts } from "@/lib/admin-kiosko/repositories/staff.repository";
import { EmployeeProfileTabs } from "@/components/staff/StaffCards";
import { AdminHeader } from "../../../_components/AdminHeader";
import { createStaffContractAction } from "../../actions";

export default async function StaffEmployeeDetailPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  await requireAdminPermission("staff:hr");
  const { employeeId } = await params;
  const [employee, contracts] = await Promise.all([getStaffEmployeeById(employeeId), listStaffContracts(employeeId)]);
  if (!employee.ok || !employee.data) notFound();

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title={employee.data.display_name} description="Ficha de empleado, contrato y preparación para futuras ausencias, documentos y nóminas." />
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6">
        <EmployeeProfileTabs employee={employee.data} contracts={contracts.ok ? contracts.data : []} />
        <form action={createStaffContractAction} className="grid gap-3 rounded-[1.6rem] border border-white/10 bg-[#151515] p-5 md:grid-cols-2">
          <input type="hidden" name="employeeId" value={employee.data.id} />
          <h2 className="text-2xl font-black uppercase tracking-[-0.04em] md:col-span-2">Añadir contrato</h2>
          <input name="contractType" required placeholder="Tipo de contrato" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
          <input name="jobTitle" placeholder="Puesto" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
          <input name="startDate" required type="date" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
          <input name="endDate" type="date" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
          <input name="weeklyMinutes" required type="number" min="0" placeholder="Minutos semanales" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
          <input name="collectiveAgreement" placeholder="Convenio" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
          <input name="salaryReference" placeholder="Referencia salarial restringida" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950 md:col-span-2" />
          <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] md:col-span-2">Guardar contrato</button>
        </form>
      </section>
    </main>
  );
}
