"use server";

import { auth } from "@clerk/nextjs/server";

import { sendMessage } from "@/services/messaging";

export async function sendChatMessage(conversationId: string, body: string) {
  const { userId } = await auth();

  if (!userId) {
    return { ok: false as const, error: "You need to sign in to send messages." };
  }

  const trimmed = body.trim();

  if (!trimmed) {
    return { ok: false as const, error: "Message cannot be empty." };
  }

  const message = await sendMessage({
    conversationId,
    senderId: userId,
    body: trimmed,
  });

  if (!message) {
    return { ok: false as const, error: "Message could not be sent." };
  }

  return { ok: true as const };
}
