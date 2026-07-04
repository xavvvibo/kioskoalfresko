import "server-only";

import type { PrintJob } from "@/lib/admin-kiosko/repositories/print-jobs.repository";

export function printJobCreatedResponse(job: PrintJob) {
  return {
    job: {
      id: job.id,
      printer_key: job.printer_key,
      status: job.status,
      payload: job.payload,
      created_at: job.created_at,
    },
  };
}
