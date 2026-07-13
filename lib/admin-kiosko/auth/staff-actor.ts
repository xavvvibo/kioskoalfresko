import "server-only";

import { getCurrentAdminSession, requireAdminSession, type AdminSession } from "../auth";
import { getPermissionsForRole, hasAdminPermission, type AdminPermission } from "./permissions";
import {
  getStaffEmployeeByAuthUserId,
  getStaffEmployeeById,
  listStaffAuthorizedLocations,
  listStaffEmployeeRoles,
  listStaffLocations,
  type StaffEmployee,
  type StaffEmployeeRole,
} from "../repositories/staff.repository";

export class StaffAuthError extends Error {
  constructor(message: string, public code = "staff_auth_denied") {
    super(message);
    this.name = "StaffAuthError";
  }
}

export type StaffActor = {
  adminUserId: string | null;
  employeeId: string | null;
  employee: StaffEmployee | null;
  organizationIds: string[];
  locationIds: string[];
  staffRoles: StaffEmployeeRole["role"][];
  role: AdminSession["role"];
  permissions: AdminPermission[];
  isOwner: boolean;
  isManager: boolean;
  isEmployee: boolean;
  legacy: boolean;
};

function uniq(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function hasStaffRole(actor: Pick<StaffActor, "staffRoles">, roles: StaffEmployeeRole["role"][]) {
  return actor.staffRoles.some((role) => roles.includes(role));
}

async function buildActor(session: AdminSession): Promise<StaffActor> {
  const permissions = getPermissionsForRole(session.role);
  const isOwner = session.role === "owner";

  let employee: StaffEmployee | null = null;
  let staffRoles: StaffEmployeeRole[] = [];
  let authorizedLocationIds: string[] = [];

  if (session.id) {
    const linkedEmployee = await getStaffEmployeeByAuthUserId(session.id);
    if (!linkedEmployee.ok) throw new StaffAuthError(linkedEmployee.error, "staff_actor_lookup_failed");
    employee = linkedEmployee.data;

    if (employee?.status === "active") {
      const [roles, authorizedLocations] = await Promise.all([
        listStaffEmployeeRoles(employee.id),
        listStaffAuthorizedLocations(employee.id),
      ]);
      if (!roles.ok) throw new StaffAuthError(roles.error, "staff_roles_lookup_failed");
      if (!authorizedLocations.ok) throw new StaffAuthError(authorizedLocations.error, "staff_locations_lookup_failed");
      staffRoles = roles.data;
      authorizedLocationIds = authorizedLocations.data.map((item) => item.location_id);
    }
  }

  const ownerLocationIds = isOwner ? await listAllLocationIds() : [];
  const locationIds = uniq([
    employee?.primary_location_id,
    ...authorizedLocationIds,
    ...staffRoles.map((role) => role.location_id),
    ...ownerLocationIds,
  ]);
  const organizationIds = uniq([
    employee?.organization_id,
    ...(isOwner ? await listAllOrganizationIds() : []),
  ]);
  const roleNames = Array.from(new Set(staffRoles.map((item) => item.role)));
  const isManager = isOwner || hasStaffRole({ staffRoles: roleNames }, ["admin", "staff_hr", "staff_location_manager", "staff_shift_lead"]);

  return {
    adminUserId: session.id,
    employeeId: employee?.id || null,
    employee,
    organizationIds,
    locationIds,
    staffRoles: roleNames,
    role: session.role,
    permissions,
    isOwner,
    isManager,
    isEmployee: Boolean(employee),
    legacy: session.legacy,
  };
}

async function listAllLocationIds() {
  const locations = await listStaffLocations();
  if (!locations.ok) return [];
  return locations.data.map((location) => location.id);
}

async function listAllOrganizationIds() {
  const locations = await listStaffLocations();
  if (!locations.ok) return [];
  return uniq(locations.data.map((location) => location.organization_id));
}

export async function resolveCurrentStaffActor() {
  const session = await getCurrentAdminSession();
  if (!session) return null;
  return buildActor(session);
}

export async function requireAdminActor() {
  const session = await requireAdminSession();
  return buildActor(session);
}

export async function requireStaffEmployeeActor() {
  const actor = await requireAdminActor();
  if (!actor.employee || !actor.employeeId) {
    throw new StaffAuthError("Tu usuario no está vinculado a un perfil de empleado.", "staff_employee_not_linked");
  }
  if (actor.employee.status !== "active") {
    throw new StaffAuthError("Tu perfil de empleado no está activo.", "staff_employee_inactive");
  }
  return actor;
}

export async function requireStaffManagerActor() {
  const actor = await requireAdminActor();
  if (!actor.isManager) throw new StaffAuthError("No tienes permisos para gestionar personal.", "staff_manager_required");
  return actor;
}

export async function requireStaffPermission(permission: AdminPermission) {
  const session = await requireAdminSession();
  if (!hasAdminPermission(session, permission)) {
    throw new StaffAuthError("No tienes permiso para realizar esta acción.", "staff_permission_required");
  }
  return buildActor(session);
}

export function requireOrganizationAccess(actor: StaffActor, organizationId: string | null | undefined) {
  if (!organizationId || actor.isOwner) return;
  if (!actor.organizationIds.includes(organizationId)) {
    throw new StaffAuthError("No tienes acceso a esta organización.", "staff_org_denied");
  }
}

export function requireLocationAccess(actor: StaffActor, locationId: string | null | undefined) {
  if (!locationId || actor.isOwner) return;
  if (!actor.locationIds.includes(locationId)) {
    throw new StaffAuthError("No tienes acceso a este centro.", "staff_location_denied");
  }
}

export async function requireEmployeeAccess(actor: StaffActor, employeeId: string) {
  if (actor.isOwner || hasStaffRole(actor, ["admin", "staff_hr"])) return;
  if (actor.employeeId === employeeId) return;

  const target = await getStaffEmployeeById(employeeId);
  if (!target.ok || !target.data) throw new StaffAuthError("Empleado no encontrado.", "staff_employee_missing");
  requireOrganizationAccess(actor, target.data.organization_id || null);
  requireLocationAccess(actor, target.data.primary_location_id || null);

  if (!actor.isManager) {
    throw new StaffAuthError("No tienes acceso a este empleado.", "staff_employee_denied");
  }
}

export function assertSameEmployee(actor: StaffActor, employeeId: string) {
  if (actor.employeeId !== employeeId) {
    throw new StaffAuthError("No tienes acceso a este recurso.", "staff_self_denied");
  }
}

export function isStaffAuthError(error: unknown): error is StaffAuthError {
  return error instanceof StaffAuthError;
}
