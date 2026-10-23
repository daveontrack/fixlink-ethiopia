import { getCurrentUser } from "@/lib/auth/session";
import { NextResponse, type NextRequest } from "next/server";

import { listConversations } from "@/services/messaging";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role =
    user.role === "professional"
      ? "professional"
      : user.role === "admin"
        ? "admin"
        : "customer";

  const conversations = await listConversations(
    user.profileId ?? user.clerkUserId,
    role,
  );

  return NextResponse.json({ data: conversations });
}
