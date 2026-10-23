import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export interface ContactMessageInput {
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
}

/**
 * Store a message sent through the public contact form.
 */
export async function createContactMessage(input: ContactMessageInput) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("contact_messages")
    .insert({
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      subject: input.subject,
      message: input.message,
      is_handled: false,
    })
    .select()
    .single();

  if (error) {
    console.error("[contact] insert failed:", error.message);
    return null;
  }

  return data;
}
