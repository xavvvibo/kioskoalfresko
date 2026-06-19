"use server";

import { redirect } from "next/navigation";
import { clearAdminSession, createAdminSession, isCorrectAdminPassword } from "@/lib/admin-kiosko/auth";

export async function loginAdminKioskoAction(formData: FormData) {
  const password = String(formData.get("password") || "");

  if (!isCorrectAdminPassword(password)) {
    redirect("/admin-kiosko?error=1");
  }

  await createAdminSession();
  redirect("/admin-kiosko");
}

export async function logoutAdminKioskoAction() {
  await clearAdminSession();
  redirect("/admin-kiosko");
}
