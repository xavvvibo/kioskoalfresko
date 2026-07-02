import {
  getDocumentImportContext,
  markDocumentImportCompleted,
  markDocumentImportStarted,
} from "../../repositories/document-import.repository";
import { recordDomainEvent } from "../../repositories/events.repository";
import { createDomainEvent } from "../events";
import type { AdminKioskoDomainEvent } from "../events";
import type {
  DocumentImportHandler,
  DocumentImportHandlerResult,
  DocumentImportPipelineResult,
} from "./contracts";
import { accountingImportHandler } from "./handlers/accounting-import.handler";
import { appccImportHandler } from "./handlers/appcc-import.handler";
import { dashboardProjectionHandler } from "./handlers/dashboard-projection.handler";
import { inventoryLotHandler } from "./handlers/inventory-lot.handler";
import { inventoryReceptionHandler } from "./handlers/inventory-reception.handler";
import { labelImportHandler } from "./handlers/label-import.handler";
import { purchaseImportHandler } from "./handlers/purchase-import.handler";

export class DocumentImportOrchestrator {
  constructor(private readonly handlers: DocumentImportHandler[]) {}

  async handle(event: Extract<AdminKioskoDomainEvent, { name: "InboxImportConfirmed" }>): Promise<DocumentImportPipelineResult | null> {
    const uploadedDocumentId = event.payload.uploadedDocumentId;
    const contextResult = await getDocumentImportContext({
      uploadedDocumentId,
      eventId: event.id,
      correlationId: event.correlationId,
      confirmedType: event.payload.confirmedType,
    });
    if (!contextResult.ok) {
      throw new Error(contextResult.error);
    }

    const context = contextResult.data;
    const startedAt = new Date().toISOString();
    const startedAtMs = Date.now();
    await markDocumentImportStarted(uploadedDocumentId);

    const matchingHandlers = this.handlers.filter((handler) => handler.supports(context));
    const results: DocumentImportHandlerResult[] = [];

    for (const handler of matchingHandlers) {
      try {
        results.push(await handler.execute(context));
      } catch (error) {
        results.push({
          handler: handler.name,
          status: "failed",
          message: error instanceof Error ? error.message : "Handler failed",
          errors: [error instanceof Error ? error.message : String(error)],
          durationMs: 0,
        });
      }
    }

    const completedAt = new Date().toISOString();
    const failed = results.some((result) => result.status === "failed");
    const needsReview = results.some((result) => result.status === "needs_review");
    const warning = results.some((result) => result.status === "warning");
    const pipelineResult: DocumentImportPipelineResult = {
      uploadedDocumentId,
      status: failed ? "failed" : needsReview ? "needs_review" : warning ? "warning" : "success",
      startedAt,
      completedAt,
      durationMs: Date.now() - startedAtMs,
      results,
    };

    const persisted = await markDocumentImportCompleted(pipelineResult);
    if (!persisted.ok) {
      throw new Error(persisted.error);
    }

    await recordDomainEvent(createDomainEvent("DocumentImportCompleted", {
      source: "inbox",
      correlationId: event.correlationId || uploadedDocumentId,
      causationId: event.id,
      trace: { documentId: uploadedDocumentId },
      payload: {
        uploadedDocumentId,
        status: pipelineResult.status,
        durationMs: pipelineResult.durationMs,
        handlers: pipelineResult.results.map((result) => ({
          handler: result.handler,
          status: result.status,
          recordType: result.recordType,
          recordId: result.recordId,
        })),
      },
    }));

    return pipelineResult;
  }
}

export const documentImportOrchestrator = new DocumentImportOrchestrator([
  purchaseImportHandler,
  accountingImportHandler,
  inventoryReceptionHandler,
  inventoryLotHandler,
  appccImportHandler,
  labelImportHandler,
  dashboardProjectionHandler,
]);
