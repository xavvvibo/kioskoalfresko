import type { Metadata } from "next";
import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { AdminHeader } from "../../_components/AdminHeader";

export const metadata: Metadata = {
  title: "QA RRHH | Admin Kiosko Alfresko",
  robots: { index: false, follow: false },
};

type RestError = {
  ok: false;
  error: string;
};

type RestOk<T> = {
  ok: true;
  data: T;
};

type RestResult<T> = RestOk<T> | RestError;

type StaffHealthRow = {
  id: string;
  [key: string]: unknown;
};

const qaTables = [
  "admin_kiosko_staff_organizations",
  "admin_kiosko_staff_locations",
  "admin_kiosko_staff_employees",
  "admin_kiosko_staff_employee_roles",
  "admin_kiosko_staff_contracts",
  "admin_kiosko_staff_shifts",
  "admin_kiosko_staff_shift_assignments",
  "admin_kiosko_staff_work_entries",
  "admin_kiosko_staff_leave_requests",
  "admin_kiosko_staff_recurring_availability",
  "admin_kiosko_staff_shift_change_requests",
  "admin_kiosko_staff_shift_offers",
  "admin_kiosko_staff_notifications",
  "admin_kiosko_staff_processes",
  "admin_kiosko_staff_process_tasks",
  "admin_kiosko_staff_checklist_runs",
  "admin_kiosko_staff_checklist_issues",
  "admin_kiosko_staff_audit_log",
] as const;

function getSupabaseConfig() {
  return {
    url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    documentBucket: process.env.STAFF_DOCUMENTS_BUCKET || "staff-private-documents",
  };
}

function safeError(error: unknown) {
  if (error instanceof Error) return error.message.replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer [redacted]");
  return "No se pudo completar la comprobación.";
}

