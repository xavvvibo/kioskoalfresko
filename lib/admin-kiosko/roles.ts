import { getCurrentAdminSession, requireAdminSession } from "./auth";
import { requireAdminRole } from "./auth/permissions";

export type AdminRole = "owner" | "employee" | "inspector";
export type AdminSection = "operativa" | "compras" | "produccion" | "inspeccion" | "configuracion" | "owner";

export async function getAdminRole(): Promise<AdminRole> {
  const session = await requireAdminSession();
  return session.role;
}

export async function requireOwnerRole() {
  return requireAdminRole("owner");
}

export async function getOptionalAdminRole(): Promise<AdminRole> {
  const session = await getCurrentAdminSession();
  return session?.role || "owner";
}

export function canAccessSection(role: AdminRole, section: AdminSection) {
  if (role === "owner") return true;
  if (role === "employee") return ["operativa"].includes(section);
  if (role === "inspector") return ["inspeccion"].includes(section);
  return false;
}
