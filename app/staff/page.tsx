import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";
import {
  getOpenWorkEntry,
  getStaffEmployeeByAuthUserId,
  listOpenBreaks,
  listPublishedShiftsForEmployee,
  listStaffContracts,
  listWorkEntriesForEmployee,
} from "@/lib/admin-kiosko/repositories/staff.repository";
import { EmployeeClockCard } from "@/components/staff/EmployeeClockCard";
import { TodayShiftCard, UpcomingShiftsList, WeeklyHoursSummary } from "@/components/staff/StaffCards";
import { staffClockAction } from "./actions";

export const metadata: Metadata = {
  title: "Portal de empleado | Kiosko Alfresko",
  robots: { index: false, follow: false },
};

export default async function StaffPage() {
  const session = await requireAdminSession("/staff");
  if (!session.id) {
    return <StaffEmptyState title="Acceso legacy no vinculado" text="Entra con un usuario nominal vinculado a un empleado para usar el portal." />;
  }

  const employee = await getStaffEmployeeByAuthUserId(session.id);
  if (!employee.ok) return <StaffEmptyState title="Módulo no disponible" text={employee.error} />;
  if (!employee.data) return <StaffEmptyState title="Empleado no vinculado" text="RRHH debe vincular tu usuario interno a una ficha de empleado." />;

  const [openEntry, shifts, entries, contracts] = await Promise.all([
    getOpenWorkEntry(employee.data.id),
    listPublishedShiftsForEmployee(employee.data.id),
    listWorkEntriesForEmployee(employee.data.id),
    listStaffContracts(employee.data.id),
  ]);
  const open = openEntry.ok ? openEntry.data : null;
  const openBreaks = open ? await listOpenBreaks(open.id) : null;
  const today = new Date().toISOString().slice(0, 10);
  const publishedShifts = shifts.ok ? shifts.data : [];
  const todayShift = publishedShifts.find((shift) => shift.shift_date === today) || null;
  const employeeEntries = entries.ok ? entries.data : [];
  const activeContract = contracts.ok ? contracts.data.find((contract) => contract.active) : null;

  return (
    <main className="min-h-screen bg-[#0d0d0d] px-4 py-6 text-white sm:px-6">
      <div className="mx-auto grid max-w-5xl gap-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#d94b2b]">Portal empleado</p>
            <h1 className="mt-2 text-4xl font-black uppercase tracking-[-0.05em] text-white">{employee.data.display_name}</h1>
          </div>
          <nav className="flex flex-wrap gap-2 text-xs font-black uppercase tracking-[0.12em]">
            <Link className="rounded-full border border-white/10 bg-white/8 px-4 py-2" href="/staff/turnos">Mis turnos</Link>
            <Link className="rounded-full border border-white/10 bg-white/8 px-4 py-2" href="/staff/fichajes">Mis fichajes</Link>
            <Link className="rounded-full border border-white/10 bg-white/8 px-4 py-2" href="/staff/incidencias">Incidencia</Link>
            <Link className="rounded-full border border-white/10 bg-white/8 px-4 py-2" href="/staff/perfil">Perfil</Link>
            <Link className="rounded-full border border-white/10 bg-white/8 px-4 py-2" href="/staff/documentos">Documentos</Link>
            <Link className="rounded-full border border-white/10 bg-white/8 px-4 py-2" href="/staff/formacion">Formación</Link>
            <Link className="rounded-full border border-white/10 bg-white/8 px-4 py-2" href="/staff/ausencias">Ausencias</Link>
            <Link className="rounded-full border border-white/10 bg-white/8 px-4 py-2" href="/staff/firmas">Firmas</Link>
            <Link className="rounded-full border border-white/10 bg-white/8 px-4 py-2" href="/staff/historial">Historial</Link>
          </nav>
        </header>
        <TodayShiftCard shift={todayShift} />
        <EmployeeClockCard openEntry={open} openBreak={openBreaks?.ok ? openBreaks.data[0] || null : null} action={staffClockAction} />
        <WeeklyHoursSummary shifts={publishedShifts.slice(0, 7)} entries={employeeEntries.slice(0, 7)} contractedMinutes={activeContract?.weekly_minutes} />
        <UpcomingShiftsList shifts={publishedShifts} />
      </div>
    </main>
  );
}

function StaffEmptyState({ title, text }: { title: string; text: string }) {
  return (
    <main className="min-h-screen bg-[#0d0d0d] px-4 py-10 text-white">
      <section className="mx-auto max-w-xl rounded-[1.8rem] border border-white/10 bg-[#151515] p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#d94b2b]">Portal empleado</p>
        <h1 className="mt-3 text-3xl font-black uppercase tracking-[-0.04em]">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-stone-300">{text}</p>
      </section>
    </main>
  );
}
