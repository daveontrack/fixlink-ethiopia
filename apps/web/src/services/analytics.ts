import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface AdminOverview {
  totals: {
    customers: number;
    professionals: number;
    openRequests: number;
    activeBookings: number;
    revenue: number;
  };
  requestsByStatus: Array<{ status: string; count: number }>;
  bookingsByMonth: Array<{ month: string; bookings: number; revenue: number }>;
  topCategories: Array<{ name: string; requests: number }>;
}

const EMPTY_OVERVIEW: AdminOverview = {
  totals: {
    customers: 0,
    professionals: 0,
    openRequests: 0,
    activeBookings: 0,
    revenue: 0,
  },
  requestsByStatus: [],
  bookingsByMonth: [],
  topCategories: [],
};

export async function getAdminOverview(): Promise<AdminOverview> {
  const supabase = (await createClient()) as any;

  try {
    const [customers, professionals, openRequests, activeBookings, revenue] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "customer"),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "professional"),
        supabase
          .from("service_requests")
          .select("id", { count: "exact", head: true })
          .in("status", ["open", "in_review", "quoted"]),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .in("status", ["confirmed", "in_progress"]),
        supabase
          .from("bookings")
          .select("total_price")
          .eq("payment_status", "paid"),
      ]);

    const { data: requestRows } = await supabase
      .from("service_requests")
      .select("status");

    const statusCounts = new Map<string, number>();
    for (const row of requestRows ?? []) {
      statusCounts.set(row.status, (statusCounts.get(row.status) ?? 0) + 1);
    }

    const { data: bookingRows } = await supabase
      .from("bookings")
      .select("scheduled_date, total_price");

    const monthCounts = new Map<string, { bookings: number; revenue: number }>();
    for (const row of bookingRows ?? []) {
      const month = row.scheduled_date?.slice(0, 7) ?? "unknown";
      const entry = monthCounts.get(month) ?? { bookings: 0, revenue: 0 };
      entry.bookings += 1;
      entry.revenue += row.total_price ?? 0;
      monthCounts.set(month, entry);
    }

    return {
      totals: {
        customers: customers.count ?? 0,
        professionals: professionals.count ?? 0,
        openRequests: openRequests.count ?? 0,
        activeBookings: activeBookings.count ?? 0,
        revenue: (revenue.data ?? []).reduce(
          (sum: number, row: any) => sum + (row.total_price ?? 0),
          0,
        ),
      },
      requestsByStatus: [...statusCounts.entries()].map(([status, count]) => ({
        status,
        count,
      })),
      bookingsByMonth: [...monthCounts.entries()]
        .map(([month, value]) => ({ month, ...value }))
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-12),
      topCategories: [],
    };
  } catch (error) {
    console.warn("[analytics] overview failed:", error);
    return EMPTY_OVERVIEW;
  }
}
