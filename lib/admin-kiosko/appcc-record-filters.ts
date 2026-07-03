export type AppccDatePreset = "7d" | "month" | "current_month" | "previous_month" | "all" | "custom";

export type AppccRecordListFilters = {
  preset: AppccDatePreset;
  dateFrom?: string;
  dateTo?: string;
  subject?: string;
  status?: string;
  source?: string;
};

const validPresets = new Set<AppccDatePreset>(["7d", "month", "current_month", "previous_month", "all", "custom"]);

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function clean(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export function resolveAppccRecordFilters(searchParams?: Record<string, string | string[] | undefined>): AppccRecordListFilters {
  const rawPreset = Array.isArray(searchParams?.period) ? searchParams?.period[0] : searchParams?.period;
  const preset = rawPreset && validPresets.has(rawPreset as AppccDatePreset) ? rawPreset as AppccDatePreset : "all";
  const today = new Date();
  const base: AppccRecordListFilters = {
    preset,
    subject: clean(Array.isArray(searchParams?.subject) ? searchParams?.subject[0] : searchParams?.subject),
    status: clean(Array.isArray(searchParams?.status) ? searchParams?.status[0] : searchParams?.status),
    source: clean(Array.isArray(searchParams?.source) ? searchParams?.source[0] : searchParams?.source),
  };

  if (preset === "7d") {
    return { ...base, dateFrom: formatDate(addDays(today, -6)), dateTo: formatDate(today) };
  }

  if (preset === "month") {
    return { ...base, dateFrom: formatDate(addDays(today, -30)), dateTo: formatDate(today) };
  }

  if (preset === "current_month") {
    return { ...base, dateFrom: formatDate(startOfMonth(today)), dateTo: formatDate(today) };
  }

  if (preset === "previous_month") {
    const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    return { ...base, dateFrom: formatDate(startOfMonth(previousMonth)), dateTo: formatDate(endOfMonth(previousMonth)) };
  }

  if (preset === "custom") {
    return {
      ...base,
      dateFrom: clean(Array.isArray(searchParams?.dateFrom) ? searchParams?.dateFrom[0] : searchParams?.dateFrom),
      dateTo: clean(Array.isArray(searchParams?.dateTo) ? searchParams?.dateTo[0] : searchParams?.dateTo),
    };
  }

  return base;
}

export function appccSourceFilterValue(source?: string) {
  if (source === "manual") return "admin-kiosko";
  if (source === "sistema_anterior" || source === "importacion") return "APPCC_2026_import";
  return undefined;
}
