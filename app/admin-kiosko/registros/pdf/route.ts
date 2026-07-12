import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";

export async function GET(request: NextRequest) {
  await requireAdminPermission("appcc:manage");

  const target = new URL("/admin-kiosko/registros/informe", request.url);
  request.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });

  return NextResponse.redirect(target);
}
