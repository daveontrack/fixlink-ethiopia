export type AnalyticsDateFilter = {
  from?: string;
  to?: string;
};

export interface AnalyticsDateRange {
  from: string | null;
  to: string | null;
}

export interface AnalyticsDateBounds extends AnalyticsDateRange {
  fromInclusive: string | null;
  toExclusive: string | null;
}

export const JOB_STATUSES = [
  "open",
  "matching",
  "quoted",
  "booked",
  "in_progress",
  "completed",
  "cancelled",
  "disputed",
  "expired",
] as const;

export const BOOKING_STATUSES = [
  "booked",
  "in_progress",
  "completed",
  "cancelled",
  "disputed",
] as const;

export const QUOTATION_STATUSES = [
  "submitted",
  "selected",
  "declined",
  "expired",
] as const;

export const VERIFICATION_STATUSES = ["pending", "approved", "rejected"] as const;

export type AnalyticsSourceName =
  | "profiles"
  | "professionals"
  | "jobRequests"
  | "bookings"
  | "quotations";

export interface AnalyticsSource<Row> {
  data: readonly Row[] | null;
  error?: string | null;
}

export interface ProfileAnalyticsRow {
  role: string;
  created_at: string | null;
}

export interface ProfessionalAnalyticsRow {
  verification_status: string;
  created_at: string | null;
}

export interface JobRequestAnalyticsRow {
  status: string;
  created_at: string | null;
  category: { name: string } | null;
}

export interface BookingAnalyticsRow {
  status: string;
  created_at: string | null;
}

export interface QuotationAnalyticsRow {
  status: string;
  created_at: string | null;
}

export interface AdminAnalyticsSources {
  profiles: AnalyticsSource<ProfileAnalyticsRow>;
  professionals: AnalyticsSource<ProfessionalAnalyticsRow>;
  jobRequests: AnalyticsSource<JobRequestAnalyticsRow>;
  bookings: AnalyticsSource<BookingAnalyticsRow>;
  quotations: AnalyticsSource<QuotationAnalyticsRow>;
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface AdminOverview {
  range: AnalyticsDateRange;
  filterError: string | null;
  totals: {
    customers: number | null;
    professionals: number | null;
    verifiedProfessionals: number | null;
    pendingVerifications: number | null;
    totalRequests: number | null;
    openRequests: number | null;
    totalBookings: number | null;
    activeBookings: number | null;
    completedBookings: number | null;
    completionRate: number | null;
    totalQuotations: number | null;
    submittedQuotations: number | null;
    selectedQuotations: number | null;
    revenueETB: null;
  };
  requestsByStatus: StatusCount[] | null;
  quotationsByStatus: StatusCount[] | null;
  bookingsByMonth: Array<{ month: string; bookings: number }> | null;
  topCategories: Array<{ name: string; requests: number }> | null;
  unavailableSources: AnalyticsSourceName[];
  revenueUnavailableReason: string;
}

export type NormalizedAnalyticsRange = {
  range: AnalyticsDateRange;
  bounds: AnalyticsDateBounds;
  error: string | null;
};

function isDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function normalizeAnalyticsRange(
  filter: AnalyticsDateFilter = {},
): NormalizedAnalyticsRange {
  const from = filter.from?.trim() || null;
  const to = filter.to?.trim() || null;
  const range = { from, to };

  if ((from && !isDateOnly(from)) || (to && !isDateOnly(to))) {
    return {
      range,
      bounds: { ...range, fromInclusive: null, toExclusive: null },
      error: "Choose valid start and end dates.",
    };
  }

  if (from && to && from > to) {
    return {
      range,
      bounds: { ...range, fromInclusive: null, toExclusive: null },
      error: "The start date must be on or before the end date.",
    };
  }

  const toExclusive = to
    ? new Date(new Date(`${to}T00:00:00.000Z`).getTime() + 86_400_000)
        .toISOString()
    : null;

  return {
    range,
    bounds: {
      ...range,
      fromInclusive: from ? `${from}T00:00:00.000Z` : null,
      toExclusive,
    },
    error: null,
  };
}

function inRange(createdAt: string | null, bounds: AnalyticsDateBounds): boolean {
  if (!bounds.fromInclusive && !bounds.toExclusive) return true;
  if (!createdAt) return false;

  const timestamp = new Date(createdAt).getTime();
  if (Number.isNaN(timestamp)) return false;

  const from = bounds.fromInclusive
    ? new Date(bounds.fromInclusive).getTime()
    : null;
  const to = bounds.toExclusive ? new Date(bounds.toExclusive).getTime() : null;

  return (from === null || timestamp >= from) && (to === null || timestamp < to);
}

function filteredRows<Row extends { created_at: string | null }>(
  source: AnalyticsSource<Row>,
  bounds: AnalyticsDateBounds,
): readonly Row[] | null {
  if (source.data === null || source.error) return null;
  return source.data.filter((row) => inRange(row.created_at, bounds));
}

function statusCounts(
  statuses: readonly string[],
  rows: readonly { status: string }[] | null,
): StatusCount[] | null {
  if (rows === null) return null;
  if (rows.length === 0) return [];

  const counts = new Map(statuses.map((status) => [status, 0]));
  for (const row of rows) {
    counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  }

  return [...counts].map(([status, count]) => ({ status, count }));
}

export function buildAdminOverview(
  sources: AdminAnalyticsSources,
  normalized: NormalizedAnalyticsRange = normalizeAnalyticsRange(),
): AdminOverview {
  const profiles = filteredRows(sources.profiles, normalized.bounds);
  const professionals = filteredRows(sources.professionals, normalized.bounds);
  const requests = filteredRows(sources.jobRequests, normalized.bounds);
  const bookings = filteredRows(sources.bookings, normalized.bounds);
  const quotations = filteredRows(sources.quotations, normalized.bounds);

  const unavailableSources = normalized.error
    ? []
    : (Object.keys(sources) as AnalyticsSourceName[]).filter(
    (source) => sources[source].error || sources[source].data === null,
  );
  const countRole = (role: string) =>
    profiles === null
      ? null
      : profiles.filter((profile) => profile.role === role).length;
  const countVerification = (status: string) =>
    professionals === null
      ? null
      : professionals.filter((professional) => professional.verification_status === status)
          .length;
  const countStatus = (rows: readonly { status: string }[] | null, status: string) =>
    rows === null ? null : rows.filter((row) => row.status === status).length;

  const bookingTotal = bookings?.length ?? null;
  const completedBookings = countStatus(bookings, "completed");
  const completionRate =
    bookingTotal === null || bookingTotal === 0 || completedBookings === null
      ? null
      : Math.round((completedBookings / bookingTotal) * 1000) / 10;

  const monthlyBookings = new Map<string, number>();
  for (const booking of bookings ?? []) {
    if (!booking.created_at) continue;
    const month = booking.created_at.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) continue;
    monthlyBookings.set(month, (monthlyBookings.get(month) ?? 0) + 1);
  }

