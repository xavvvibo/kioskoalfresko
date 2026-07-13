import { notFound } from "next/navigation";
import { hasAdminPermission, requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { listAdminUsers } from "@/lib/admin-kiosko/repositories/admin-users.repository";
import {
  getOpenWorkEntry,
  getStaffEmployeeById,
  listPublishedShiftsForEmployee,
  listStaffContracts,
  listStaffLocations,
  listStaffTimeIncidents,
} from "@/lib/admin-kiosko/repositories/staff.repository";
import {
  getStaffPrivateProfile,
  listDisciplinaryCases,
  listStaffAbsences,
  listStaffDocuments,
  listStaffSignatures,
  listTimelineEvents,
  listTrainingAssignments,
  listTrainingCatalog,
} from "@/lib/admin-kiosko/repositories/staff-records.repository";
import { EmployeeRecordDashboard, EmployeeRecordForms } from "@/components/staff/EmployeeRecord";
import { AdminHeader } from "../../../_components/AdminHeader";
import { createStaffContractAction } from "../../actions";
import {
  assignTrainingAction,
  createAbsenceAction,
  createDisciplinaryCaseAction,
  updateEmployeePrivateProfileAction,
  linkEmployeeAdminUserAction,
  unlinkEmployeeAdminUserAction,
  uploadEmployeeDocumentAction,
} from "./actions";

export default async function StaffEmployeeDetailPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const session = await requireAdminPermission("staff:read");
  const { employeeId } = await params;
  const [employee, contracts, profile, locations, documents, training, absences, incidents, disciplinary, signatures, timeline, shifts, openEntry, trainingCatalog, adminUsers] = await Promise.all([
    getStaffEmployeeById(employeeId),
    listStaffContracts(employeeId),
    getStaffPrivateProfile(employeeId),
    listStaffLocations(),
    listStaffDocuments(employeeId, true),
    listTrainingAssignments(employeeId),
    listStaffAbsences(employeeId),
    listStaffTimeIncidents(),
    listDisciplinaryCases(employeeId),
    listStaffSignatures(employeeId),
    listTimelineEvents(employeeId),
    listPublishedShiftsForEmployee(employeeId),
    getOpenWorkEntry(employeeId),
    listTrainingCatalog(),
    listAdminUsers(),
  ]);
  if (!employee.ok || !employee.data) notFound();
  const employeeData = employee.data;
  const employeeIncidents = incidents.ok ? incidents.data.filter((incident) => incident.employee_id === employeeId && incident.status === "open").length : 0;
  const nextShift = shifts.ok ? shifts.data[0] || null : null;
  const canReadSensitive = hasAdminPermission(session, "staff:sensitive:read");
  const canWrite = hasAdminPermission(session, "staff:write");
  const canManageContracts = hasAdminPermission(session, "staff:contracts:manage");
  const canManageIdentity = hasAdminPermission(session, "staff:identity:write");
  const linkedUser = adminUsers.ok ? adminUsers.data.find((user) => user.id === employeeData.auth_user_id) || null : null;
  const eligibleUsers = adminUsers.ok ? adminUsers.data.filter((user) => user.status === "active") : [];

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title={employeeData.display_name} description="Expediente laboral completo: perfil, contratos, documentos, formación, ausencias, firmas, historial y auditoría." />
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6">
        <EmployeeRecordDashboard
          employee={employeeData}
          profile={profile.ok ? profile.data : null}
          contracts={contracts.ok ? contracts.data : []}
          locations={locations.ok ? locations.data : []}
          documents={documents.ok ? documents.data : []}
          training={training.ok ? training.data : []}
          absences={absences.ok ? absences.data : []}
          incidentsCount={employeeIncidents}
          disciplinary={disciplinary.ok ? disciplinary.data : []}
          signatures={signatures.ok ? signatures.data : []}
          timeline={timeline.ok ? timeline.data : []}
          nextShift={nextShift}
          openEntry={openEntry.ok ? openEntry.data : null}
          canReadSensitive={canReadSensitive}
        />
        {canWrite ? (
          <EmployeeRecordForms
            employee={employeeData}
            trainings={trainingCatalog.ok ? trainingCatalog.data : []}
            actions={{
              updateProfile: updateEmployeePrivateProfileAction,
              uploadDocument: uploadEmployeeDocumentAction,
              assignTraining: assignTrainingAction,
              createAbsence: createAbsenceAction,
              createDisciplinary: createDisciplinaryCaseAction,
            }}
          />
        ) : null}
        {canManageContracts ? <form action={createStaffContractAction} className="grid gap-3 rounded-[1.6rem] border border-white/10 bg-[#151515] p-5 md:grid-cols-2">
          <input type="hidden" name="employeeId" value={employeeData.id} />
          <h2 className="text-2xl font-black uppercase tracking-[-0.04em] md:col-span-2">Añadir contrato</h2>
          <input name="contractType" required placeholder="Tipo de contrato" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
          <input name="jobTitle" placeholder="Puesto" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
          <input name="startDate" required type="date" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
          <input name="endDate" type="date" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
          <input name="weeklyMinutes" required type="number" min="0" placeholder="Minutos semanales" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
          <input name="collectiveAgreement" placeholder="Convenio" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
          <input name="salaryReference" placeholder="Referencia salarial restringida" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950 md:col-span-2" />
          <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] md:col-span-2">Guardar contrato</button>
        </form> : null}
        {canManageIdentity ? (
          <section className="grid gap-4 rounded-[1.6rem] border border-white/10 bg-[#151515] p-5">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-[-0.04em]">Vinculación de usuario</h2>
              <p className="mt-1 text-sm text-stone-300">
                {linkedUser ? `Vinculado a ${linkedUser.display_name} (${linkedUser.username}).` : "Este empleado no tiene usuario interno vinculado."}
              </p>
            </div>
            <form action={linkEmployeeAdminUserAction} className="grid gap-3 md:grid-cols-[1fr_auto]">
              <input type="hidden" name="employeeId" value={employeeData.id} />
              <select name="adminUserId" required className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950">
                <option value="">Selecciona usuario interno activo</option>
                {eligibleUsers.map((user) => (
                  <option key={user.id} value={user.id}>{user.display_name} · {user.username} · {user.role}</option>
                ))}
              </select>
              <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em]">Vincular</button>
            </form>
            {linkedUser ? (
              <form action={unlinkEmployeeAdminUserAction}>
                <input type="hidden" name="employeeId" value={employeeData.id} />
                <button className="rounded-full border border-white/15 bg-white/8 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Desvincular usuario</button>
              </form>
            ) : null}
          </section>
        ) : null}
      </section>
    </main>
  );
}
