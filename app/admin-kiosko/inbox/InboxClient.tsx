"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { InboxDocumentRecord, InboxDocumentType } from "@/lib/admin-kiosko/inbox";
import { DOCUMENT_TYPE_LABELS } from "@/lib/admin-kiosko/domain/document-types";
import type { InboxGroup, InboxMetrics } from "@/lib/admin-kiosko/repositories/inbox.repository";
import { archiveInboxDocumentAction, bulkInboxDocumentsAction, confirmInboxReviewAction, processInboxPendingOcrAction, uploadInboxDocumentsAction } from "../actions";

const typeLabels: Record<InboxDocumentType, string> = DOCUMENT_TYPE_LABELS;

const statusLabels = {
  uploaded: "Subido",
  processing: "Clasificando",
  classified: "Clasificado",
  needs_review: "Revisión",
  confirmed: "Confirmado",
  imported: "Importado",
  failed: "Error",
  archived: "Archivado",
};

const progressByStatus = {
  uploaded: 15,
  processing: 40,
  classified: 55,
  needs_review: 70,
  confirmed: 92,
  imported: 100,
  failed: 100,
  archived: 100,
};

const statusFilters = [
  ["all", "Todos"],
  ["classified", "Clasificados"],
  ["needs_review", "Revisar"],
  ["failed", "Errores"],
  ["confirmed", "Confirmados"],
  ["imported", "Importados"],
  ["archived", "Archivados"],
] as const;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function statusClass(status: InboxDocumentRecord["status"]) {
  if (status === "failed") return "border-[#d94b2b]/40 bg-[#d94b2b]/10 text-[#f2c6bb]";
  if (status === "confirmed" || status === "imported") return "border-emerald-300 bg-emerald-100 text-emerald-950";
  if (status === "archived") return "border-stone-300 bg-stone-100 text-stone-800";
  return "border-amber-300 bg-amber-100 text-amber-950";
}

function confidenceBadge(confidence?: number) {
  const value = confidence || 0;
  if (value >= 0.86) return { label: "Confianza alta", className: "border-emerald-300 bg-emerald-100 text-emerald-950" };
  if (value >= 0.65) return { label: "Confianza media", className: "border-amber-300 bg-amber-100 text-amber-950" };
  return { label: "Confianza baja · revisión obligatoria", className: "border-[#d94b2b]/40 bg-[#d94b2b]/10 text-[#f2c6bb]" };
}

function reconciliationStatusLabel(status: string) {
  if (status === "reconciled") return "Conciliada";
  if (status === "partially_reconciled") return "Conciliación parcial";
  if (status === "requires_intervention") return "Requiere intervención";
  if (status === "failed") return "Error de conciliación";
  return "Pendiente de revisión";
}

function reconciliationStatusClass(status: string) {
  if (status === "reconciled") return "border-emerald-300 bg-emerald-100 text-emerald-950";
  if (status === "partially_reconciled" || status === "pending_review") return "border-amber-300 bg-amber-100 text-amber-950";
  return "border-[#d94b2b]/40 bg-[#d94b2b]/10 text-[#f2c6bb]";
}

