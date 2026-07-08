import "server-only";

import { enqueuePrintJob, type PrintJob } from "@/lib/admin-kiosko/repositories/print-jobs.repository";
import { generateLabelCommand } from "@/lib/admin-kiosko/printing/label-command";
import { isValidGodex80x50Ezpl, summarizeGodexEzpl } from "@/lib/admin-kiosko/printing/godex-80x50-ezpl.mjs";
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
  | { ok: true; data: PrintJob; idempotent?: boolean }
  | { ok: false; error: string; status: 400 | 500 };

export const printService = {
  async printLabel(input: CreatePrintJobInput): Promise<PrintServiceResult> {
    const validated = validatePrintLabelInput(input);
    if (!validated.ok) {
      return { ok: false, error: validated.error, status: 400 };
    }

    const requestId = validated.input.metadata.requestId || crypto.randomUUID();
    const sourceType = validated.input.metadata.sourceType || validated.input.template;
    const sourceId = validated.input.metadata.sourceId || requestId;
    const metadata = {
      ...validated.input.metadata,
      requestId,
      idempotencyKey: validated.input.metadata.idempotencyKey || `print:${sourceType}:${sourceId}:${requestId}`,
    };
    const payload = buildPrintPayload({
      ...validated.input,
      metadata,
    });
    const generated = generateLabelCommand({
      printerLanguage: "ezpl",
      labelType: validated.input.template,
      payload,
    });
    if (!isValidGodex80x50Ezpl(generated.command)) {
      return { ok: false, error: "Generated EZPL is invalid.", status: 500 };
    }

    const ezplSummary = summarizeGodexEzpl(generated.command);
    console.info("[PRINT SERVICE] Generated EZPL", {
      printerKey: validated.input.printerKey,
      template: validated.input.template,
      rawCommandLength: ezplSummary.rawCommandLength,
      firstLines: ezplSummary.firstLines,
      lastLines: ezplSummary.lastLines,
    });

    const result = await enqueuePrintJob({
      printerKey: validated.input.printerKey,
      payload: {
        ...payload,
        raw_command: generated.command,
      },
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

    return { ok: true, data: result.data, idempotent: "idempotent" in result ? result.idempotent : undefined };
  },
};
