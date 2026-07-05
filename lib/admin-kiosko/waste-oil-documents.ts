import {
  adminDocuments,
  calculateWasteOilMonthlyControl,
  withUploadedAppccDocumentStatus,
} from "./documents";
import { listInboxDocuments } from "./repositories/inbox.repository";

export async function getWasteOilMonthlyControl(currentDate = new Date()) {
  const documents = await listInboxDocuments({ limit: 200 });
  if (!documents.ok) return documents;
  return { ok: true as const, data: calculateWasteOilMonthlyControl(documents.data, currentDate) };
}

export async function getAppccDocumentCatalog() {
  const control = await getWasteOilMonthlyControl();
  if (!control.ok) return { ok: false as const, error: control.error };
  return {
    ok: true as const,
    data: withUploadedAppccDocumentStatus(adminDocuments, control.data),
    wasteOilControl: control.data,
  };
}
