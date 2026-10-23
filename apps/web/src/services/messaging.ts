import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Conversation, Message } from "@/types";

export async function listConversations(
  userId: string,
  role: "customer" | "professional" | "admin",
): Promise<Conversation[]> {
  const supabase = (await createClient()) as any;

  const column =
    role === "professional" ? "professional_id" : role === "admin" ? "customer_id" : "customer_id";

  const { data, error } = await supabase
    .from("conversations")
    .select(
      `
      id, request_id, booking_id, customer_id, professional_id,
      last_message, last_message_at, created_at,
      customer:profiles!conversations_customer_id_fkey ( full_name, avatar_url ),
      professional:profiles!conversations_professional_id_fkey ( full_name, avatar_url )
      `,
    )
    .eq(column, userId)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (error) {
    console.warn("[messaging] conversations failed:", error.message);
    return [];
  }

  return ((data ?? []) as unknown[]).map((row) => {
    const r = row as Record<string, unknown>;
    const counterpart =
      role === "professional"
        ? (r.customer as { full_name?: string; avatar_url?: string | null } | null)
        : (r.professional as { full_name?: string; avatar_url?: string | null } | null);

    return {
      id: r.id as string,
      requestId: (r.request_id as string | null) ?? null,
      bookingId: (r.booking_id as string | null) ?? null,
      customerId: r.customer_id as string,
      professionalId: r.professional_id as string,
      participantName: counterpart?.full_name ?? "Participant",
      participantImage: counterpart?.avatar_url ?? null,
      lastMessage: (r.last_message as string | null) ?? null,
      lastMessageAt: (r.last_message_at as string | null) ?? null,
      unreadCount: 0,
    } satisfies Conversation;
  });
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("messages")
    .select(
      `
      id, conversation_id, sender_id, body, attachment_url, is_read, created_at,
      sender:profiles!messages_sender_id_fkey ( full_name )
      `,
    )
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("[messaging] messages failed:", error.message);
    return [];
  }

  return ((data ?? []) as unknown[]).map((row) => {
    const r = row as Record<string, unknown>;
    const sender = r.sender as { full_name?: string } | null;
    return {
      id: r.id as string,
      conversationId: r.conversation_id as string,
      senderId: r.sender_id as string,
      senderName: sender?.full_name ?? "User",
      body: r.body as string,
      attachmentUrl: (r.attachment_url as string | null) ?? null,
      isRead: r.is_read as boolean,
      createdAt: r.created_at as string,
    };
  }) as Message[];
}

export async function sendMessage(input: {
  conversationId: string;
  senderId: string;
  body: string;
  attachmentUrl?: string | null;
}): Promise<Message | null> {
  const supabase = (await createClient()) as any;

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: input.conversationId,
      sender_id: input.senderId,
      body: input.body,
      attachment_url: input.attachmentUrl ?? null,
      is_read: false,
    })
    .select("id, conversation_id, sender_id, body, attachment_url, is_read, created_at")
    .single();

  if (error) {
    console.error("[messaging] send failed:", error.message);
    return null;
  }

  await supabase
    .from("conversations")
    .update({
      last_message: input.body,
      last_message_at: new Date().toISOString(),
    })
    .eq("id", input.conversationId);

  return {
    id: data.id,
    conversationId: data.conversation_id,
    senderId: data.sender_id,
    senderName: "You",
    body: data.body,
    attachmentUrl: data.attachment_url,
    isRead: data.is_read,
    createdAt: data.created_at,
  };
}

export async function ensureConversation(input: {
  requestId?: string | null;
  bookingId?: string | null;
  customerId: string;
  professionalId: string;
}): Promise<Conversation | null> {
  const supabase = (await createClient()) as any;

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      request_id: input.requestId ?? null,
      booking_id: input.bookingId ?? null,
      customer_id: input.customerId,
      professional_id: input.professionalId,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[messaging] conversation failed:", error.message);
    return null;
  }

  return {
    id: data.id,
    requestId: data.request_id,
    bookingId: data.booking_id,
    customerId: data.customer_id,
    professionalId: data.professional_id,
    participantName: "",
    participantImage: null,
    lastMessage: data.last_message,
    lastMessageAt: data.last_message_at,
    unreadCount: 0,
  };
}
