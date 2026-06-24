import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-kiosko/auth";

export async function GET(request: NextRequest) {
  await requireAdminSession();

  const target = new URL("/admin-kiosko/registros/informe", request.url);
  request.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });

  return NextResponse.redirect(target);
}
