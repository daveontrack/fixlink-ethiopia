import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { getPostAuthRedirect } from "@/lib/auth/redirects";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const user = await getCurrentUser();
  return NextResponse.redirect(
    new URL(getPostAuthRedirect(user?.role), request.url),
  );
}
