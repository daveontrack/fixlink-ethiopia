import { getCurrentUser } from "@/lib/auth/session";
import { NextResponse, type NextRequest } from "next/server";

import { listBookings } from "@/services/bookings";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const status = url.searchParams.get("status") ?? undefined;

  const filters: Record<string, unknown> = { page, status, pageSize: 20 };

  if (user.role === "customer") filters.customerId = user.profileId ?? user.clerkUserId;
  if (user.role === "professional") filters.professionalId = user.profileId ?? user.clerkUserId;

  const result = await listBookings(filters as Parameters<typeof listBookings>[0]);
  return NextResponse.json({ data: result.data, total: result.total });
}
