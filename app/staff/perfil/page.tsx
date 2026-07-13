import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import { getStaffEmployeeByAuthUserId, listStaffContracts } from "@/lib/admin-kiosko/repositories/staff.repository";
import { getStaffPrivateProfile } from "@/lib/admin-kiosko/repositories/staff-records.repository";
import { maskDni, maskIban, maskSocialSecurity } from "@/lib/admin-kiosko/staff/sensitive";

export default async function StaffProfilePage() {
  const session = await requireAdminSession("/staff/perfil");
  if (!session.id) return <Empty text="Accede con un usuario nominal vinculado a empleado." />;
  const employee = await getStaffEmployeeByAuthUserId(session.id);
  if (!employee.ok || !employee.data) return <Empty text={employee.ok ? "No hay empleado vinculado." : employee.error} />;
  const [profile, contracts] = await Promise.all([getStaffPrivateProfile(employee.data.id), listStaffContracts(employee.data.id)]);
  const activeContract = contracts.ok ? contracts.data.find((contract) => contract.active) : null;
  const data = profile.ok ? profile.data : null;

  return (
    <main className="min-h-screen bg-[#0d0d0d] px-4 py-6 text-white">
      <div className="mx-auto grid max-w-4xl gap-5">
        <Link href="/staff" className="text-sm font-bold text-[#f2c6bb]">Volver</Link>
        <h1 className="text-4xl font-black uppercase tracking-[-0.05em]">Mi perfil</h1>
        <section className="grid gap-3 md:grid-cols-2">
          <Card label="Nombre" value={employee.data.display_name} />
          <Card label="Código" value={employee.data.employee_code} />
          <Card label="Email" value={employee.data.email} />
          <Card label="Teléfono" value={employee.data.phone} />
          <Card label="DNI/NIE" value={maskDni(data?.dni_nie)} />
          <Card label="NSS" value={maskSocialSecurity(data?.social_security_number)} />
          <Card label="IBAN" value={maskIban(data?.iban)} />
          <Card label="Puesto" value={activeContract?.job_title || data?.professional_category} />
        </section>
      </div>
    </main>
  );
}

function Card({ label, value }: { label: string; value?: string | null }) {
  return <div className="rounded-2xl border border-white/10 bg-[#151515] p-4"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">{label}</p><p className="mt-2 text-sm font-bold text-white">{value || "Sin dato"}</p></div>;
}

function Empty({ text }: { text: string }) {
  return <main className="min-h-screen bg-[#0d0d0d] p-6 text-white">{text}</main>;
}
