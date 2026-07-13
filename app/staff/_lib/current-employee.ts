import { isStaffAuthError, requireStaffEmployeeActor } from "@/lib/admin-kiosko/auth/staff-actor";

export async function getCurrentStaffEmployeeForPage() {
  try {
    const actor = await requireStaffEmployeeActor();
    if (!actor.employee) return { ok: false as const, error: "Tu usuario no está vinculado a un perfil de empleado. Contacta con administración." };
    return { ok: true as const, actor, employee: actor.employee };
  } catch (error) {
    return {
      ok: false as const,
      error: isStaffAuthError(error) ? error.message : "Tu usuario no está vinculado a un perfil de empleado. Contacta con administración.",
    };
  }
}
