import { claimPendingPrintJobs, recoverStalePrintJobs } from "@/lib/admin-kiosko/database";
import { generateLabelCommand } from "@/lib/admin-kiosko/printing/label-command";
import { requirePrintApiToken } from "@/lib/admin-kiosko/printing/print-api-auth";

export async function GET(request: Request) {
  const auth = requirePrintApiToken(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const printerKey = url.searchParams.get("printer_key") || "";
  const limit = Number(url.searchParams.get("limit") || 1);
  const staleMinutes = Number(url.searchParams.get("stale_minutes") || process.env.PRINT_JOBS_STALE_MINUTES || 10);
  const recovered = await recoverStalePrintJobs(staleMinutes);
  if (!recovered.ok) {
    return Response.json({ error: recovered.error }, { status: 400 });
  }
  if (recovered.data.length) {
    console.error("[PRINT JOB STALE RECOVERY]", {
      staleMinutes,
      jobs: recovered.data.map((job) => ({
        id: job.id,
        printer_key: job.printer_key,
        attempts: job.attempts,
        statusNew: job.status,
        claimed_at: job.claimed_at,
        error: job.error_message,
      })),
    });
  }

  const result = await claimPendingPrintJobs(printerKey, limit);

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  const jobs = result.data.map((job) => {
    const generated = generateLabelCommand({
      printerLanguage: "ezpl",
      labelType: job.label_type,
      payload: job.payload_json,
    });

    return {
      id: job.id,
      printer_key: job.printer_key,
      label_type: job.label_type,
      payload_json: job.payload_json,
      status: job.status,
      claimed_from_status: job.claimed_from_status,
      attempts: job.attempts,
      command_language: generated.printerLanguage,
      raw_command: generated.command,
      created_at: job.created_at,
    };
  });

  if (jobs.length) {
    console.info("[PRINT JOB CLAIMED]", {
      printerKey,
      count: jobs.length,
      jobs: jobs.map((job) => ({
        id: job.id,
        printer_key: job.printer_key,
        attempts: job.attempts,
        statusPrevious: job.claimed_from_status,
        statusNew: job.status,
      })),
    });
  }

  return Response.json({ jobs, recovered: recovered.data.length });
}