  const sortedMonthlyBookings = [...monthlyBookings.entries()].sort(([a], [b]) => a.localeCompare(b));
  const displayedMonthlyBookings = normalized.range.from || normalized.range.to
    ? sortedMonthlyBookings
    : sortedMonthlyBookings.slice(-12);
  const categoryCounts = new Map<string, number>();
  for (const request of requests ?? []) {
    const name = request.category?.name?.trim();
    if (name) categoryCounts.set(name, (categoryCounts.get(name) ?? 0) + 1);
  }

  return {
    range: normalized.range,
    filterError: normalized.error,
    totals: {
      customers: countRole("customer"),
      professionals: professionals?.length ?? null,
      verifiedProfessionals: countVerification("approved"),
      pendingVerifications: countVerification("pending"),
      totalRequests: requests?.length ?? null,
      openRequests:
        requests === null
          ? null
          : requests.filter((request) =>
              ["open", "matching", "quoted"].includes(request.status),
            ).length,
      totalBookings: bookingTotal,
      activeBookings:
        bookings === null
          ? null
          : bookings.filter((booking) => ["booked", "in_progress"].includes(booking.status))
              .length,
      completedBookings,
      completionRate,
      totalQuotations: quotations?.length ?? null,
      submittedQuotations: countStatus(quotations, "submitted"),
      selectedQuotations: countStatus(quotations, "selected"),
      revenueETB: null,
    },
    requestsByStatus: statusCounts(JOB_STATUSES, requests),
    quotationsByStatus: statusCounts(QUOTATION_STATUSES, quotations),
    bookingsByMonth:
      bookings === null
        ? null
        : displayedMonthlyBookings.map(([month, count]) => ({ month, bookings: count })),
    topCategories:
      requests === null
        ? null
        : [...categoryCounts.entries()]
            .map(([name, count]) => ({ name, requests: count }))
            .sort((a, b) => b.requests - a.requests || a.name.localeCompare(b.name))
            .slice(0, 5),
    unavailableSources,
    revenueUnavailableReason:
      "Payment and revenue amounts are not stored in the current database schema.",
  };
}

export function emptyAdminAnalyticsSources(): AdminAnalyticsSources {
  return {
    profiles: { data: null },
    professionals: { data: null },
    jobRequests: { data: null },
    bookings: { data: null },
    quotations: { data: null },
  };
}
