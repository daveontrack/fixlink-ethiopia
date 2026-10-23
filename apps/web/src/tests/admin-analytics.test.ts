import { describe, expect, it } from "vitest";

import {
  buildAdminOverview,
  emptyAdminAnalyticsSources,
  normalizeAnalyticsRange,
} from "@/lib/admin/analytics";

function sourceData() {
  const sources = emptyAdminAnalyticsSources();
  sources.profiles = {
    error: null,
    data: [
      { role: "customer", created_at: "2026-01-02T10:00:00.000Z" },
      { role: "professional", created_at: "2026-01-01T10:00:00.000Z" },
      { role: "admin", created_at: "2026-01-02T12:00:00.000Z" },
    ],
  };
  sources.professionals = {
    error: null,
    data: [
      { verification_status: "approved", created_at: "2026-01-02T11:00:00.000Z" },
      { verification_status: "pending", created_at: "2026-01-02T12:00:00.000Z" },
      { verification_status: "rejected", created_at: "2026-01-03T12:00:00.000Z" },
    ],
  };
  sources.jobRequests = {
    error: null,
    data: [
      {
        status: "open",
        created_at: "2026-01-02T13:00:00.000Z",
        category: { name: "Plumbing" },
      },
      {
        status: "matching",
        created_at: "2026-01-02T14:00:00.000Z",
        category: { name: "Plumbing" },
      },
      {
        status: "completed",
        created_at: "2026-01-03T14:00:00.000Z",
        category: { name: "Electrical" },
      },
    ],
  };
  sources.bookings = {
    error: null,
    data: [
      { status: "completed", created_at: "2026-01-02T15:00:00.000Z" },
      { status: "booked", created_at: "2026-01-02T16:00:00.000Z" },
      { status: "in_progress", created_at: "2026-01-03T16:00:00.000Z" },
    ],
  };
  sources.quotations = {
    error: null,
    data: [
      { status: "submitted", created_at: "2026-01-02T17:00:00.000Z" },
      { status: "selected", created_at: "2026-01-02T18:00:00.000Z" },
      { status: "expired", created_at: "2026-01-03T18:00:00.000Z" },
    ],
  };
  return sources;
}

describe("admin analytics calculations", () => {
  it("counts persisted request, booking, quotation, and verification states", () => {
    const overview = buildAdminOverview(sourceData());

    expect(overview.totals).toMatchObject({
      customers: 1,
      professionals: 3,
      verifiedProfessionals: 1,
      pendingVerifications: 1,
      totalRequests: 3,
      openRequests: 2,
      totalBookings: 3,
      activeBookings: 2,
      completedBookings: 1,
      completionRate: 33.3,
      totalQuotations: 3,
      submittedQuotations: 1,
      selectedQuotations: 1,
      revenueETB: null,
    });
    expect(overview.requestsByStatus?.find(({ status }) => status === "open")?.count).toBe(1);
    expect(overview.quotationsByStatus?.find(({ status }) => status === "selected")?.count).toBe(1);
    expect(overview.bookingsByMonth).toEqual([
      { month: "2026-01", bookings: 3 },
    ]);
    expect(overview.topCategories).toEqual([
      { name: "Plumbing", requests: 2 },
      { name: "Electrical", requests: 1 },
    ]);
  });

  it("applies inclusive date-only filters consistently to each source", () => {
    const range = normalizeAnalyticsRange({ from: "2026-01-02", to: "2026-01-02" });
    const overview = buildAdminOverview(sourceData(), range);

    expect(range.bounds.fromInclusive).toBe("2026-01-02T00:00:00.000Z");
    expect(range.bounds.toExclusive).toBe("2026-01-03T00:00:00.000Z");
    expect(overview.totals).toMatchObject({
      customers: 1,
      professionals: 2,
      verifiedProfessionals: 1,
      pendingVerifications: 1,
      totalRequests: 2,
      openRequests: 2,
      totalBookings: 2,
      activeBookings: 1,
      completedBookings: 1,
      completionRate: 50,
      totalQuotations: 2,
      submittedQuotations: 1,
      selectedQuotations: 1,
    });
    expect(overview.topCategories).toEqual([{ name: "Plumbing", requests: 2 }]);
  });

  it("returns honest empty values and a non-applicable completion rate", () => {
    const empty = emptyAdminAnalyticsSources();
    empty.profiles = { data: [], error: null };
    empty.professionals = { data: [], error: null };
    empty.jobRequests = { data: [], error: null };
    empty.bookings = { data: [], error: null };
    empty.quotations = { data: [], error: null };

    const overview = buildAdminOverview(empty);

    expect(overview.unavailableSources).toEqual([]);
    expect(overview.totals).toMatchObject({
      customers: 0,
      professionals: 0,
      totalRequests: 0,
      totalBookings: 0,
      completionRate: null,
      totalQuotations: 0,
      revenueETB: null,
    });
    expect(overview.requestsByStatus).toEqual([]);
    expect(overview.quotationsByStatus).toEqual([]);
    expect(overview.bookingsByMonth).toEqual([]);
    expect(overview.topCategories).toEqual([]);
  });

  it("marks failed sources unavailable instead of showing zero counts", () => {
    const sources = sourceData();
    sources.jobRequests = { data: null, error: "permission denied" };
    sources.bookings = { data: null, error: "timeout" };

    const overview = buildAdminOverview(sources);

    expect(overview.unavailableSources).toEqual(["jobRequests", "bookings"]);
    expect(overview.totals.totalRequests).toBeNull();
    expect(overview.totals.openRequests).toBeNull();
    expect(overview.totals.totalBookings).toBeNull();
    expect(overview.totals.completionRate).toBeNull();
    expect(overview.requestsByStatus).toBeNull();
    expect(overview.bookingsByMonth).toBeNull();
  });

  it("shows the selected booking date range instead of truncating it to twelve months", () => {
    const sources = sourceData();
    sources.bookings = {
      error: null,
      data: Array.from({ length: 13 }, (_, index) => ({
        status: "booked",
        created_at: new Date(Date.UTC(2025, index, 15)).toISOString(),
      })),
    };

    expect(buildAdminOverview(sources).bookingsByMonth).toHaveLength(12);
    expect(
      buildAdminOverview(
        sources,
        normalizeAnalyticsRange({ from: "2025-01-01", to: "2026-01-31" }),
      ).bookingsByMonth,
    ).toHaveLength(13);
  });
  it("rejects impossible and reversed date filters", () => {
    const invalid = normalizeAnalyticsRange({ from: "2026-02-30" });
    expect(invalid.error).toBe("Choose valid start and end dates.");
    expect(buildAdminOverview(emptyAdminAnalyticsSources(), invalid).unavailableSources).toEqual([]);
    expect(
      normalizeAnalyticsRange({ from: "2026-02-10", to: "2026-02-09" }).error,
    ).toBe("The start date must be on or before the end date.");
  });
});
