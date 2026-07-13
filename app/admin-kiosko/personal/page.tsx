import type { Metadata } from "next";
import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import {
  listStaffEmployees,
  listStaffTimeIncidents,
  listStaffWorkEntries,
} from "@/lib/admin-kiosko/repositories/staff.repository";
import { AdminHeader } from "../_components/AdminHeader";
import { AttendanceStatusBoard } from "@/components/staff/StaffCards";

export const metadata: Metadata = {
  title: "Personal | Admin Kiosko Alfresko",
  robots: { index: false, follow: false },
};

export default async function StaffAdminPage() {
  await requireAdminPermission("staff:admin");
  const [employees, entries, incidents] = await Promise.all([
    listStaffEmployees(),
    listStaffWorkEntries(80),
    listStaffTimeIncidents(),
  ]);

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="Personal y turnos" description="Control horario, cuadrantes, fichajes, incidencias y auditoría RRHH." />
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6">
        <div className="grid gap-3 md:grid-cols-4">
          {[
            ["Empleados activos", employees.ok ? employees.data.filter((employee) => employee.status === "active").length : 0],
            ["Fichajes recientes", entries.ok ? entries.data.length : 0],
            ["Incidencias abiertas", incidents.ok ? incidents.data.filter((incident) => incident.status === "open").length : 0],
            ["En revisión", entries.ok ? entries.data.filter((entry) => entry.status === "pending_review").length : 0],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-[#151515] p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">{label}</p>
              <p className="mt-2 text-3xl font-black">{value}</p>
            </div>
          ))}
        </div>
        <AttendanceStatusBoard employees={employees.ok ? employees.data : []} entries={entries.ok ? entries.data : []} />
      </section>
    </main>
  );
}
