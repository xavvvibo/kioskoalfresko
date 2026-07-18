import type { InventoryOpeningOrigin } from "./types.ts";

type DbResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export type CreateOpeningSessionInput = {
  name: string;
  locationNames: string[];
  cutoffAt: string;
  origin: InventoryOpeningOrigin;
  notes?: string;
  createdBy?: string | null;
};

export type CreateInventoryOpeningSessionRpcPayload = {
  p_name: string;
  p_location_names: string[];
  p_cutoff_at: string;
  p_origin: InventoryOpeningOrigin;
  p_notes: string | null;
  p_created_by: string | null;
};

const allowedInventoryOpeningOrigins = new Set<InventoryOpeningOrigin>(["photo_zip", "manual", "mixed"]);
const madridDateTimeLocalPattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

function sanitizeText(value: string, maxLength: number) {
  return value
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function sanitizeLocationName(value: string) {
  return sanitizeText(value, 120);
}

function madridPartsFromUtc(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function sameMadridLocalParts(
  date: Date,
  expected: { year: number; month: number; day: number; hour: number; minute: number; second: number },
) {
  const actual = madridPartsFromUtc(date);
  return actual.year === expected.year
    && actual.month === expected.month
    && actual.day === expected.day
    && actual.hour === expected.hour
    && actual.minute === expected.minute
    && actual.second === expected.second;
}

export function madridDateTimeLocalToUtcIso(value: string): DbResult<string> {
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(value)) {
    return { ok: false, error: "La fecha de corte debe ser datetime-local sin zona horaria." };
  }

  const match = madridDateTimeLocalPattern.exec(value);
  if (!match) {
    return { ok: false, error: "La fecha de corte debe tener formato YYYY-MM-DDTHH:mm." };
  }

  const expected = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6] || 0),
  };
  const localAsUtc = Date.UTC(expected.year, expected.month - 1, expected.day, expected.hour, expected.minute, expected.second);
  const validCalendarDate = new Date(Date.UTC(expected.year, expected.month - 1, expected.day));
  if (
    validCalendarDate.getUTCFullYear() !== expected.year
    || validCalendarDate.getUTCMonth() !== expected.month - 1
    || validCalendarDate.getUTCDate() !== expected.day
    || expected.hour > 23
    || expected.minute > 59
    || expected.second > 59
  ) {
    return { ok: false, error: "La fecha de corte no es válida." };
  }

  const candidates: Date[] = [];
  for (let offsetMinutes = -180; offsetMinutes <= 180; offsetMinutes += 1) {
    const candidate = new Date(localAsUtc + offsetMinutes * 60_000);
    if (sameMadridLocalParts(candidate, expected)) candidates.push(candidate);
  }

  if (candidates.length === 0) {
    return { ok: false, error: "La fecha de corte no existe en Europe/Madrid por cambio horario." };
  }

  candidates.sort((a, b) => a.getTime() - b.getTime());
  return { ok: true, data: candidates[0].toISOString() };
}

export function buildCreateInventoryOpeningSessionRpcPayload(input: CreateOpeningSessionInput): DbResult<CreateInventoryOpeningSessionRpcPayload> {
  const name = sanitizeText(input.name, 160);
  if (!name) return { ok: false, error: "El nombre de la sesión es obligatorio." };

  const cutoffAt = madridDateTimeLocalToUtcIso(input.cutoffAt);
  if (!cutoffAt.ok) return cutoffAt;

  if (!allowedInventoryOpeningOrigins.has(input.origin)) {
    return { ok: false, error: "El origen de la sesión no es válido." };
  }

  const locationNames = Array.from(
    new Set((input.locationNames || []).map(sanitizeLocationName).filter(Boolean)),
  ).slice(0, 20);

  return {
    ok: true,
    data: {
      p_name: name,
      p_location_names: locationNames,
      p_cutoff_at: cutoffAt.data,
      p_origin: input.origin,
      p_notes: input.notes ? sanitizeText(input.notes, 2000) || null : null,
      p_created_by: input.createdBy || null,
    },
  };
}