async function rest<T>(table: string, query: string): Promise<RestResult<T>> {
  const config = getSupabaseConfig();
  if (!config.url || !config.serviceRoleKey) {
    return { ok: false, error: "Supabase no está configurado." };
  }

  try {
    const response = await fetch(`${config.url}/rest/v1/${table}${query}`, {
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    const text = await response.text();
    if (!response.ok) {
      let message = `HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(text) as { message?: string; details?: string; hint?: string; code?: string };
        message = [parsed.message, parsed.details, parsed.hint, parsed.code].filter(Boolean).join(" · ");
      } catch {
        // Keep generic HTTP message; do not expose raw REST payloads in the UI.
      }
      return { ok: false, error: message };
    }
    return { ok: true, data: (text ? JSON.parse(text) : null) as T };
  } catch (error) {
    return { ok: false, error: safeError(error) };
  }
}

async function checkBucket() {
  const config = getSupabaseConfig();
  if (!config.url || !config.serviceRoleKey) return false;
  try {
    const response = await fetch(`${config.url}/storage/v1/bucket/${encodeURIComponent(config.documentBucket)}`, {
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
      },
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}

function metric(label: string, value: number | string, tone: "ok" | "warn" | "critical" = "ok") {
  const toneClass = tone === "critical" ? "border-red-500/50 text-red-100" : tone === "warn" ? "border-amber-500/50 text-amber-100" : "border-white/10 text-white";
  return (
    <div key={label} className={`rounded-2xl border bg-[#151515] p-4 ${toneClass}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-stone-400">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}

function ids(rows: Array<{ id: string }>) {
  return new Set(rows.map((row) => row.id));
}

export default async function StaffQaPage() {
  await requireAdminPermission("staff:admin");
  const today = new Date().toISOString().slice(0, 10);

  const tableChecks = await Promise.all(
    qaTables.map(async (table) => ({
      table,
      result: await rest<StaffHealthRow[]>(table, "?select=id&limit=1"),
    })),
  );

  const [
    organizations,
    locations,
    employees,
    adminUsers,
    contracts,
    shifts,
    assignments,
    leaveRequests,
    processes,
    processTasks,
    checklistRuns,
    checklistIssues,
    notifications,
    auditRows,
    rlsPolicies,
  ] = await Promise.all([
    rest<Array<{ id: string; active: boolean }>>("admin_kiosko_staff_organizations", "?select=id,active"),
    rest<Array<{ id: string; organization_id: string | null; active: boolean }>>("admin_kiosko_staff_locations", "?select=id,organization_id,active"),
    rest<Array<{ id: string; organization_id: string | null; primary_location_id: string | null; auth_user_id: string | null; pin_hash: string | null; status: string }>>("admin_kiosko_staff_employees", "?select=id,organization_id,primary_location_id,auth_user_id,pin_hash,status"),
    rest<Array<{ id: string; status: string; role: string }>>("admin_users", "?select=id,status,role"),
    rest<Array<{ id: string; employee_id: string; active: boolean }>>("admin_kiosko_staff_contracts", "?select=id,employee_id,active"),
    rest<Array<{ id: string; organization_id: string | null; location_id: string | null; status: string; published_at: string | null }>>("admin_kiosko_staff_shifts", `?select=id,organization_id,location_id,status,published_at&shift_date=gte.${today}`),
    rest<Array<{ id: string; shift_id: string; employee_id: string }>>("admin_kiosko_staff_shift_assignments", "?select=id,shift_id,employee_id"),
    rest<Array<{ id: string; status: string }>>("admin_kiosko_staff_leave_requests", "?select=id,status"),
    rest<Array<{ id: string; employee_id: string; status: string }>>("admin_kiosko_staff_processes", "?select=id,employee_id,status"),
    rest<Array<{ id: string; process_id: string; status: string }>>("admin_kiosko_staff_process_tasks", "?select=id,process_id,status"),
    rest<Array<{ id: string; status: string; due_at: string | null }>>("admin_kiosko_staff_checklist_runs", "?select=id,status,due_at"),
    rest<Array<{ id: string; status: string }>>("admin_kiosko_staff_checklist_issues", "?select=id,status"),
    rest<Array<{ id: string; recipient_employee_id: string; read: boolean; archived: boolean }>>("admin_kiosko_staff_notifications", "?select=id,recipient_employee_id,read,archived"),
    rest<Array<{ id: string; action: string; created_at: string }>>("admin_kiosko_staff_audit_log", "?select=id,action,created_at&order=created_at.desc&limit=8"),
    rest<Array<{ policyname: string; tablename: string; roles: string[] | string | null; qual: string | null }>>("pg_policies", "?select=policyname,tablename,roles,qual&schemaname=eq.public&tablename=like.admin_kiosko_staff_%"),
  ]);

  const bucketOk = await checkBucket();
  const tableFailures = tableChecks.filter((check) => !check.result.ok);
  const employeeRows = employees.ok ? employees.data : [];
  const userRows = adminUsers.ok ? adminUsers.data : [];
  const activeEmployees = employeeRows.filter((employee) => employee.status === "active");
  const contractRows = contracts.ok ? contracts.data : [];
  const shiftRows = shifts.ok ? shifts.data : [];
  const assignmentRows = assignments.ok ? assignments.data : [];
  const processRows = processes.ok ? processes.data : [];
  const processTaskRows = processTasks.ok ? processTasks.data : [];
  const checklistRunRows = checklistRuns.ok ? checklistRuns.data : [];
  const notificationRows = notifications.ok ? notifications.data : [];
  const employeeIds = ids(employeeRows);
  const userIds = ids(userRows);
  const shiftIds = ids(shiftRows);
  const processIds = ids(processRows);

  const employeesWithoutContract = activeEmployees.filter((employee) => !contractRows.some((contract) => contract.employee_id === employee.id && contract.active));
  const employeesWithoutUser = activeEmployees.filter((employee) => !employee.auth_user_id);
  const employeesWithMissingUser = activeEmployees.filter((employee) => employee.auth_user_id && !userIds.has(employee.auth_user_id));
  const inactiveLinkedEmployees = employeeRows.filter((employee) => employee.status !== "active" && employee.auth_user_id);
  const linkedUserCounts = new Map<string, number>();
  for (const employee of employeeRows) {
    if (employee.auth_user_id) linkedUserCounts.set(employee.auth_user_id, (linkedUserCounts.get(employee.auth_user_id) || 0) + 1);
  }
  const duplicatedLinks = Array.from(linkedUserCounts.values()).filter((count) => count > 1).length;
  const employeesWithoutPin = activeEmployees.filter((employee) => !employee.pin_hash);
  const orphanAssignments = assignmentRows.filter((assignment) => !shiftIds.has(assignment.shift_id) || !employeeIds.has(assignment.employee_id));
  const processesWithoutTasks = processRows.filter((process) => !processTaskRows.some((task) => task.process_id === process.id));
  const orphanTasks = processTaskRows.filter((task) => !processIds.has(task.process_id));
  const overdueChecklists = checklistRunRows.filter((run) => run.due_at && new Date(run.due_at) < new Date() && ["pending", "available", "in_progress"].includes(run.status));
  const invalidNotifications = notificationRows.filter((notification) => !employeeIds.has(notification.recipient_employee_id));
  const directAuthPolicies = rlsPolicies.ok
    ? rlsPolicies.data.filter((policy) => {
      const roles = Array.isArray(policy.roles) ? policy.roles : [policy.roles || ""];
      return roles.includes("authenticated") && (policy.qual || "").includes("auth.uid");
    })
    : [];
  const openIssues = checklistIssues.ok ? checklistIssues.data.filter((issue) => issue.status !== "resolved" && issue.status !== "dismissed") : [];
  const criticalAlerts = [
    ...tableFailures.map((failure) => `Tabla no accesible: ${failure.table}`),
    ...orphanAssignments.map((assignment) => `Asignación huérfana: ${assignment.id}`),
    ...orphanTasks.map((task) => `Tarea de proceso huérfana: ${task.id}`),
    ...invalidNotifications.map((notification) => `Notificación sin destinatario válido: ${notification.id}`),
    ...employeesWithMissingUser.map(() => "Empleado vinculado a usuario interno inexistente"),
  ];

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title="QA RRHH" description="Diagnóstico de solo lectura para validar datos, integraciones y bloqueos funcionales del módulo de personal." />
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6">
        <div className="grid gap-3 md:grid-cols-4">
          {metric("Conexión", tableFailures.length ? "Revisar" : "OK", tableFailures.length ? "critical" : "ok")}
          {metric("Estrategia identidad", "Server-side")}
          {metric("RLS", directAuthPolicies.length ? "Revisar" : "Cerrado", directAuthPolicies.length ? "warn" : "ok")}
          {metric("Bucket privado", bucketOk ? "OK" : "No accesible", bucketOk ? "ok" : "warn")}
          {metric("Usuarios internos", userRows.length)}
          {metric("Organizaciones", organizations.ok ? organizations.data.length : 0)}
          {metric("Centros", locations.ok ? locations.data.length : 0)}
          {metric("Empleados activos", activeEmployees.length)}
          {metric("Sin contrato", employeesWithoutContract.length, employeesWithoutContract.length ? "critical" : "ok")}
          {metric("Sin usuario", employeesWithoutUser.length, employeesWithoutUser.length ? "warn" : "ok")}
          {metric("Vínculos duplicados", duplicatedLinks, duplicatedLinks ? "critical" : "ok")}
          {metric("Inactivos con vínculo", inactiveLinkedEmployees.length, inactiveLinkedEmployees.length ? "warn" : "ok")}
          {metric("Sin PIN", employeesWithoutPin.length, employeesWithoutPin.length ? "warn" : "ok")}
          {metric("Turnos futuros", shiftRows.length)}
          {metric("Turnos publicados", shiftRows.filter((shift) => shift.status === "published").length)}
          {metric("Ausencias pendientes", leaveRequests.ok ? leaveRequests.data.filter((request) => ["submitted", "under_review"].includes(request.status)).length : 0)}
          {metric("Procesos bloqueados", processRows.filter((process) => process.status === "blocked").length, processRows.some((process) => process.status === "blocked") ? "warn" : "ok")}
          {metric("Procesos sin tareas", processesWithoutTasks.length, processesWithoutTasks.length ? "warn" : "ok")}
          {metric("Checklists vencidos", overdueChecklists.length, overdueChecklists.length ? "warn" : "ok")}
          {metric("Incidencias abiertas", openIssues.length, openIssues.length ? "warn" : "ok")}
          {metric("Notificaciones no leídas", notificationRows.filter((notification) => !notification.read && !notification.archived).length)}
          {metric("Alertas críticas", criticalAlerts.length, criticalAlerts.length ? "critical" : "ok")}
        </div>

        <section className="rounded-2xl border border-white/10 bg-[#151515] p-5">
          <h2 className="text-xl font-black uppercase tracking-[-0.03em]">Tablas RRHH detectadas</h2>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {tableChecks.map((check) => (
              <div key={check.table} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm">
                <span className="font-mono text-xs text-stone-300">{check.table}</span>
                <span className={check.result.ok ? "text-emerald-300" : "text-red-300"}>{check.result.ok ? "OK" : "Error"}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-[#151515] p-5">
            <h2 className="text-xl font-black uppercase tracking-[-0.03em]">Identidad y RLS</h2>
            <div className="mt-4 grid gap-2 text-sm text-stone-200">
              <p className="rounded-xl border border-white/10 bg-black/20 p-3">Identidad activa: cookie interna `admin_kiosko_session` → `admin_users.id` → empleado vinculado.</p>
              <p className="rounded-xl border border-white/10 bg-black/20 p-3">Autorización: server-side con `service_role` encapsulado en repositorios.</p>
              <p className="rounded-xl border border-white/10 bg-black/20 p-3">Políticas directas `authenticated/auth.uid()`: {rlsPolicies.ok ? directAuthPolicies.length : "no verificable desde PostgREST"}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#151515] p-5">
            <h2 className="text-xl font-black uppercase tracking-[-0.03em]">Alertas críticas</h2>
            {criticalAlerts.length ? (
              <ul className="mt-4 grid gap-2 text-sm text-red-100">
                {criticalAlerts.map((alert) => <li key={alert} className="rounded-xl border border-red-500/30 bg-red-500/10 p-3">{alert}</li>)}
              </ul>
            ) : (
              <p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">No se han detectado bloqueos críticos de integridad en las consultas de diagnóstico.</p>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#151515] p-5">
            <h2 className="text-xl font-black uppercase tracking-[-0.03em]">Última auditoría RRHH</h2>
            {auditRows.ok && auditRows.data.length ? (
              <ul className="mt-4 grid gap-2 text-sm text-stone-200">
                {auditRows.data.map((row) => (
                  <li key={row.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <span className="font-semibold">{row.action}</span>
                    <span className="block text-xs text-stone-400">{new Date(row.created_at).toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-stone-300">No hay auditoría disponible o no se pudo cargar.</p>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
