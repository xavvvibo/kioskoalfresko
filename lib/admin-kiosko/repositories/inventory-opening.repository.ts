import "server-only";

import type { InventoryOpeningOrigin, InventoryOpeningSessionStatus } from "../inventory-opening/types";
import {
  buildCreateInventoryOpeningSessionRpcPayload,
  type CreateOpeningSessionInput,
} from "../inventory-opening/session-rpc";

type DbResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export type InventoryOpeningSessionRow = {
  id: string;
  name: string;
  location_names: string[] | null;
  cutoff_at: string;
  status: InventoryOpeningSessionStatus;
  origin: InventoryOpeningOrigin;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  applied_at: string | null;
  notes: string | null;
  image_count: number;
  group_count: number;
  confirmed_line_count: number;
  issue_count: number;
  created_at: string;
  updated_at: string;
};

export type InventoryOpeningImageRow = {
  id: string;
  session_id: string;
  original_filename: string;
  storage_bucket: string;
  storage_path: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  sha256: string;
  order_index: number;
  relation_status: string;
  review_status: string;
  metadata: Record<string, unknown> | null;
};

export type InventoryOpeningGroupRow = {
  id: string;
  session_id: string;
  group_code: string;
  relation_type: string;
  review_status: string;
  image_ids: string[];
  unit_interpretation: string;
  real_unit_count: number | null;
  total_quantity: number | null;
  unit: string | null;
  notes: string | null;
};

export type InventoryOpeningLineRow = {
  id: string;
  session_id: string;
  group_id: string | null;
  product_id: string | null;
  detected_name: string | null;
  confirmed_name: string | null;
  brand: string | null;
  ean: string | null;
  format: string | null;
  unit_count: number | null;
  total_quantity: number | null;
  unit: string | null;
  manufacturer_lot: string | null;
  expiry_date: string | null;
  location_name: string | null;
  recognition_confidence: number;
  review_status: string;
  identification_method: string;
  traceability_status: string;
  evidence_image_ids: string[];
  issues: unknown[];
};

export type InventoryOpeningAuditRow = {
  id: string;
  session_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type InventoryOpeningDetail = {
  session: InventoryOpeningSessionRow;
  images: InventoryOpeningImageRow[];
  groups: InventoryOpeningGroupRow[];
  lines: InventoryOpeningLineRow[];
  audit: InventoryOpeningAuditRow[];
};

function getSupabaseConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  };
}

function assertSupabaseConfig() {
  const config = getSupabaseConfig();
  if (!config.url || !config.serviceRoleKey) {
    return { ok: false as const, error: "Supabase no está configurado." };
  }
  return { ok: true as const, config };
}

async function supabaseRest<T>(resource: string, init: RequestInit & { query?: string }): Promise<DbResult<T>> {
  const configResult = assertSupabaseConfig();
  if (!configResult.ok) return configResult;

  try {
    const response = await fetch(`${configResult.config.url}/rest/v1/${resource}${init.query || ""}`, {
      ...init,
      headers: {
        apikey: configResult.config.serviceRoleKey,
        Authorization: `Bearer ${configResult.config.serviceRoleKey}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
      cache: "no-store",
    });
    const responseText = await response.text();

    if (!response.ok) {
      let error = responseText || `HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(responseText) as { message?: string; details?: string; hint?: string; code?: string };
        error = [parsed.message, parsed.details, parsed.hint, parsed.code].filter(Boolean).join(" · ");
      } catch {
        // keep raw response
      }
      return { ok: false, error };
    }

    if (response.status === 204 || !responseText) return { ok: true, data: undefined as T };
    return { ok: true, data: JSON.parse(responseText) as T };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se ha podido conectar con Supabase." };
  }
}

export async function listInventoryOpeningSessions(limit = 50): Promise<DbResult<InventoryOpeningSessionRow[]>> {
  return supabaseRest<InventoryOpeningSessionRow[]>("admin_inventory_opening_sessions", {
    method: "GET",
    query: `?select=id,name,location_names,cutoff_at,status,origin,created_by,approved_by,approved_at,applied_at,notes,image_count,group_count,confirmed_line_count,issue_count,created_at,updated_at&order=created_at.desc&limit=${limit}`,
  });
}

export async function getInventoryOpeningSessionDetail(sessionId: string): Promise<DbResult<InventoryOpeningDetail | null>> {
  const sessionResult = await supabaseRest<InventoryOpeningSessionRow[]>("admin_inventory_opening_sessions", {
    method: "GET",
    query: `?select=id,name,location_names,cutoff_at,status,origin,created_by,approved_by,approved_at,applied_at,notes,image_count,group_count,confirmed_line_count,issue_count,created_at,updated_at&id=eq.${encodeURIComponent(sessionId)}&limit=1`,
  });
  if (!sessionResult.ok) return sessionResult;
  const session = sessionResult.data[0];
  if (!session) return { ok: true, data: null };

  const [images, groups, lines, audit] = await Promise.all([
    supabaseRest<InventoryOpeningImageRow[]>("admin_inventory_opening_images", {
      method: "GET",
      query: `?select=id,session_id,original_filename,storage_bucket,storage_path,mime_type,size_bytes,width,height,sha256,order_index,relation_status,review_status,metadata&session_id=eq.${encodeURIComponent(sessionId)}&order=order_index.asc`,
    }),
    supabaseRest<InventoryOpeningGroupRow[]>("admin_inventory_opening_groups", {
      method: "GET",
      query: `?select=id,session_id,group_code,relation_type,review_status,image_ids,unit_interpretation,real_unit_count,total_quantity,unit,notes&session_id=eq.${encodeURIComponent(sessionId)}&order=created_at.asc`,
    }),
    supabaseRest<InventoryOpeningLineRow[]>("admin_inventory_opening_lines", {
      method: "GET",
      query: `?select=id,session_id,group_id,product_id,detected_name,confirmed_name,brand,ean,format,unit_count,total_quantity,unit,manufacturer_lot,expiry_date,location_name,recognition_confidence,review_status,identification_method,traceability_status,evidence_image_ids,issues&session_id=eq.${encodeURIComponent(sessionId)}&order=created_at.asc`,
    }),
    supabaseRest<InventoryOpeningAuditRow[]>("admin_inventory_opening_audit_log", {
      method: "GET",
      query: `?select=id,session_id,action,entity_type,entity_id,reason,metadata,created_at&session_id=eq.${encodeURIComponent(sessionId)}&order=created_at.desc&limit=50`,
    }),
  ]);

  if (!images.ok) return images;
  if (!groups.ok) return groups;
  if (!lines.ok) return lines;
  if (!audit.ok) return audit;

  return { ok: true, data: { session, images: images.data, groups: groups.data, lines: lines.data, audit: audit.data } };
}

export async function createInventoryOpeningSession(input: CreateOpeningSessionInput): Promise<DbResult<InventoryOpeningSessionRow>> {
  const payload = buildCreateInventoryOpeningSessionRpcPayload(input);
  if (!payload.ok) return payload;

  const created = await supabaseRest<InventoryOpeningSessionRow[] | InventoryOpeningSessionRow>("rpc/admin_create_inventory_opening_session", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(payload.data),
  });
  if (!created.ok) return created;
  const session = Array.isArray(created.data) ? created.data[0] : created.data;
  if (!session) return { ok: false, error: "La RPC no devolvió la sesión creada." };

  return { ok: true, data: session };
}
