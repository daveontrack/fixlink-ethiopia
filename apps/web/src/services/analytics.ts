import "server-only";

import { createClerkClient } from "@/lib/supabase/clerk";
import {
  buildAdminOverview,
  emptyAdminAnalyticsSources,
  normalizeAnalyticsRange,
  type AdminAnalyticsSources,
  type AnalyticsDateFilter,
  type AnalyticsDateBounds,
  type AnalyticsSourceName,
  type AdminOverview,
  type ProfileAnalyticsRow,
  type ProfessionalAnalyticsRow,
  type JobRequestAnalyticsRow,
  type BookingAnalyticsRow,
  type QuotationAnalyticsRow,
} from "@/lib/admin/analytics";

const PAGE_SIZE = 500;

type QueryResult<Row> = {
  data: Row[] | null;
  error: { message: string } | null;
};

type QueryFactory<Row> = () => {
  range(from: number, to: number): PromiseLike<QueryResult<Row>>;
};

function applyDateBounds<Query extends {
  gte(column: string, value: string): Query;
  lt(column: string, value: string): Query;
}>(query: Query, bounds: AnalyticsDateBounds): Query {
  let filtered = query;
  if (bounds.fromInclusive) {
    filtered = filtered.gte("created_at", bounds.fromInclusive);
  }
  if (bounds.toExclusive) {
    filtered = filtered.lt("created_at", bounds.toExclusive);
  }
  return filtered;
}

async function fetchAllRows<Row>(factory: QueryFactory<Row>): Promise<Row[]> {
  const rows: Row[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await factory().range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);

    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

async function captureSource<Row>(
  source: AnalyticsSourceName,
  factory: QueryFactory<Row>,
): Promise<{ data: Row[] | null; error: string | null }> {
  try {
    return { data: await fetchAllRows(factory), error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown query error";
    console.warn(`[analytics] ${source} query failed:`, message);
    return { data: null, error: message };
  }
}

export async function getAdminOverview(
  filters: AnalyticsDateFilter = {},
): Promise<AdminOverview> {
  const normalized = normalizeAnalyticsRange(filters);
  if (normalized.error) {
    return buildAdminOverview(emptyAdminAnalyticsSources(), normalized);
  }

  try {
    const supabase = await createClerkClient();
    const [profiles, professionals, jobRequests, bookings, quotations] =
      await Promise.all([
        captureSource<ProfileAnalyticsRow>("profiles", () =>
          applyDateBounds(
            supabase
              .from("profiles")
              .select("id, role, created_at")
              .order("created_at", { ascending: true })
              .order("id", { ascending: true }),
            normalized.bounds,
          ),
        ),
        captureSource<ProfessionalAnalyticsRow>("professionals", () =>
          applyDateBounds(
            supabase
              .from("professionals")
              .select("id, verification_status, created_at")
              .order("created_at", { ascending: true })
              .order("id", { ascending: true }),
            normalized.bounds,
          ),
        ),
        captureSource<JobRequestAnalyticsRow>("jobRequests", () =>
          applyDateBounds(
            supabase
              .from("job_requests")
              .select(
                "id, status, created_at, category:service_categories!job_requests_category_id_fkey(name)",
              )
              .order("created_at", { ascending: true })
              .order("id", { ascending: true }),
            normalized.bounds,
          ),
        ),
        captureSource<BookingAnalyticsRow>("bookings", () =>
          applyDateBounds(
            supabase
              .from("bookings")
              .select("id, status, created_at")
              .order("created_at", { ascending: true })
              .order("id", { ascending: true }),
            normalized.bounds,
          ),
        ),
        captureSource<QuotationAnalyticsRow>("quotations", () =>
          applyDateBounds(
            supabase
              .from("quotations")
              .select("id, status, created_at")
              .order("created_at", { ascending: true })
              .order("id", { ascending: true }),
            normalized.bounds,
          ),
        ),
      ]);

    const sources: AdminAnalyticsSources = {
      profiles,
      professionals,
      jobRequests,
      bookings,
      quotations,
    };

    return buildAdminOverview(sources, normalized);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown analytics error";
    console.error("[analytics] admin overview failed:", message);
    const failedSources = emptyAdminAnalyticsSources();
    for (const source of Object.keys(failedSources) as AnalyticsSourceName[]) {
      failedSources[source].error = message;
    }
    return buildAdminOverview(failedSources, normalized);
  }
}
