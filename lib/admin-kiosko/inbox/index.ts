export type * from "./contracts";

/**
 * Inbox ERP futura.
 *
 * Entrada unica prevista para documentos individuales o bulk. Cada archivo
 * debe crear primero un registro en admin_uploaded_documents; despues la IA
 * propone tipo, el usuario puede corregirlo y la confirmacion emite
 * DocumentConfirmed para derivar hacia los bounded contexts correspondientes.
 */
export const INBOX_ENTRY_LABEL = "Subir documentos";
