import "server-only";

export function requirePrintApiToken(request: Request) {
  const expected = process.env.PRINT_JOBS_API_TOKEN?.trim() || "";
  if (!expected) {
    return { ok: false as const, response: Response.json({ error: "PRINT_JOBS_API_TOKEN no está configurado." }, { status: 503 }) };
  }

  const authorization = request.headers.get("authorization") || "";
  const bearer = authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : "";
  const headerToken = request.headers.get("x-print-jobs-token")?.trim() || "";
  const token = bearer || headerToken;

  if (token !== expected) {
    return { ok: false as const, response: Response.json({ error: "No autorizado." }, { status: 401 }) };
  }

  return { ok: true as const };
}
