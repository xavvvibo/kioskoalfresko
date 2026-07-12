import { NextRequest } from "next/server";
import { requireAdminPermission } from "@/lib/admin-kiosko/auth/permissions";

export async function GET(request: NextRequest) {
  await requireAdminPermission("labels:basic_print");
  const payload = request.nextUrl.searchParams.get("p") || "KIOSKO ALFRESKO";
  const bytes = new TextEncoder().encode(payload);
  const size = 25;
  const cell = 6;
  const margin = 12;
  const modules = Array.from({ length: size }, (_, y) => Array.from({ length: size }, (_, x) => {
    const finder = (x < 7 && y < 7) || (x >= size - 7 && y < 7) || (x < 7 && y >= size - 7);
    if (finder) {
      const lx = x < 7 ? x : x - (size - 7);
      const ly = y < 7 ? y : y - (size - 7);
      return lx === 0 || lx === 6 || ly === 0 || ly === 6 || (lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4);
    }
    const index = (x * 17 + y * 31) % Math.max(bytes.length, 1);
    return ((bytes[index] || 0) + x * 3 + y * 5 + x * y) % 7 < 3;
  }));
  const rects = modules.flatMap((row, y) => row.map((value, x) => value
    ? `<rect x="${margin + x * cell}" y="${margin + y * cell}" width="${cell}" height="${cell}"/>`
    : "")).join("");
  const total = size * cell + margin * 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${total}" height="${total}"><rect width="100%" height="100%" fill="#fff"/><g fill="#111">${rects}</g></svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
