import {
  createLeaveBalancePeriod,
  createLeaveLedgerEntry,
  getLeaveBalancePeriodById,
  getLeavePolicyById,
  listLeaveLedgerEntries,
  patchLeaveBalancePeriod,
  type LeaveBalancePeriod,
  type LeaveLedgerEntry,
  type LeavePolicy,
} from "../repositories/staff-leave.repository";
import { writeStaffAuditLog } from "../repositories/staff.repository";
import { calculateProjectedBalance, roundLeave, sanitizeLeaveAuditMetadata } from "./leave-rules";

function periodSnapshot(period: LeaveBalancePeriod) {
  return {
    openingBalance: period.opening_balance,
    accrued: period.accrued_amount,
    consumed: period.consumed_amount,
    reserved: period.reserved_amount,
    adjusted: period.adjusted_amount,
    carriedOver: period.carried_over_amount,
    expired: period.expired_amount,
  };
}

export function getAvailableBalance(period: LeaveBalancePeriod) {
  return calculateProjectedBalance(periodSnapshot(period));
}

export async function createBalancePeriodService(input: {
  actorUserId: string | null;
  organizationId: string;
  employeeId: string;
  policyId: string;
  label: string;
  startsOn: string;
  endsOn: string;
  openingBalance?: number;
}) {
  const created = await createLeaveBalancePeriod({
    organization_id: input.organizationId,
    employee_id: input.employeeId,
    policy_id: input.policyId,
    period_label: input.label,
    starts_on: input.startsOn,
    ends_on: input.endsOn,
    opening_balance: input.openingBalance || 0,
  });
  if (!created.ok) return created;
  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    entityType: "staff_leave_balance_period",
    entityId: created.data.id,
    action: "leave_period_create",
    afterData: created.data,
  });
  return created;
}

export async function postLeaveLedgerMovement(input: {
  actorUserId: string | null;
  period: LeaveBalancePeriod;
  policy: LeavePolicy;
  movementType: LeaveLedgerEntry["movement_type"];
  amount: number;
  effectiveOn: string;
  source: string;
  referenceType?: string | null;
  referenceId?: string | null;
  reversesLedgerId?: string | null;
  reason: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}) {
  if (input.period.status !== "open") return { ok: false as const, error: "El periodo no está abierto." };
  const entry = await createLeaveLedgerEntry({
    organization_id: input.period.organization_id,
    employee_id: input.period.employee_id,
    policy_id: input.period.policy_id,
    period_id: input.period.id,
    movement_type: input.movementType,
    amount: roundLeave(input.amount),
    unit: input.policy.unit,
    effective_on: input.effectiveOn,
    source: input.source,
    reference_type: input.referenceType || null,
    reference_id: input.referenceId || null,
    reverses_ledger_id: input.reversesLedgerId || null,
    actor_user_id: input.actorUserId,
    reason: input.reason,
    metadata: sanitizeLeaveAuditMetadata(input.metadata || {}),
    idempotency_key: input.idempotencyKey,
  });
  if (!entry.ok) return entry;
  await recalculatePeriodFromLedger(input.period.id);
  await writeStaffAuditLog({
    actorUserId: input.actorUserId,
    entityType: "staff_leave_ledger",
    entityId: entry.data?.id || input.idempotencyKey,
    action: `leave_ledger_${input.movementType}`,
    afterData: { movementType: input.movementType, amount: input.amount, unit: input.policy.unit },
    metadata: { idempotencyKey: input.idempotencyKey },
  });
  return entry;
}

export async function recalculatePeriodFromLedger(periodId: string) {
  const [period, ledger] = await Promise.all([getLeaveBalancePeriodById(periodId), listLeaveLedgerEntries(periodId)]);
  if (!period.ok) return period;
  if (!period.data) return { ok: false as const, error: "Periodo no encontrado." };
  if (!ledger.ok) return ledger;
  const totals = ledger.data.reduce((acc, entry) => {
    if (entry.movement_type === "accrual") acc.accrued_amount += entry.amount;
    if (entry.movement_type === "reservation") acc.reserved_amount += entry.amount;
    if (entry.movement_type === "consumption") acc.consumed_amount += entry.amount;
    if (entry.movement_type === "release") acc.reserved_amount -= entry.amount;
    if (entry.movement_type === "adjustment" || entry.movement_type === "reversal") acc.adjusted_amount += entry.amount;
    if (entry.movement_type === "carryover") acc.carried_over_amount += entry.amount;
    if (entry.movement_type === "expiration") acc.expired_amount += entry.amount;
    return acc;
  }, {
    accrued_amount: 0,
    consumed_amount: 0,
    reserved_amount: 0,
    adjusted_amount: 0,
    carried_over_amount: 0,
    expired_amount: 0,
  });
  return patchLeaveBalancePeriod(periodId, totals);
}

export async function reverseLedgerMovement(input: {
  actorUserId: string | null;
  ledgerEntry: LeaveLedgerEntry;
  reason: string;
}) {
  const [period, policy] = await Promise.all([getLeaveBalancePeriodById(input.ledgerEntry.period_id), getLeavePolicyById(input.ledgerEntry.policy_id)]);
  if (!period.ok || !period.data) return { ok: false as const, error: "Periodo no encontrado." };
  if (!policy.ok || !policy.data) return { ok: false as const, error: "Política no encontrada." };
  return postLeaveLedgerMovement({
    actorUserId: input.actorUserId,
    period: period.data,
    policy: policy.data,
    movementType: "reversal",
    amount: -input.ledgerEntry.amount,
    effectiveOn: new Date().toISOString().slice(0, 10),
    source: "regularization",
    referenceType: input.ledgerEntry.reference_type,
    referenceId: input.ledgerEntry.reference_id,
    reversesLedgerId: input.ledgerEntry.id,
    reason: input.reason,
    idempotencyKey: `reversal:${input.ledgerEntry.id}`,
  });
}
