"use server";

import { z } from "zod";

import { createContactMessage } from "@/services/contact";

const contactSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  phone: z.string().max(20).optional().or(z.literal("")),
  subject: z.string().min(3),
  message: z.string().min(20),
});

export type ContactFormValues = z.infer<typeof contactSchema>;

export async function sendContactMessage(values: ContactFormValues) {
  const parsed = contactSchema.safeParse(values);

  if (!parsed.success) {
    return { ok: false as const, error: "Please check the form and try again." };
  }

  const message = await createContactMessage(parsed.data);

  if (!message) {
    return {
      ok: false as const,
      error: "We could not send your message. Please try again later.",
    };
  }

  return { ok: true as const };
}
