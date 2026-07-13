import { redirect } from "next/navigation";
import { getCurrentAdminSession, requireAdminSession, type AdminSession } from "../auth";

export type AdminRole = "owner" | "employee";

export type AdminPermission =
  | "admin:all"
  | "users:manage"
  | "audit:view"
  | "appcc:manage"
  | "appcc:basic_view"
  | "temperatures:create"
  | "goods_reception:basic_create"
  | "goods_reception:advanced_create"
  | "cleaning:create"
  | "incidents:create"
  | "inventory:manage"
  | "inventory:basic_view"
  | "traceability:manage"
  | "print:manage"
  | "labels:basic_print"
  | "reports:view"
  | "settings:manage"
  | "staff:admin"
  | "staff:identity:read"
  | "staff:identity:write"
  | "staff:hr"
  | "staff:shifts:manage"
  | "staff:shifts:publish"
  | "staff:time:review"
  | "staff:reports:export"
  | "staff:contracts:manage"
  | "staff:read"
  | "staff:write"
  | "staff:sensitive:read"
  | "staff:documents:read"
  | "staff:documents:write"
  | "staff:disciplinary:read"
  | "staff:disciplinary:write"
  | "staff:audit:read"
  | "staff:signatures:manage"
  | "staff:absence:read"
  | "staff:absence:write"
  | "staff:absence:approve"
  | "staff:balance:read"
  | "staff:balance:adjust"
  | "staff:policy:read"
  | "staff:policy:write"
  | "staff:period:lock"
  | "staff:payroll-variable:read"
  | "staff:payroll-variable:write"
  | "staff:payroll-variable:export"
  | "staff:availability:read"
  | "staff:availability:write"
  | "staff:availability:approve"
  | "staff:shift-change:read"
  | "staff:shift-change:write"
  | "staff:shift-change:approve"
  | "staff:shift-change:execute"
  | "staff:coverage:read"
  | "staff:coverage:write"
  | "staff:coverage:assign"
  | "staff:shift-offer:read"
  | "staff:shift-offer:write"
  | "staff:shift-offer:respond"
  | "staff:notification:read"
  | "staff:notification:write"
  | "staff:schedule-publication:read"
  | "staff:schedule-publication:write"
  | "staff:schedule-publication:publish"
  | "staff:onboarding:read"
  | "staff:onboarding:write"
  | "staff:onboarding:manage"
  | "staff:offboarding:read"
  | "staff:offboarding:write"
  | "staff:offboarding:manage"
  | "staff:policy:publish"
  | "staff:training:read"
  | "staff:training:write"
  | "staff:training:validate"
  | "staff:prl:read"
  | "staff:prl:write"
  | "staff:prl:sensitive"
  | "staff:equipment:read"
  | "staff:equipment:write"
  | "staff:access:read"
  | "staff:access:write"
  | "staff:checklist:read"
  | "staff:checklist:write"
  | "staff:checklist:supervise"
  | "staff:compliance:read";

export const ownerPermissions: AdminPermission[] = [
  "admin:all",
  "users:manage",
  "audit:view",
  "appcc:manage",
  "inventory:manage",
  "traceability:manage",
  "print:manage",
  "reports:view",
  "settings:manage",
  "staff:admin",
  "staff:identity:read",
  "staff:identity:write",
  "staff:hr",
  "staff:shifts:manage",
  "staff:shifts:publish",
  "staff:time:review",
  "staff:reports:export",
  "staff:contracts:manage",
  "staff:read",
  "staff:write",
  "staff:sensitive:read",
  "staff:documents:read",
  "staff:documents:write",
  "staff:disciplinary:read",
  "staff:disciplinary:write",
  "staff:audit:read",
  "staff:signatures:manage",
  "staff:absence:read",
  "staff:absence:write",
  "staff:absence:approve",
  "staff:balance:read",
  "staff:balance:adjust",
  "staff:policy:read",
  "staff:policy:write",
  "staff:period:lock",
  "staff:payroll-variable:read",
  "staff:payroll-variable:write",
  "staff:payroll-variable:export",
  "staff:availability:read",
  "staff:availability:write",
  "staff:availability:approve",
  "staff:shift-change:read",
  "staff:shift-change:write",
  "staff:shift-change:approve",
  "staff:shift-change:execute",
  "staff:coverage:read",
  "staff:coverage:write",
  "staff:coverage:assign",
  "staff:shift-offer:read",
  "staff:shift-offer:write",
  "staff:shift-offer:respond",
  "staff:notification:read",
  "staff:notification:write",
  "staff:schedule-publication:read",
  "staff:schedule-publication:write",
  "staff:schedule-publication:publish",
  "staff:onboarding:read",
  "staff:onboarding:write",
  "staff:onboarding:manage",
  "staff:offboarding:read",
  "staff:offboarding:write",
  "staff:offboarding:manage",
  "staff:policy:publish",
  "staff:training:read",
  "staff:training:write",
  "staff:training:validate",
  "staff:prl:read",
  "staff:prl:write",
  "staff:prl:sensitive",
  "staff:equipment:read",
  "staff:equipment:write",
  "staff:access:read",
  "staff:access:write",
  "staff:checklist:read",
  "staff:checklist:write",
  "staff:checklist:supervise",
  "staff:compliance:read",
];

export const employeePermissions: AdminPermission[] = [
  "temperatures:create",
  "goods_reception:basic_create",
  "cleaning:create",
  "incidents:create",
  "appcc:basic_view",
  "labels:basic_print",
  "inventory:basic_view",
];

export function getPermissionsForRole(role: AdminRole) {
  return role === "owner" ? ownerPermissions : employeePermissions;
}

export function hasAdminPermission(session: Pick<AdminSession, "role">, permission: AdminPermission) {
  if (session.role === "owner") return true;
  return getPermissionsForRole(session.role).includes(permission);
}

export async function requireAdminRole(role: AdminRole) {
  const session = await requireAdminSession();
  if (session.role !== role) redirect("/admin-kiosko/403");
  return session;
}

export async function requireAdminPermission(permission: AdminPermission) {
  const session = await requireAdminSession();
  if (!hasAdminPermission(session, permission)) redirect("/admin-kiosko/403");
  return session;
}

export async function getOptionalAdminSession() {
  return getCurrentAdminSession();
}
