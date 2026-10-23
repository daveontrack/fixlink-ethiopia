import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Paginated, TableFilters } from "@/types";

export interface ReportRow {
  id: string;
  reporterId: string;
  reportedUserId: string | null;
  bookingId: string | null;
  reason: string;
  details: string;
  status: string;
  resolution: string | null;
  createdAt: string;
}

export async function listReports(
  reporterId?: string,
  filters: TableFilters = {},
): Promise<Paginated<ReportRow>> {
  const supabase = await createClient();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;

  let query = supabase
    .from("reports")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (reporterId) query = query.eq("reporter_id", reporterId);

  const { data, count, error } = await query;

  if (error) {
    console.warn("[reports] list failed:", error.message);
    return { data: [], page, pageSize, total: 0, totalPages: 0 };
  }

  return {
    data: ((data ?? []) as unknown[]).map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: r.id as string,
        reporterId: r.reporter_id as string,
        reportedUserId: (r.reported_user_id as string | null) ?? null,
        bookingId: (r.booking_id as string | null) ?? null,
        reason: r.reason as string,
        details: r.details as string,
        status: r.status as string,
        resolution: (r.resolution as string | null) ?? null,
        createdAt: r.created_at as string,
      };
    }),
    page,
    pageSize,
    total: count ?? 0,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  };
}

export async function createReport(input: {
  reporterId: string;
  reportedUserId?: string | null;
  bookingId?: string | null;
  reason: string;
  details: string;
}): Promise<{ id: string } | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reports")
    .insert({
      reporter_id: input.reporterId,
      reported_user_id: input.reportedUserId ?? null,
      booking_id: input.bookingId ?? null,
      reason: input.reason,
      details: input.details,
      status: "open",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[reports] create failed:", error.message);
    return null;
  }

  return { id: (data as { id: string }).id };
}
