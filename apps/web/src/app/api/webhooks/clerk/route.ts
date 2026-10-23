import { verifyWebhook } from "@clerk/backend/webhooks";
import { NextResponse, type NextRequest } from "next/server";

import { syncProfile } from "@/lib/auth/profile";

interface ClerkWebhookEvent {
  type: string;
  data: {
    id: string;
    email_addresses?: Array<{ email_address: string }>;
    first_name?: string | null;
    last_name?: string | null;
    image_url?: string | null;
    phone_numbers?: Array<{ phone_number: string }>;
  };
}

export async function POST(request: NextRequest) {
  let event: ClerkWebhookEvent;

  try {
    const verified = await verifyWebhook(request);
    event = verified as ClerkWebhookEvent;
  } catch (error) {
    console.error("[webhook] verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const { type, data } = event;

  if (type === "user.created" || type === "user.updated") {
    const fullName =
      [data.first_name, data.last_name].filter(Boolean).join(" ").trim() ||
      data.email_addresses?.[0]?.email_address ||
      "User";

    // Clerk metadata is not authorization data. Sync only identity fields
    // into an existing profile; onboarding securely creates missing profiles.
    await syncProfile({
      clerkUserId: data.id,
      email: data.email_addresses?.[0]?.email_address ?? "",
      fullName,
      phone: data.phone_numbers?.[0]?.phone_number ?? null,
      imageUrl: data.image_url ?? null,
    });
  }

  return NextResponse.json({ ok: true });
}
