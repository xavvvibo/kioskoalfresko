#!/usr/bin/env node
import { randomBytes, scryptSync } from "node:crypto";

const args = new Set(process.argv.slice(2));
const mode = args.has("--report") ? "report" : "check";
const shouldPrintPinHash = args.has("--pin-hash");

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const DOCUMENT_BUCKET = process.env.STAFF_DOCUMENTS_BUCKET || "staff-private-documents";
const QA_ORG_SLUG = "qa-alfresko-group";
const QA_LOCATION_SLUGS = ["qa-kiosko-alfresko", "qa-la-picateria"];
const QA_EMPLOYEE_PREFIX = "QA-";

function hashStaffPin(pin) {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(pin, salt, 64).toString("base64url");
  return `scrypt:${salt}:${hash}`;
}

function usage() {
  return [
    "Uso:",
    "  node scripts/staff-hr-qa-setup.mjs --check",
    "  node scripts/staff-hr-qa-setup.mjs --report",
    "  QA_STAFF_PIN=... node scripts/staff-hr-qa-setup.mjs --pin-hash",
    "",
    "El script es de solo lectura salvo --pin-hash, que solo imprime un hash scrypt compatible para pegarlo como setting SQL.",
  ].join("\n");
}

function assertReadOnlyFlags() {
  const allowed = new Set(["--check", "--report", "--pin-hash", "--help"]);
  const unknown = [...args].filter((arg) => !allowed.has(arg));
  if (unknown.length) {
    throw new Error(`Flags no soportados: ${unknown.join(", ")}`);
  }
}

async function supabaseFetch(path, init = {}) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error("Faltan SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  }

  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const parsed = JSON.parse(text);
      message = [parsed.message, parsed.details, parsed.hint, parsed.code].filter(Boolean).join(" · ");
    } catch {
      if (text) message = text;
    }
    throw new Error(message);
  }
  if (!text) return null;
  return JSON.parse(text);
}

async function tableRows(table, query) {
  return supabaseFetch(`/rest/v1/${table}${query}`);
}

async function tableExists(table) {
  try {
    await tableRows(table, "?select=id&limit=1");
    return true;
  } catch {
    return false;
  }
}

async function bucketExists(bucket) {
  try {
    await supabaseFetch(`/storage/v1/bucket/${encodeURIComponent(bucket)}`);
    return true;
  } catch {
    return false;
  }
}

function byId(rows) {
  return new Set(rows.map((row) => row.id).filter(Boolean));
}

function issue(severity, title, details = "") {
  return { severity, title, details };
}

