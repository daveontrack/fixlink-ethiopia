"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireCustomer } from "@/lib/auth/guards";
import { createReport } from "@/services/reports";

export const reportSchema = z.object({
  bookingId: z.string().uuid().optional().or(z.literal("")),
  reportedUserId: z.string().uuid().optional().or(z.literal("")),
  reason: z.enum([
    "no_show",
    "poor_quality",
    "unsafe",
    "unprofessional",
    "fraud",
    "payment_dispute",
    "other",
  ]),
  details: z
    .string()
    .min(10, "Please describe the issue (at least 10 characters)")
    .max(2000),
});

export type ReportFormValues = z.infer<typeof reportSchema>;

export async function submitReport(values: ReportFormValues) {
  const user = await requireCustomer();
  const parsed = reportSchema.safeParse(values);

  if (!parsed.success) {
    return {
      ok: false as const,
      error: "Please check the form fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  if (!parsed.data.bookingId && !parsed.data.reportedUserId) {
    return {
      ok: false as const,
      error: "A report must reference a booking or a user.",
    };
  }

  const report = await createReport({
    reporterId: user.profileId ?? user.clerkUserId,
    bookingId: parsed.data.bookingId || null,
    reportedUserId: parsed.data.reportedUserId || null,
    reason: parsed.data.reason,
    details: parsed.data.details,
  });

  if (!report) {
    return { ok: false as const, error: "We could not submit your report." };
  }

  revalidatePath("/customer/report");
  return { ok: true as const };
}
