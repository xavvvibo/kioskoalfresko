import assert from "node:assert/strict";
import { test } from "node:test";

const enabled = process.env.STAFF_QA_INTEGRATION === "1";
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

async function rest<T>(table: string, query: string): Promise<T> {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}${query}`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
  });
  const text = await response.text();
  assert.equal(response.ok, true, `${table}: ${text}`);
  return JSON.parse(text) as T;
}

test("staff QA integration reads core repositories against Supabase", { skip: !enabled }, async () => {
  assert.ok(supabaseUrl, "SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL requerido");
  assert.ok(serviceRoleKey, "SUPABASE_SERVICE_ROLE_KEY requerida");

  const organizations = await rest<Array<{ id: string; slug: string }>>(
    "admin_kiosko_staff_organizations",
    "?select=id,slug&slug=eq.qa-alfresko-group",
  );
  assert.equal(organizations.length, 1, "Debe existir la organización QA");

  const locations = await rest<Array<{ id: string; slug: string }>>(
    "admin_kiosko_staff_locations",
    "?select=id,slug&slug=in.(qa-kiosko-alfresko,qa-la-picateria)",
  );
  assert.equal(locations.length, 2, "Deben existir los dos centros QA");

  const employees = await rest<Array<{ id: string; employee_code: string }>>(
    "admin_kiosko_staff_employees",
    "?select=id,employee_code&employee_code=like.QA-*",
  );
  assert.ok(employees.length >= 5, "Deben existir empleados QA suficientes");

  const employeeIds = new Set(employees.map((employee) => employee.id));
  const firstEmployee = employees[0];
  assert.ok(firstEmployee);

  const contracts = await rest<Array<{ id: string; employee_id: string }>>(
    "admin_kiosko_staff_contracts",
    `?select=id,employee_id&employee_id=in.(${[...employeeIds].join(",")})`,
  );
  assert.ok(contracts.length >= 4, "Deben existir contratos QA");

  const checks = await Promise.all([
    rest("admin_kiosko_staff_shifts", "?select=id,status&limit=20"),
    rest("admin_kiosko_staff_work_entries", `?select=id,status&employee_id=eq.${firstEmployee.id}&limit=20`),
    rest("admin_kiosko_staff_leave_requests", `?select=id,status&employee_id=eq.${firstEmployee.id}&limit=20`),
    rest("admin_kiosko_staff_recurring_availability", `?select=id,status&employee_id=eq.${firstEmployee.id}&limit=20`),
    rest("admin_kiosko_staff_notifications", `?select=id,read&recipient_employee_id=eq.${firstEmployee.id}&limit=20`),
    rest("admin_kiosko_staff_processes", `?select=id,status&employee_id=eq.${firstEmployee.id}&limit=20`),
    rest("admin_kiosko_staff_checklist_runs", `?select=id,status&employee_id=eq.${firstEmployee.id}&limit=20`),
  ]);

  for (const rows of checks) {
    assert.ok(Array.isArray(rows), "La consulta debe devolver filas");
  }
});
