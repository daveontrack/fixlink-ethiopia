import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { listRequests, listOpenRequests } from "@/services/requests";
import { createRequest } from "@/services/requests";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const status = url.searchParams.get("status") ?? undefined;
  const search = url.searchParams.get("search") ?? undefined;

  if (user.role === "professional" || user.role === "admin") {
    const result = await listOpenRequests({ page, status, search, pageSize: 20 });
    return NextResponse.json({ data: result.data, total: result.total });
  }

  const result = await listRequests(user.profileId ?? user.clerkUserId, {
    page,
    status,
    search,
    pageSize: 20,
  });

  return NextResponse.json({ data: result.data, total: result.total });
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getCurrentUser();

  if (user?.role !== "customer") {
    return NextResponse.json({ error: "Only customers can create requests" }, { status: 403 });
  }

  const body = await request.json();
  const created = await createRequest(user.profileId ?? user.clerkUserId, body);

  if (!created) {
    return NextResponse.json({ error: "Could not create request" }, { status: 400 });
  }

  return NextResponse.json({ data: created }, { status: 201 });
}
