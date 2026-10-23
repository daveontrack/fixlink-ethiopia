"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin, requireProfessional } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClerkClient } from "@/lib/supabase/clerk";

const BUCKET = "verification-documents";
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];

/**
 * The form uses short names; the database enum uses the official ones.
 */
const DOCUMENT_TYPES = {
  id: "id_card",
  business_license: "business_license",
  certificate: "trade_certificate",
  portfolio: "other",
} as const;

const documentSchema = z.object({
  type: z.enum(["id", "business_license", "certificate", "portfolio"]),
  file: z
    .instanceof(File, { message: "Choose a file to upload" })
    .refine((file) => file.size > 0, "The file is empty")
    .refine((file) => file.size <= MAX_BYTES, "The file must be 10 MB or smaller")
    .refine(
      (file) => ALLOWED_TYPES.includes(file.type),
      "Only JPG, PNG or PDF documents are accepted",
    ),
});

export type DocumentFormType = z.infer<typeof documentSchema>["type"];

/**
 * Submit a verification document.
 *
 * The file goes to the PRIVATE `verification-documents` bucket under
 * `<professionalId>/<uuid>.<ext>` — the layout the storage policies expect —
 * and only the path is stored in `verification_documents`. Nothing is public:
 * the owner and administrators read it through short-lived signed URLs.
 */
export async function submitDocument(formData: FormData) {
  const user = await requireProfessional();

  const parsed = documentSchema.safeParse({
    type: formData.get("type"),
    file: formData.get("file"),
  });

  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Please check the document.",
    };
  }

  if (!user.profileId) {
    return { ok: false as const, error: "Your profile is not ready yet." };
  }

  const admin = createAdminClient() as any;

  const { data: professional, error: professionalError } = await admin
    .from("professionals")
    .select("id, verification_status")
    .eq("profile_id", user.profileId)
    .maybeSingle();

  if (professionalError || !professional) {
    console.error(
      "[verification] professional lookup failed:",
      professionalError?.message,
    );
    return {
      ok: false as const,
      error: "Set up your professional profile before submitting documents.",
    };
  }

  const file = parsed.data.file;
  const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
  const storagePath = `${professional.id}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("[verification] upload failed:", uploadError.message);
    return { ok: false as const, error: "We could not upload the document." };
  }

  const { error: insertError } = await admin
    .from("verification_documents")
    .insert({
      professional_id: professional.id,
      document_type: DOCUMENT_TYPES[parsed.data.type],
      storage_path: storagePath,
      original_file_name: file.name,
    });

  if (insertError) {
    console.error("[verification] insert failed:", insertError.message);
    // Do not leave an orphan object behind when the row cannot be written.
    await admin.storage.from(BUCKET).remove([storagePath]);
    return { ok: false as const, error: "We could not save the document." };
  }

  // A rejected professional who uploads again returns to the review queue.
  if (professional.verification_status !== "approved") {
    const { error: statusError } = await admin
      .from("professionals")
      .update({ verification_status: "pending" })
      .eq("id", professional.id);

    if (statusError) {
      console.error("[verification] status reset failed:", statusError.message);
    }
  }

  revalidatePath("/professional/verification");
  revalidatePath("/admin/verifications");
  return { ok: true as const };
}

const reviewSchema = z.object({
  professionalId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  note: z.string().max(1000).optional(),
});

/**
 * Approve or reject a professional.
 *
 * The decision goes through `set_verification_status()`, a SECURITY DEFINER
 * function that enforces the administrator role, stamps every pending
 * document and writes the audit_log row. It is called with the Clerk-scoped
 * client so `current_profile_id()` / `is_admin()` resolve the caller.
 */
export async function reviewVerification(
  professionalId: string,
  decision: "approved" | "rejected",
  note?: string,
) {
  await requireAdmin();

  const parsed = reviewSchema.safeParse({ professionalId, decision, note });
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid verification decision." };
  }

  const supabase = (await createClerkClient()) as any;
  const { error } = await supabase.rpc("set_verification_status", {
    p_professional_id: parsed.data.professionalId,
    p_decision: parsed.data.decision,
    p_note: parsed.data.note ?? null,
  });

  if (error) {
    console.error("[verification] review failed:", error.message);
    return { ok: false as const, error: "We could not update the verification." };
  }

  revalidatePath("/admin/verifications");
  revalidatePath("/professional/verification");
  return { ok: true as const };
}
