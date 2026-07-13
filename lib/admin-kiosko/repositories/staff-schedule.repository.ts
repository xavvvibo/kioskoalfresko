import { phase3Request } from "./staff-availability.repository";

export type SchedulePublication = {
  id: string;
  organization_id: string;
  location_id: string | null;
  period_starts_on: string;
  period_ends_on: string;
  version: number;
  published_at: string | null;
  published_by: string | null;
  shift_ids: string[];
  affected_employee_ids: string[];
  change_summary: Record<string, unknown>;
  previous_publication_id: string | null;
  status: "draft" | "published" | "superseded" | "cancelled";
  effective_at: string | null;
  notifications_generated: number;
  created_at: string;
  updated_at: string;
};

export type SchedulePublicationChange = {
  id: string;
  publication_id: string;
  organization_id: string;
  shift_id: string | null;
  change_type: string;
  before_data: Record<string, unknown>;
  after_data: Record<string, unknown>;
  actor_user_id: string | null;
  reason: string | null;
  created_at: string;
};

export async function listSchedulePublications() {
  return phase3Request<SchedulePublication[]>("admin_kiosko_staff_schedule_publications", {
    method: "GET",
    query: "?select=*&order=period_starts_on.desc,version.desc",
  });
}

export async function createSchedulePublication(input: {
  organizationId: string;
  locationId?: string | null;
  periodStartsOn: string;
  periodEndsOn: string;
  version: number;
  shiftIds: string[];
  affectedEmployeeIds: string[];
  changeSummary: Record<string, unknown>;
  previousPublicationId?: string | null;
  actorUserId?: string | null;
  publish?: boolean;
}) {
  const result = await phase3Request<SchedulePublication[]>("admin_kiosko_staff_schedule_publications", {
    method: "POST",
    body: JSON.stringify({
      organization_id: input.organizationId,
      location_id: input.locationId || null,
      period_starts_on: input.periodStartsOn,
      period_ends_on: input.periodEndsOn,
      version: input.version,
      published_at: input.publish ? new Date().toISOString() : null,
      published_by: input.actorUserId || null,
      shift_ids: input.shiftIds,
      affected_employee_ids: input.affectedEmployeeIds,
      change_summary: input.changeSummary,
      previous_publication_id: input.previousPublicationId || null,
      status: input.publish ? "published" : "draft",
      effective_at: input.publish ? new Date().toISOString() : null,
    }),
    headers: { Prefer: "return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}

export async function createSchedulePublicationChange(input: {
  publicationId: string;
  organizationId: string;
  shiftId?: string | null;
  changeType: string;
  beforeData: Record<string, unknown>;
  afterData: Record<string, unknown>;
  actorUserId?: string | null;
  reason?: string | null;
}) {
  const result = await phase3Request<SchedulePublicationChange[]>("admin_kiosko_staff_schedule_publication_changes", {
    method: "POST",
    body: JSON.stringify({
      publication_id: input.publicationId,
      organization_id: input.organizationId,
      shift_id: input.shiftId || null,
      change_type: input.changeType,
      before_data: input.beforeData,
      after_data: input.afterData,
      actor_user_id: input.actorUserId || null,
      reason: input.reason || null,
    }),
    headers: { Prefer: "return=representation" },
  });
  if (!result.ok) return result;
  return { ok: true as const, data: result.data[0] };
}
