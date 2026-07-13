import { phase4Request } from "./staff-process.repository";

export type StaffEquipmentAssignment = {
  id: string;
  organization_id: string;
  employee_id: string;
  location_id: string | null;
  item_id: string | null;
  item_name: string;
  quantity: number;
  size: string | null;
  serial_number: string | null;
  status: "pending" | "delivered" | "returned" | "lost" | "damaged" | "written_off";
  delivered_at: string | null;
  delivered_by: string | null;
  signature_id: string | null;
  expected_return_at: string | null;
  returned_at: string | null;
  return_status: string | null;
  notes: string | null;
  informational_cost: number | null;
  created_at: string;
  updated_at: string;
};

export type StaffAccessAssignment = {
  id: string;
  organization_id: string;
  employee_id: string;
  location_id: string | null;
  access_type: string;
  required: boolean;
  status: "not_required" | "pending" | "requested" | "active" | "suspended" | "revoked" | "failed";
  requested_at: string | null;
  granted_at: string | null;
  revoked_at: string | null;
  responsible_user_id: string | null;
  external_identifier: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export async function listEquipmentAssignments(employeeId?: string) {
  const filter = employeeId ? `&employee_id=eq.${encodeURIComponent(employeeId)}` : "";
  return phase4Request<StaffEquipmentAssignment[]>("admin_kiosko_staff_equipment_assignments", { method: "GET", query: `?select=*${filter}&order=created_at.desc` });
}

export async function patchEquipmentAssignment(id: string, payload: Partial<StaffEquipmentAssignment>) {
  const result = await phase4Request<StaffEquipmentAssignment[]>("admin_kiosko_staff_equipment_assignments", { method: "PATCH", query: `?id=eq.${encodeURIComponent(id)}`, body: JSON.stringify(payload), headers: { Prefer: "return=representation" } });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}

export async function listAccessAssignments(employeeId?: string) {
  const filter = employeeId ? `&employee_id=eq.${encodeURIComponent(employeeId)}` : "";
  return phase4Request<StaffAccessAssignment[]>("admin_kiosko_staff_access_assignments", { method: "GET", query: `?select=*${filter}&order=created_at.desc` });
}

export async function patchAccessAssignment(id: string, payload: Partial<StaffAccessAssignment>) {
  const result = await phase4Request<StaffAccessAssignment[]>("admin_kiosko_staff_access_assignments", { method: "PATCH", query: `?id=eq.${encodeURIComponent(id)}`, body: JSON.stringify(payload), headers: { Prefer: "return=representation" } });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}
