import { type LeaveBalancePeriod, type LeavePolicy } from "../repositories/staff-leave.repository";
import {
  calculateCarryover,
  calculateExpiration,
  calculateMonthlyAccrual,
  calculateProratedAnnualAccrual,
  calculateProjectedBalance,
  roundLeave,
} from "./leave-rules";
import { postLeaveLedgerMovement } from "./leave-balance.service";

export function calculateAccrualForPolicy(input: {
  policy: LeavePolicy;
  period: LeaveBalancePeriod;
  employeeHireDate?: string | null;
  employeeTerminationDate?: string | null;
  monthsWorked?: number;
}) {
  if (input.policy.accrual_method === "manual") return 0;
  if (input.policy.accrual_method === "monthly") {
    return calculateMonthlyAccrual({ annualAmount: input.policy.annual_amount, monthsWorked: input.monthsWorked ?? 12 });
  }
  if (input.policy.prorate_enabled || input.policy.accrual_method === "proportional") {
    return calculateProratedAnnualAccrual({
      annualAmount: input.policy.annual_amount,
      periodStart: input.period.starts_on,
      periodEnd: input.period.ends_on,
      employeeStart: input.employeeHireDate,
      employeeEnd: input.employeeTerminationDate,
    });
  }
  return roundLeave(input.policy.annual_amount);
}

export async function accrueLeavePeriod(input: {
  actorUserId: string | null;
  policy: LeavePolicy;
  period: LeaveBalancePeriod;
  employeeHireDate?: string | null;
  employeeTerminationDate?: string | null;
  monthsWorked?: number;
}) {
  const amount = calculateAccrualForPolicy(input);
  if (!amount) return { ok: true as const, data: null };
  return postLeaveLedgerMovement({
    actorUserId: input.actorUserId,
    period: input.period,
    policy: input.policy,
    movementType: "accrual",
    amount,
    effectiveOn: input.period.starts_on,
    source: "accrual_engine",
    reason: "Devengo calculado por política.",
    idempotencyKey: `accrual:${input.period.id}:${input.policy.id}:${input.period.starts_on}`,
    metadata: { accrualMethod: input.policy.accrual_method },
  });
}

export function calculateCarryoverForNextPeriod(input: {
  policy: LeavePolicy;
  period: LeaveBalancePeriod;
}) {
  const available = calculateProjectedBalance({
    openingBalance: input.period.opening_balance,
    accrued: input.period.accrued_amount,
    consumed: input.period.consumed_amount,
    reserved: input.period.reserved_amount,
    adjusted: input.period.adjusted_amount,
    carriedOver: input.period.carried_over_amount,
    expired: input.period.expired_amount,
  });
  return calculateCarryover({
    available,
    enabled: input.policy.carryover_enabled,
    maxCarryover: input.policy.max_carryover,
  });
}

export function calculateCarryoverExpiration(input: { carriedOver: number; usedCarryover: number }) {
  return calculateExpiration(input);
}
