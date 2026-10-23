"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireProfessional } from "@/lib/auth/guards";
import { createQuotation } from "@/services/quotations";
import { getRequest } from "@/services/requests";

export const quotationSchema = z.object({
  requestId: z.string().uuid(),
  lines: z
    .array(
      z.object({
        description: z.string().min(3, "Describe the work item"),
        quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
        unitPrice: z.coerce.number().min(0, "Price cannot be negative"),
      }),
    )
    .min(1, "Add at least one line item"),
  transportFee: z.coerce.number().min(0).optional().or(z.literal("")),
  // The database CHECK requires 10–2000 characters when a note is present.
  notes: z
    .string()
    .min(10, "Add at least 10 characters or leave the note empty")
    .max(1000)
    .optional()
    .or(z.literal("")),
  validUntil: z.string().min(4, "Choose a valid-until date"),
});

export type QuotationFormValues = z.infer<typeof quotationSchema>;

export async function createQuotationAction(values: QuotationFormValues) {
  const user = await requireProfessional();
  const parsed = quotationSchema.safeParse(values);

  if (!parsed.success) {
    return {
      ok: false as const,
      error: "Please check the quotation details.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const request = await getRequest(parsed.data.requestId);

  if (!request) {
    return { ok: false as const, error: "That request no longer exists." };
  }

  const result = await createQuotation(
    user.profileId ?? user.clerkUserId,
    request.customerId,
    {
      requestId: parsed.data.requestId,
      lines: parsed.data.lines,
      transportFee: parsed.data.transportFee ? Number(parsed.data.transportFee) : 0,
      notes: parsed.data.notes || undefined,
      validUntil: parsed.data.validUntil,
    },
  );

  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }

  revalidatePath("/professional/quotations");
  revalidatePath(`/professional/requests/${parsed.data.requestId}`);

  return { ok: true as const, quotationId: result.quotation.id };
}
