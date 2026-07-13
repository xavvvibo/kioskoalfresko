export type IdentityActorSnapshot = {
  adminUserId: string | null;
  employeeId: string | null;
  organizationIds: string[];
  locationIds: string[];
  permissions: string[];
  isOwner: boolean;
  isManager: boolean;
};

export type IdentityEmployeeSnapshot = {
  id: string;
  auth_user_id: string | null;
  organization_id: string | null;
  primary_location_id: string | null;
  status: string;
};

export function canAccessEmployeeRecord(actor: IdentityActorSnapshot, employee: IdentityEmployeeSnapshot) {
  if (actor.isOwner) return true;
  if (actor.employeeId && actor.employeeId === employee.id) return true;
  if (!actor.isManager) return false;
  if (employee.organization_id && !actor.organizationIds.includes(employee.organization_id)) return false;
  if (employee.primary_location_id && !actor.locationIds.includes(employee.primary_location_id)) return false;
  return true;
}

export function canReadSensitiveStaffData(actor: IdentityActorSnapshot, employee: IdentityEmployeeSnapshot) {
  if (!canAccessEmployeeRecord(actor, employee)) return false;
  return actor.isOwner || actor.permissions.includes("staff:sensitive:read");
}

export function validateStaffEmployeeLink(input: {
  employee: IdentityEmployeeSnapshot;
  adminUserExists: boolean;
  adminUserActive: boolean;
  linkedEmployeeIdsForUser: string[];
}) {
  if (!input.employee.auth_user_id) return "missing_link";
  if (!input.adminUserExists) return "missing_admin_user";
  if (!input.adminUserActive) return "inactive_admin_user";
  const otherLinks = input.linkedEmployeeIdsForUser.filter((id) => id !== input.employee.id);
  if (otherLinks.length) return "duplicate_link";
  if (input.employee.status !== "active") return "inactive_employee_with_link";
  return "valid";
}

export function detectDuplicateStaffIdentityLinks(employees: IdentityEmployeeSnapshot[]) {
  const counts = new Map<string, string[]>();
  for (const employee of employees) {
    if (!employee.auth_user_id) continue;
    const current = counts.get(employee.auth_user_id) || [];
    current.push(employee.id);
    counts.set(employee.auth_user_id, current);
  }
  return Array.from(counts.entries())
    .filter(([, employeeIds]) => employeeIds.length > 1)
    .map(([adminUserId, employeeIds]) => ({ adminUserId, employeeIds }));
}

export function sanitizeStaffAccessAuditMetadata(input: Record<string, unknown>) {
  const blocked = new Set(["cookie", "token", "serviceRole", "service_role", "pin", "pinHash", "password", "dni", "nss", "iban", "documentContent"]);
  return Object.fromEntries(Object.entries(input).filter(([key]) => !blocked.has(key)));
}