async function runChecks() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return {
      ok: false,
      bucket: { name: DOCUMENT_BUCKET, ok: false },
      counts: {},
      tableStatus: [],
      issues: [
        issue(
          "critical",
          "Faltan variables de Supabase",
          "Define SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY para ejecutar el diagnóstico.",
        ),
      ],
    };
  }

  const requiredTables = [
    "admin_users",
    "admin_kiosko_staff_organizations",
    "admin_kiosko_staff_locations",
    "admin_kiosko_staff_employees",
    "admin_kiosko_staff_employee_roles",
    "admin_kiosko_staff_contracts",
    "admin_kiosko_staff_shifts",
    "admin_kiosko_staff_shift_assignments",
    "admin_kiosko_staff_work_entries",
    "admin_kiosko_staff_leave_policies",
    "admin_kiosko_staff_leave_requests",
    "admin_kiosko_staff_recurring_availability",
    "admin_kiosko_staff_shift_change_requests",
    "admin_kiosko_staff_shift_offers",
    "admin_kiosko_staff_notifications",
    "admin_kiosko_staff_processes",
    "admin_kiosko_staff_process_tasks",
    "admin_kiosko_staff_documents",
    "admin_kiosko_staff_checklist_runs",
  ];

  const tableStatus = [];
  for (const table of requiredTables) {
    tableStatus.push({ table, ok: await tableExists(table) });
  }

  const missingTables = tableStatus.filter((item) => !item.ok);
  if (missingTables.length) {
    return {
      ok: false,
      issues: missingTables.map((item) => issue("critical", `Tabla no accesible: ${item.table}`)),
      tableStatus,
    };
  }

  const [
    organizations,
    locations,
    employees,
    users,
    roles,
    contracts,
    shifts,
    assignments,
    publications,
    processes,
    tasks,
    documents,
    notifications,
  ] = await Promise.all([
    tableRows("admin_kiosko_staff_organizations", `?select=id,name,slug,active&slug=eq.${QA_ORG_SLUG}`),
    tableRows("admin_kiosko_staff_locations", `?select=id,name,slug,organization_id,active,allows_kiosk_clock&slug=in.(${QA_LOCATION_SLUGS.join(",")})`),
    tableRows("admin_kiosko_staff_employees", `?select=id,employee_code,display_name,status,organization_id,primary_location_id,auth_user_id,pin_hash&employee_code=like.${QA_EMPLOYEE_PREFIX}*`),
    tableRows("admin_users", "?select=id,username,role,status&username=like.qa_%"),
    tableRows("admin_kiosko_staff_employee_roles", "?select=id,employee_id,location_id,role,active"),
    tableRows("admin_kiosko_staff_contracts", "?select=id,employee_id,organization_id,active,start_date,end_date"),
    tableRows("admin_kiosko_staff_shifts", "?select=id,organization_id,location_id,status,published_at&order=shift_date.asc"),
    tableRows("admin_kiosko_staff_shift_assignments", "?select=id,shift_id,employee_id,assignment_status"),
    tableRows("admin_kiosko_staff_schedule_publications", "?select=id,organization_id,location_id,status,shift_ids,affected_employee_ids"),
    tableRows("admin_kiosko_staff_processes", "?select=id,organization_id,employee_id,process_type,status"),
    tableRows("admin_kiosko_staff_process_tasks", "?select=id,process_id,employee_id,status,title"),
    tableRows("admin_kiosko_staff_documents", "?select=id,employee_id,private_path,status"),
    tableRows("admin_kiosko_staff_notifications", "?select=id,recipient_employee_id,notification_type,read,archived"),
  ]);

  const problems = [];
  const org = organizations[0] || null;
  if (!org) problems.push(issue("critical", "No existe la organización QA Alfresko Group", `slug=${QA_ORG_SLUG}`));
  if (locations.length < QA_LOCATION_SLUGS.length) problems.push(issue("critical", "Faltan centros QA", `Encontrados ${locations.length}/${QA_LOCATION_SLUGS.length}`));
  if (!employees.length) problems.push(issue("critical", "No hay empleados QA", `Prefijo esperado ${QA_EMPLOYEE_PREFIX}`));

  const employeeIds = byId(employees);
  const userIds = byId(users);
  const locationIds = byId(locations);
  const shiftIds = byId(shifts);

  const activeEmployees = employees.filter((employee) => employee.status === "active");
  const missingContract = activeEmployees.filter((employee) => !contracts.some((contract) => contract.employee_id === employee.id && contract.active));
  const missingOrg = employees.filter((employee) => !employee.organization_id);
  const missingLocation = employees.filter((employee) => !employee.primary_location_id || !locationIds.has(employee.primary_location_id));
  const missingAuthUser = activeEmployees.filter((employee) => !employee.auth_user_id || !userIds.has(employee.auth_user_id));
  const missingPin = activeEmployees.filter((employee) => !employee.pin_hash);
  const missingRole = activeEmployees.filter((employee) => !roles.some((role) => role.employee_id === employee.id && role.active));
  const orphanAssignments = assignments.filter((assignment) => !shiftIds.has(assignment.shift_id) || !employeeIds.has(assignment.employee_id));
  const publicationsWithoutShifts = publications.filter((publication) => publication.status === "published" && (!publication.shift_ids || publication.shift_ids.length === 0));
  const processesWithoutTasks = processes.filter((process) => !tasks.some((task) => task.process_id === process.id));
  const invalidDocumentPaths = documents.filter((document) => document.private_path.startsWith("/") || document.private_path.includes(".."));
  const notificationsWithoutRecipient = notifications.filter((notification) => !employeeIds.has(notification.recipient_employee_id));
  const bucketOk = await bucketExists(DOCUMENT_BUCKET);

  if (!bucketOk) problems.push(issue("warning", "Bucket privado no accesible", DOCUMENT_BUCKET));
  for (const employee of missingContract) problems.push(issue("critical", "Empleado activo sin contrato", `${employee.employee_code} · ${employee.display_name}`));
  for (const employee of missingOrg) problems.push(issue("critical", "Empleado sin organización", `${employee.employee_code} · ${employee.display_name}`));
  for (const employee of missingLocation) problems.push(issue("critical", "Empleado sin centro QA válido", `${employee.employee_code} · ${employee.display_name}`));
  for (const employee of missingAuthUser) problems.push(issue("warning", "Empleado activo sin usuario interno vinculado", `${employee.employee_code} · ${employee.display_name}`));
  for (const employee of missingPin) problems.push(issue("warning", "Empleado activo sin pin_hash para kiosk", `${employee.employee_code} · ${employee.display_name}`));
  for (const employee of missingRole) problems.push(issue("warning", "Empleado activo sin rol RRHH", `${employee.employee_code} · ${employee.display_name}`));
  for (const assignment of orphanAssignments) problems.push(issue("critical", "Asignación huérfana", assignment.id));
  for (const publication of publicationsWithoutShifts) problems.push(issue("warning", "Publicación sin turnos", publication.id));
  for (const process of processesWithoutTasks) problems.push(issue("warning", "Proceso sin tareas", `${process.id} · ${process.process_type}`));
  for (const document of invalidDocumentPaths) problems.push(issue("critical", "Ruta privada de documento inválida", document.id));
  for (const notification of notificationsWithoutRecipient) problems.push(issue("critical", "Notificación sin destinatario válido", notification.id));

  return {
    ok: problems.every((problem) => problem.severity !== "critical"),
    bucket: { name: DOCUMENT_BUCKET, ok: bucketOk },
    counts: {
      organizations: organizations.length,
      locations: locations.length,
      employees: employees.length,
      activeEmployees: activeEmployees.length,
      users: users.length,
      roles: roles.length,
      contracts: contracts.length,
      shifts: shifts.length,
      assignments: assignments.length,
      publications: publications.length,
      processes: processes.length,
      tasks: tasks.length,
      documents: documents.length,
      notifications: notifications.length,
    },
    tableStatus,
    issues: problems,
  };
}

async function main() {
  assertReadOnlyFlags();

  if (args.has("--help")) {
    console.log(usage());
    return;
  }

  if (shouldPrintPinHash) {
    const pin = process.env.QA_STAFF_PIN || "";
    if (!pin) throw new Error("Define QA_STAFF_PIN para generar el hash sin guardar el PIN en el repo.");
    console.log(hashStaffPin(pin));
    return;
  }

  const result = await runChecks();
  if (mode === "report") {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`QA RRHH: ${result.ok ? "OK" : "REVISAR"}`);
    console.log(`Bucket ${result.bucket?.name || DOCUMENT_BUCKET}: ${result.bucket?.ok ? "OK" : "no accesible"}`);
    if (result.counts) {
      for (const [label, value] of Object.entries(result.counts)) {
        console.log(`${label}: ${value}`);
      }
    }
    if (result.issues.length) {
      console.log("\nIncidencias:");
      for (const item of result.issues) {
        console.log(`- [${item.severity}] ${item.title}${item.details ? `: ${item.details}` : ""}`);
      }
    }
  }

  if (!result.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Error desconocido");
  process.exitCode = 1;
});
