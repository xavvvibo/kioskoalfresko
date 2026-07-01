import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdminSession } from "./auth";

export type AdminRole = "owner" | "employee" | "inspector";
export type AdminSection = "operativa" | "compras" | "produccion" | "inspeccion" | "configuracion" | "owner";

const ROLE_COOKIE = "admin_kiosko_role";
const roles: AdminRole[] = ["owner", "employee", "inspector"];

function normalizeRole(value?: string | null): AdminRole {
  return roles.includes(value as AdminRole) ? value as AdminRole : "owner";
}

export async function getAdminRole(): Promise<AdminRole> {
  await requireAdminSession();
  const cookieStore = await cookies();
  return normalizeRole(cookieStore.get(ROLE_COOKIE)?.value || process.env.ADMIN_KIOSKO_DEFAULT_ROLE);
}

export async function requireOwnerRole() {
  const role = await getAdminRole();
  if (role !== "owner") {
    redirect("/admin-kiosko/empleado");
  }
}

export function canAccessSection(role: AdminRole, section: AdminSection) {
  if (role === "owner") return true;
  if (role === "employee") return ["operativa", "compras", "produccion"].includes(section);
  if (role === "inspector") return ["inspeccion"].includes(section);
  return false;
}
