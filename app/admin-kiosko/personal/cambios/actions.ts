"use server";

import { revalidatePath } from "next/cache";
import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";
import { decideShiftChangeRequest } from "@/lib/admin-kiosko/staff/shift-change.service";

export async function decideShiftChangeAction(formData: FormData) {
  const session = await requireAdminPermission("staff:shift-change:approve");
  await decideShiftChangeRequest({
    actorUserId: session.id,
    requestId: String(formData.get("requestId") || ""),
    decision: String(formData.get("decision") || "reject") as "reject",
    resolution: String(formData.get("resolution") || ""),
  });
  revalidatePath("/admin-kiosko/personal/cambios");
}
