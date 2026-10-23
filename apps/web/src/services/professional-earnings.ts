import "server-only";

import { createClerkClient } from "@/lib/supabase/clerk";

export interface CompletedBookingValue {
  id: string;
  completedAt: string;
  quotedValueETB: number;
}

type CompletedBookingRow = {
  id: string;
  created_at: string;
  completed_at: string | null;
  quotations: {
    labor_cost_etb: number;
    materials_cost_etb: number;
  } | null;
};

const PAGE_SIZE = 100;

/**
 * Completed booking values are derived from the accepted quotation's ETB
 * amounts. The schema contains no payment settlement records.
 */
export async function listCompletedBookingValues(professionalId: string): Promise<{
  data: CompletedBookingValue[];
  error: string | null;
}> {
  const supabase = await createClerkClient();
  const select =
    "id, created_at, completed_at, quotations!bookings_quotation_id_fkey(labor_cost_etb, materials_cost_etb)";

  const firstPage = await supabase
    .from("bookings")
    .select(select, { count: "exact" })
    .eq("professional_id", professionalId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .range(0, PAGE_SIZE - 1);

  if (firstPage.error) {
    console.warn("[professional earnings] completed values failed:", firstPage.error.message);
    return { data: [], error: "Completed booking values could not be loaded." };
  }

  const total = firstPage.count ?? firstPage.data?.length ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const laterPages = await Promise.all(
    Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) => {
      const start = (index + 1) * PAGE_SIZE;
      return supabase
        .from("bookings")
        .select(select)
        .eq("professional_id", professionalId)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .range(start, start + PAGE_SIZE - 1);
    }),
  );

  const failedPage = laterPages.find((page) => page.error);
  if (failedPage?.error) {
    console.warn("[professional earnings] completed values page failed:", failedPage.error.message);
    return { data: [], error: "Completed booking values could not be loaded." };
  }

  const rows = [
    ...((firstPage.data ?? []) as unknown as CompletedBookingRow[]),
    ...laterPages.flatMap((page) => (page.data ?? []) as unknown as CompletedBookingRow[]),
  ];

  return {
    error: null,
    data: rows.map((row) => ({
      id: row.id,
      completedAt: row.completed_at ?? row.created_at,
      quotedValueETB:
        (row.quotations?.labor_cost_etb ?? 0) +
        (row.quotations?.materials_cost_etb ?? 0),
    })),
  };
}