function DocumentReviewRow({ document }: { document: InboxDocumentRecord }) {
  const detectedType = document.selectedType || document.detectedType || "other";
  const progress = progressByStatus[document.status] || 15;
  const confidence = confidenceBadge(document.classificationConfidence);

  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-[#151515] p-4">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">{typeLabels[detectedType]}</p>
              <h3 className="mt-2 break-words text-xl font-black uppercase tracking-[-0.03em] text-[#fff8ef]">{document.filename}</h3>
              <p className="mt-2 text-xs font-semibold text-stone-400">
                {formatBytes(document.fileSize)} · {document.mimeType} · {document.uploadGroupId ? `Expediente ${document.uploadGroupId.slice(0, 8)}` : "Expediente individual"}
              </p>
            </div>
            <span className={`rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] ${statusClass(document.status)}`}>
              {statusLabels[document.status]}
            </span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-[#d94b2b]" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-stone-400 md:grid-cols-6">
            {["Subido", "Clasificando", "OCR", "Normalizando", "Revisión", "Importado"].map((step, index) => (
              <span key={step} className={progress >= (index + 1) * 15 ? "text-[#f2c6bb]" : ""}>{step}</span>
            ))}
          </div>
          <div className="mt-4 grid gap-2 rounded-2xl border border-white/10 bg-white/6 p-3 text-sm text-stone-300">
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-white">Clasificación:</strong>
              <span>{document.classificationSource || "pendiente"} · {Math.round((document.classificationConfidence || 0) * 100)}%</span>
              <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${confidence.className}`}>{confidence.label}</span>
            </div>
            <p><strong className="text-white">Motivo:</strong> {document.classificationReason || "Pendiente de lectura OCR o revisión manual."}</p>
            {document.possibleDuplicate ? (
              <p className="rounded-xl border border-amber-300 bg-amber-100 px-3 py-2 font-semibold text-amber-950">
                Posible duplicado {document.duplicateScore ? `${Math.round(document.duplicateScore * 100)}%` : ""}. No bloquea el flujo; revisar antes de importar.
              </p>
            ) : null}
            {document.relatedRecordType ? <p><strong className="text-white">Relación ERP:</strong> {document.relatedRecordType}</p> : null}
            {document.importStatus ? <p><strong className="text-white">Importación:</strong> {document.importStatus}{document.importDurationMs ? ` · ${document.importDurationMs} ms` : ""}</p> : null}
            {document.processingError || document.importError ? <p className="text-[#f2c6bb]"><strong>Error:</strong> {document.processingError || document.importError}</p> : null}
            {document.ocrAttempts ? (
              <p><strong className="text-white">OCR:</strong> {document.ocrAttempts} intento(s){document.ocrModel ? ` · ${document.ocrModel}` : ""}{document.ocrCompletedAt ? ` · completado ${new Date(document.ocrCompletedAt).toLocaleString("es-ES")}` : ""}</p>
            ) : null}
            {document.ocrWarnings?.length ? (
              <div className="rounded-xl border border-amber-300 bg-amber-100 px-3 py-2 font-semibold text-amber-950">
                {document.ocrWarnings.map((warning) => <p key={warning}>{warning}</p>)}
              </div>
            ) : null}
          </div>
          {document.ocrJson ? (
            <div className="mt-4 grid gap-2 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-stone-300">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f2c6bb]">Resumen OCR</p>
              <p><strong className="text-white">Tipo:</strong> {String(document.ocrJson.detectedType || document.detectedType || "Pendiente de revisión")}</p>
              <p><strong className="text-white">Campos extraídos:</strong> {Object.keys((document.ocrJson.result as Record<string, unknown> | undefined) || {}).slice(0, 8).join(", ") || "Revisión manual preparada."}</p>
            </div>
          ) : null}
          {document.reconciliation ? (
            <div className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-white/6 p-3 text-xs text-stone-300">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f2c6bb]">Propuesta de conciliación</p>
                <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${reconciliationStatusClass(document.reconciliation.status)}`}>
                  {reconciliationStatusLabel(document.reconciliation.status)}
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <p><strong className="text-white">Proveedor detectado:</strong> {document.reconciliation.supplierName || "Pendiente de revisar"}</p>
                <p><strong className="text-white">Proveedor relacionado:</strong> {document.reconciliation.matchedSupplierId ? `${document.reconciliation.supplierMatchStatus} · ${Math.round(document.reconciliation.supplierMatchConfidence * 100)}%` : "Sin relación automática"}</p>
                <p><strong className="text-white">Documento:</strong> {document.reconciliation.documentNumber || "Número no detectado"}{document.reconciliation.documentDate ? ` · ${document.reconciliation.documentDate}` : ""}</p>
                <p><strong className="text-white">Total factura:</strong> {document.reconciliation.totalAmount === undefined ? "Pendiente" : `${document.reconciliation.totalAmount.toFixed(2)} €`}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {[
                  ["Líneas", document.reconciliation.lineCount],
                  ["Conciliadas", document.reconciliation.matchedLines],
                  ["Ambiguas", document.reconciliation.ambiguousLines],
                  ["No reconocidas", document.reconciliation.unrecognizedLines],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.12em] text-stone-400">{label}</p>
                    <p className="mt-1 text-xl font-black text-white">{value}</p>
                  </div>
                ))}
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <p className={document.reconciliation.priceAlerts ? "text-amber-200" : "text-emerald-200"}><strong>Precio:</strong> {document.reconciliation.priceAlerts} alerta(s)</p>
                <p className={document.reconciliation.taxAlerts ? "text-amber-200" : "text-emerald-200"}><strong>IVA:</strong> {document.reconciliation.taxAlerts} alerta(s)</p>
                <p className={document.reconciliation.unitAlerts ? "text-amber-200" : "text-emerald-200"}><strong>Unidad:</strong> {document.reconciliation.unitAlerts} alerta(s)</p>
              </div>
              {document.reconciliation.summary ? <p className="font-semibold text-white">{document.reconciliation.summary}</p> : null}
              {document.reconciliation.warnings.length ? (
                <div className="rounded-xl border border-amber-300 bg-amber-100 px-3 py-2 font-semibold text-amber-950">
                  {document.reconciliation.warnings.map((warning) => <p key={warning}>{warning}</p>)}
                </div>
              ) : null}
              {document.reconciliation.errors.length ? (
                <div className="rounded-xl border border-[#d94b2b]/40 bg-[#d94b2b]/10 px-3 py-2 font-semibold text-[#f2c6bb]">
                  {document.reconciliation.errors.map((error) => <p key={error}>{error}</p>)}
                </div>
              ) : null}
              <p className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 font-semibold text-stone-300">
                Esta propuesta no modifica inventario, contabilidad ni producción. Sirve para revisión antes de aplicar procesos ERP definitivos.
              </p>
            </div>
          ) : null}
          {document.importHandlerResults?.length ? (
            <div className="mt-4 grid gap-2 rounded-2xl border border-white/10 bg-white/6 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f2c6bb]">Resultado por handler</p>
              {document.importHandlerResults.map((result) => (
                <div key={`${result.handler}-${result.recordId || result.status}`} className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-stone-300">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-white">{result.handler}</strong>
                    <span className={result.status === "failed" ? "text-[#f2c6bb]" : result.status === "needs_review" || result.status === "warning" ? "text-amber-200" : "text-emerald-200"}>{result.status}</span>
                  </div>
                  <p className="mt-1">{result.message}</p>
                  {result.warnings?.length ? <p className="mt-1 text-amber-200">{result.warnings.join(" · ")}</p> : null}
                  {result.errors?.length ? <p className="mt-1 text-[#f2c6bb]">{result.errors.join(" · ")}</p> : null}
                </div>
              ))}
            </div>
          ) : null}
          <div className="mt-4 grid gap-2 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs font-semibold text-stone-300">
            {[
              ["Documento recibido", true],
              ["Clasificado", ["classified", "needs_review", "confirmed", "imported"].includes(document.status)],
              ["OCR", document.status === "processing" || ["needs_review", "confirmed", "imported"].includes(document.status)],
              ["Revisión", ["needs_review", "confirmed", "imported"].includes(document.status)],
              ["Confirmación", ["confirmed", "imported"].includes(document.status)],
              ["Importación", document.status === "imported"],
            ].map(([label, done]) => (
              <div key={String(label)} className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${done ? "bg-[#d94b2b]" : "bg-white/20"}`} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <form action={confirmInboxReviewAction} className="grid gap-3 rounded-[1.2rem] border border-white/10 bg-[#0d0d0d] p-4">
          <input type="hidden" name="uploaded_document_id" value={document.uploadedDocumentId} />
          <input type="hidden" name="responsible" value="F. Javier Bocanegra Sanjuan" />
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.12em] text-stone-300">
            Tipo confirmado
            <select name="confirmed_type" defaultValue={detectedType} className="rounded-xl border border-white/12 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-stone-950">
              {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="supplier" placeholder="Proveedor" className="rounded-xl border border-white/12 bg-white px-3 py-2 text-sm text-stone-950" />
            <input name="document_number" placeholder="Factura / albarán" className="rounded-xl border border-white/12 bg-white px-3 py-2 text-sm text-stone-950" />
            <input name="document_date" placeholder="Fecha" className="rounded-xl border border-white/12 bg-white px-3 py-2 text-sm text-stone-950" />
            <input name="total_amount" placeholder="Total" className="rounded-xl border border-white/12 bg-white px-3 py-2 text-sm text-stone-950" />
            <input name="products" placeholder="Productos" className="rounded-xl border border-white/12 bg-white px-3 py-2 text-sm text-stone-950" />
            <input name="batch_number" placeholder="Lote" className="rounded-xl border border-white/12 bg-white px-3 py-2 text-sm text-stone-950" />
            <input name="expiry_date" placeholder="Caducidad" className="rounded-xl border border-white/12 bg-white px-3 py-2 text-sm text-stone-950" />
            <input name="temperature" placeholder="Temperatura" className="rounded-xl border border-white/12 bg-white px-3 py-2 text-sm text-stone-950" />
            <input name="location" placeholder="Ubicación" className="rounded-xl border border-white/12 bg-white px-3 py-2 text-sm text-stone-950" />
            <input name="category" placeholder="Categoría" className="rounded-xl border border-white/12 bg-white px-3 py-2 text-sm text-stone-950" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <select name="traceability" defaultValue="revisar" className="rounded-xl border border-white/12 bg-white px-3 py-2 text-sm text-stone-950">
              <option value="revisar">Trazabilidad a revisar</option>
              <option value="si">Requiere trazabilidad</option>
              <option value="no">No requiere trazabilidad</option>
            </select>
            <select name="appcc" defaultValue="revisar" className="rounded-xl border border-white/12 bg-white px-3 py-2 text-sm text-stone-950">
              <option value="revisar">APPCC a revisar</option>
              <option value="si">Genera APPCC</option>
              <option value="no">No genera APPCC</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white">
              Confirmar e importar
            </button>
            <button formAction={archiveInboxDocumentAction} className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white">
              Archivar
            </button>
          </div>
        </form>
      </div>
    </article>
  );
}

export function InboxClient({
  documents,
  groups,
  metrics,
  saved,
  errorMessage,
}: {
  documents: InboxDocumentRecord[];
  groups: InboxGroup[];
  metrics: InboxMetrics | null;
  saved?: boolean;
  errorMessage?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [filter, setFilter] = useState<(typeof statusFilters)[number][0]>("all");
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState<InboxDocumentType | "">("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const filteredDocuments = useMemo(() => {
    const normalizedQuery = normalize(query);
    return documents.filter((document) => {
      const matchesFilter = filter === "all" || document.status === filter;
      const haystack = normalize([
        document.filename,
        document.detectedType || "",
        document.selectedType || "",
        document.confirmedType || "",
        document.uploadGroupId || "",
        document.classificationReason || "",
        document.ocrWarnings?.join(" ") || "",
        document.processingError || "",
      ].join(" "));
      return matchesFilter && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [documents, filter, query]);

  function addFiles(nextFiles: FileList | File[]) {
    setFiles((current) => {
      const merged = [...current, ...Array.from(nextFiles)];
      const seen = new Set<string>();
      return merged.filter((file) => {
        const key = `${file.name}-${file.size}-${file.lastModified}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });
  }

  function upload() {
    if (!files.length) {
      setMessage("Selecciona o arrastra documentos antes de iniciar la subida.");
      return;
    }

    const formData = new FormData();
    for (const file of files) formData.append("files", file);
    if (selectedType) formData.set("selected_type", selectedType);
    formData.set("responsible", "F. Javier Bocanegra Sanjuan");

    startTransition(async () => {
      const result = await uploadInboxDocumentsAction(formData);
      if (result.ok) {
        setFiles([]);
        setMessage(`${result.documents.length} documento(s) subidos. ${result.errors.length ? `${result.errors.length} requieren revisión de error.` : "Clasificación preparada."}`);
        router.refresh();
      } else {
        setMessage(result.error);
      }
    });
  }

  return (
    <div className="grid gap-6">
      {saved ? <div className="rounded-2xl border border-emerald-300 bg-emerald-100 px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-emerald-950">Documento confirmado.</div> : null}
      {errorMessage ? <div className="rounded-2xl border border-[#d94b2b]/40 bg-[#d94b2b]/10 px-4 py-3 text-sm font-semibold text-[#f2c6bb]">{errorMessage}</div> : null}

      <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
          }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            addFiles(event.dataTransfer.files);
          }}
          onPaste={(event) => {
            const pasted = Array.from(event.clipboardData.files);
            if (pasted.length) addFiles(pasted);
          }}
          className="grid min-h-72 cursor-pointer place-items-center rounded-[2rem] border border-dashed border-[#d94b2b]/50 bg-[#151515] p-6 text-center transition hover:border-[#d94b2b]"
        >
          <input ref={inputRef} type="file" multiple accept="application/pdf,image/*" className="hidden" onChange={(event) => event.target.files && addFiles(event.target.files)} />
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#f2c6bb]">Bandeja única documental</p>
            <h2 className="mt-4 text-4xl font-black uppercase tracking-[-0.05em] text-[#fff8ef]">Arrastra facturas, albaranes, etiquetas o PDFs</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-stone-300">
              Soporta subida masiva, imágenes pegadas desde portapapeles y documentos mezclados. Cada archivo crea un registro raíz en `admin_uploaded_documents`.
            </p>
            <button type="button" className="mt-6 rounded-full border border-[#d94b2b] bg-[#d94b2b] px-6 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">
              Seleccionar archivos
            </button>
          </div>
        </div>

        <aside className="rounded-[2rem] border border-white/10 bg-[#151515] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f2c6bb]">Cola de procesamiento</p>
          <div className="mt-4 grid gap-3">
            <select value={selectedType} onChange={(event) => setSelectedType(event.target.value as InboxDocumentType | "")} className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-sm font-semibold text-stone-950">
              <option value="">Clasificación automática</option>
              {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <button type="button" onClick={upload} disabled={isPending || !files.length} className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white disabled:cursor-not-allowed disabled:opacity-50">
              {isPending ? "Subiendo" : `Subir ${files.length || ""} documento(s)`}
            </button>
          </div>
          {message ? <p className="mt-4 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-semibold text-white">{message}</p> : null}
          {files.length ? (
            <div className="mt-5 max-h-56 overflow-auto rounded-2xl border border-white/10 bg-black/20 p-3">
              {files.slice(0, 120).map((file) => (
                <p key={`${file.name}-${file.size}-${file.lastModified}`} className="border-b border-white/10 py-2 text-xs font-semibold text-stone-300 last:border-b-0">
                  {file.name} · {formatBytes(file.size)}
                </p>
              ))}
              {files.length > 120 ? <p className="py-2 text-xs font-semibold text-[#f2c6bb]">Hay {files.length - 120} archivos adicionales en cola.</p> : null}
            </div>
          ) : null}
        </aside>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          ["Pendientes", metrics?.pending ?? documents.filter((item) => item.status === "uploaded" || item.status === "classified").length],
          ["OCR", metrics?.ocr ?? documents.filter((item) => item.status === "processing").length],
          ["Revisión", metrics?.review ?? documents.filter((item) => item.status === "needs_review").length],
          ["Duplicados", metrics?.duplicates ?? documents.filter((item) => item.possibleDuplicate).length],
          ["Errores", metrics?.errors ?? documents.filter((item) => item.status === "failed").length],
          ["Importados hoy", metrics?.importedToday ?? documents.filter((item) => item.status === "imported").length],
          ["OCR hoy", metrics?.ocrCompletedToday ?? documents.filter((item) => item.ocrCompletedAt?.startsWith(new Date().toISOString().slice(0, 10))).length],
          ["Avisos OCR", metrics?.ocrWarnings ?? documents.filter((item) => item.ocrWarnings?.length).length],
          ["Media importación", metrics?.averageConfirmationMinutes === null || metrics?.averageConfirmationMinutes === undefined ? "Pendiente" : `${metrics.averageConfirmationMinutes} min`],
          ["Expedientes", groups.length],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[1.2rem] border border-white/10 bg-[#151515] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2c6bb]">{label}</p>
            <p className="mt-2 text-3xl font-black text-white">{value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-4 sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f2c6bb]">Revisión documental</p>
            <h2 className="mt-2 text-3xl font-black uppercase tracking-[-0.04em] text-[#fff8ef]">Documentos en bandeja</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {statusFilters.map(([value, label]) => (
              <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] ${filter === value ? "border-[#d94b2b] bg-[#d94b2b] text-white" : "border-white/12 bg-white/6 text-white"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar proveedor, producto, factura, albarán, lote, documento o texto OCR" className="mt-5 w-full rounded-2xl border border-white/12 bg-white px-4 py-3 text-sm text-stone-950 outline-none focus:border-[#d94b2b]" />
        <div className="mt-5 grid gap-4">
          <form action={processInboxPendingOcrAction} className="grid gap-3 rounded-[1.2rem] border border-white/10 bg-white/6 p-3 md:grid-cols-[1fr_auto_auto]">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f2c6bb]">OCR batch</p>
              <p className="mt-1 text-xs font-semibold text-stone-300">Procesa documentos subidos o marcados para reprocesar. No importa, no confirma y no modifica stock.</p>
            </div>
            <input name="limit" type="number" min="1" max="50" defaultValue="10" className="rounded-xl border border-white/12 bg-white px-3 py-2 text-sm font-semibold text-stone-950" />
            <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white">Procesar pendientes</button>
          </form>
          <form id="bulk-inbox-form" action={bulkInboxDocumentsAction} className="grid gap-3 rounded-[1.2rem] border border-white/10 bg-black/20 p-3 md:grid-cols-[1fr_1fr_auto_auto_auto]">
          <input type="hidden" name="responsible" value="F. Javier Bocanegra Sanjuan" />
            <select name="bulk_action" className="rounded-xl border border-white/12 bg-white px-3 py-2 text-sm font-semibold text-stone-950">
              <option value="confirm">Confirmar varios</option>
              <option value="archive">Archivar varios</option>
              <option value="change_type">Cambiar tipo documental</option>
              <option value="reprocess_ocr">Reprocesar OCR</option>
              <option value="mark_duplicate">Marcar duplicado</option>
            </select>
            <select name="bulk_confirmed_type" className="rounded-xl border border-white/12 bg-white px-3 py-2 text-sm font-semibold text-stone-950">
              {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <input name="duplicate_of" placeholder="ID duplicado origen" className="rounded-xl border border-white/12 bg-white px-3 py-2 text-sm text-stone-950" />
            <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white">Aplicar</button>
            <span className="self-center text-[10px] font-black uppercase tracking-[0.12em] text-stone-400">Selecciona documentos</span>
          </form>
          {filteredDocuments.length ? filteredDocuments.map((document) => (
            <div key={document.uploadedDocumentId} className="grid gap-2 md:grid-cols-[auto_1fr]">
              <label className="flex items-start justify-center rounded-2xl border border-white/10 bg-white/6 p-4">
                <input form="bulk-inbox-form" type="checkbox" name="document_ids" value={document.uploadedDocumentId} className="mt-2 h-4 w-4 accent-[#d94b2b]" />
              </label>
              <DocumentReviewRow document={document} />
            </div>
          )) : (
            <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-6 text-sm leading-6 text-stone-300">
              No hay documentos en esta vista. Sube archivos o cambia el filtro para revisar otros estados.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
