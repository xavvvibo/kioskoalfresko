import "server-only";

import { enqueuePrintJob, type PrintJob } from "@/lib/admin-kiosko/repositories/print-jobs.repository";
import {
  buildPrintPayload,
  DEFAULT_GODEX_G500_PRINTER_KEY,
  validatePrintLabelInput,
  type CreatePrintJobInput,
} from "@/lib/admin-kiosko/printing/print-payload";

export {
  buildPrintPayload,
  DEFAULT_GODEX_G500_PRINTER_KEY,
  PRINT_LABEL_TEMPLATES,
  addDaysToDateTime,
  formatLabelDateTime,
  parseDateTimeInput,
  sanitizeLabelText,
  validatePrintLabelInput,
  type BridgePrintPayload,
  type CreatePrintJobInput,
  type PrintLabelData,
  type PrintLabelTemplate,
} from "@/lib/admin-kiosko/printing/print-payload";

export type { PrintJob, PrintJobStatus } from "@/lib/admin-kiosko/repositories/print-jobs.repository";

export const GODEX_G500_PRINTER_KEY = DEFAULT_GODEX_G500_PRINTER_KEY;

type PrintServiceResult =
  | { ok: true; data: PrintJob }
  | { ok: false; error: string; status: 400 | 500 };

export const printService = {
  async printLabel(input: CreatePrintJobInput): Promise<PrintServiceResult> {
    const validated = validatePrintLabelInput(input);
    if (!validated.ok) {
      return { ok: false, error: validated.error, status: 400 };
    }

    const payload = buildPrintPayload(validated.input);
    const result = await enqueuePrintJob({
      printerKey: validated.input.printerKey,
      payload,
    });

    if (!result.ok) {
      console.error("[PRINT SERVICE] Supabase insert failed", {
        printerKey: validated.input.printerKey,
        template: validated.input.template,
        error: result.error,
      });
      return { ok: false, error: "No se pudo crear el trabajo de impresión.", status: 500 };
    }

      console.info("[PRINT SERVICE] Print job queued", {
      id: result.data.id,
      printerKey: result.data.printer_key,
      template: validated.input.template,
      metadata: validated.input.metadata,
    });

    return result;
  },
};
