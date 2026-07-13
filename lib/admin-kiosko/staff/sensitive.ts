const IBAN_VISIBLE_PREFIX = 4;
const IBAN_VISIBLE_SUFFIX = 4;

export const sensitiveProfileFields = new Set([
  "dni_nie",
  "social_security_number",
  "birth_date",
  "address",
  "iban",
  "emergency_contact_name",
  "emergency_contact_phone",
  "salary_gross",
  "estimated_company_cost",
]);

export function maskDni(value?: string | null) {
  if (!value) return "";
  const clean = value.replace(/\s+/g, "");
  if (clean.length <= 4) return "*".repeat(clean.length);
  return `${clean.slice(0, 2)}${"*".repeat(Math.max(2, clean.length - 4))}${clean.slice(-2)}`;
}

export function maskSocialSecurity(value?: string | null) {
  if (!value) return "";
  const clean = value.replace(/\s+/g, "");
  if (clean.length <= 4) return "*".repeat(clean.length);
  return `${"*".repeat(clean.length - 4)}${clean.slice(-4)}`;
}

export function maskIban(value?: string | null) {
  if (!value) return "";
  const clean = value.replace(/\s+/g, "").toUpperCase();
  if (clean.length <= IBAN_VISIBLE_PREFIX + IBAN_VISIBLE_SUFFIX) return "*".repeat(clean.length);
  return `${clean.slice(0, IBAN_VISIBLE_PREFIX)} ${"*".repeat(clean.length - IBAN_VISIBLE_PREFIX - IBAN_VISIBLE_SUFFIX)} ${clean.slice(-IBAN_VISIBLE_SUFFIX)}`;
}

export function sanitizeAuditData(data: Record<string, unknown> | null | undefined) {
  if (!data) return null;
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [
    key,
    sensitiveProfileFields.has(key) && value ? "[sensitive_changed]" : value,
  ]));
}

export function buildSensitiveChangeMetadata(before: Record<string, unknown> | null, after: Record<string, unknown>) {
  const changedFields = Object.keys(after).filter((field) => before?.[field] !== after[field]);
  return {
    changedFields: changedFields.map((field) => sensitiveProfileFields.has(field) ? `${field}:sensitive` : field),
  };
}

export function canEmployeeAccessOwnResource(input: {
  sessionUserId?: string | null;
  employeeAuthUserId?: string | null;
  employeeId: string;
  resourceEmployeeId: string;
  resourceOrganizationId?: string | null;
  employeeOrganizationId?: string | null;
}) {
  return Boolean(
    input.sessionUserId
      && input.employeeAuthUserId === input.sessionUserId
      && input.employeeId === input.resourceEmployeeId
      && (!input.resourceOrganizationId || !input.employeeOrganizationId || input.resourceOrganizationId === input.employeeOrganizationId),
  );
}
