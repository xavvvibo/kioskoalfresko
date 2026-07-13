import {
  createCoverageRequest,
  createShiftOffer,
  createShiftVacancy,
  listOfferRecipients,
  listShiftOffers,
  upsertOfferRecipient,
} from "../repositories/staff-coverage.repository";
import { getStaffEmployeeById, writeStaffAuditLog } from "../repositories/staff.repository";
import { canRespondToOffer } from "./notification-rules";
import { sanitizeOperationalMetadata } from "./availability-rules";

function fail(error: string) {
  return { ok: false as const, error };
}

export async function openShiftVacancy(input: {
  actorUserId: string | null;
  organizationId: string;
  shiftId: string;
  locationId: string;
  roleName?: string | null;
  previousAssignmentId?: string | null;
  reason?: string | null;
  deadlineAt?: string | null;
}) {
  const vacancy = await createShiftVacancy(input);
  if (!vacancy.ok) return vacancy;
  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    entityType: "staff_shift_vacancy",
    entityId: vacancy.data.id,
    action: "shift_vacancy.open",
    afterData: { shift_id: input.shiftId, vacancy_status: vacancy.data.vacancy_status },
    metadata: sanitizeOperationalMetadata({ reason: input.reason || null }),
  });
  return vacancy;
}

export async function openCoverageRequest(input: {
  actorUserId: string | null;
  organizationId: string;
  shiftId?: string | null;
  vacancyId?: string | null;
  locationId?: string | null;
  reason: string;
  urgency?: "low" | "normal" | "high" | "critical";
  deadlineAt?: string | null;
}) {
  const request = await createCoverageRequest(input);
  if (!request.ok) return request;
  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    entityType: "staff_coverage_request",
    entityId: request.data.id,
    action: "coverage.open",
    afterData: { status: request.data.status, urgency: request.data.urgency },
    metadata: sanitizeOperationalMetadata({ reason: input.reason }),
  });
  return request;
}

export async function publishShiftOffer(input: {
  actorUserId: string | null;
  organizationId: string;
  recipientEmployeeIds: string[];
  shiftId?: string | null;
  coverageRequestId?: string | null;
  locationId?: string | null;
  title: string;
  roleName?: string | null;
  startsAt: string;
  endsAt: string;
  notes?: string | null;
  deadlineAt?: string | null;
  priority?: "low" | "normal" | "high" | "urgent";
}) {
  if (new Date(input.endsAt).getTime() <= new Date(input.startsAt).getTime()) return fail("El fin de la oferta debe ser posterior al inicio.");
  const offer = await createShiftOffer({
    ...input,
    idempotencyKey: [input.organizationId, input.shiftId || "manual", input.startsAt, input.title].join(":"),
  });
  if (!offer.ok) return offer;
  for (const employeeId of input.recipientEmployeeIds) {
    await upsertOfferRecipient({
      offerId: offer.data.id,
      organizationId: input.organizationId,
      employeeId,
      offerVersion: offer.data.offer_version,
      shiftSnapshot: { shiftId: input.shiftId || null, startsAt: input.startsAt, endsAt: input.endsAt, roleName: input.roleName || null },
    });
  }
  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    entityType: "staff_shift_offer",
    entityId: offer.data.id,
    action: "shift_offer.publish",
    afterData: { status: offer.data.status, recipients: input.recipientEmployeeIds.length },
    metadata: sanitizeOperationalMetadata({ priority: input.priority || "normal" }),
  });
  return offer;
}

export async function respondToShiftOffer(input: {
  actorUserId: string | null;
  employeeId: string;
  offerId: string;
  response: "accepted" | "declined" | "interested" | "unavailable";
  comment?: string | null;
}) {
  const [employee, offers, recipients] = await Promise.all([
    getStaffEmployeeById(input.employeeId),
    listShiftOffers(input.employeeId),
    listOfferRecipients(input.employeeId),
  ]);
  if (!employee.ok) return employee;
  if (!employee.data?.organization_id) return fail("Empleado sin organización.");
  if (!offers.ok) return offers;
  if (!recipients.ok) return recipients;
  const offer = offers.data.find((item) => item.id === input.offerId);
  const recipient = recipients.data.find((item) => item.offer_id === input.offerId);
  if (!offer || !recipient) return fail("Oferta no disponible para este empleado.");
  const validation = canRespondToOffer({
    offerStatus: offer.status,
    response: input.response,
    deadlineAt: offer.deadline_at,
    alreadyResponded: recipient.response !== "pending",
  });
  if (!validation.ok) return fail(validation.reason);
  const saved = await upsertOfferRecipient({
    offerId: offer.id,
    organizationId: offer.organization_id,
    employeeId: input.employeeId,
    response: input.response,
    comment: input.comment || null,
    offerVersion: offer.offer_version,
    shiftSnapshot: recipient.shift_snapshot,
  });
  if (!saved.ok) return saved;
  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    actorEmployeeId: input.employeeId,
    entityType: "staff_shift_offer",
    entityId: offer.id,
    action: `shift_offer.response.${input.response}`,
    afterData: { response: input.response },
    metadata: sanitizeOperationalMetadata({ comment: input.comment || null }),
  });
  return saved;
}
