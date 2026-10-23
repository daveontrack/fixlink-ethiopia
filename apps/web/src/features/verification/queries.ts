import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "verification-documents";
const SIGNED_URL_TTL_SECONDS = 300;

export interface VerificationDocument {
  id: string;
  type: string;
  fileName: string;
  uploadedAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
  /** Short-lived signed URL; null when the object is missing. */
  url: string | null;
}

export interface VerificationCase {
  professionalId: string;
  profileId: string;
  fullName: string;
  email: string | null;
  verificationStatus: string;
  documents: VerificationDocument[];
}

async function signedUrl(
  admin: any,
  storagePath: string,
): Promise<string | null> {
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    console.warn("[verification] signed URL failed:", error?.message);
    return null;
  }

  return data.signedUrl;
}

/**
 * Verification cases of the given professionals, with signed links to the
 * private documents. The caller must already have checked authorisation:
 * the result exposes documents of every requested professional.
 */
export async function listVerificationCases(
  professionalIds: string[],
): Promise<VerificationCase[]> {
  if (professionalIds.length === 0) return [];

  const admin = createAdminClient() as any;

  const { data: professionals, error: professionalError } = await admin
    .from("professionals")
    .select("id, profile_id, verification_status")
    .in("id", professionalIds);

  if (professionalError) {
    console.warn(
      "[verification] professionals failed:",
      professionalError.message,
    );
    return [];
  }

  const profileIds = (professionals ?? []).map((row: any) => row.profile_id);
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, email")
    .in("id", profileIds);

  const profileById = new Map<string, any>(
    (profiles ?? []).map((row: any) => [row.id, row]),
  );

  const { data: documents, error: documentError } = await admin
    .from("verification_documents")
    .select(
      "id, professional_id, document_type, storage_path, original_file_name, review_note, reviewed_at, created_at",
    )
    .in("professional_id", professionalIds)
    .order("created_at", { ascending: false });

  if (documentError) {
    console.warn("[verification] documents failed:", documentError.message);
  }

  const documentsByProfessional = new Map<string, VerificationDocument[]>();

  for (const row of documents ?? []) {
    const list = documentsByProfessional.get(row.professional_id) ?? [];
    list.push({
      id: row.id,
      type: row.document_type,
      fileName: row.original_file_name,
      uploadedAt: row.created_at,
      reviewedAt: row.reviewed_at,
      reviewNote: row.review_note,
      url: await signedUrl(admin, row.storage_path),
    });
    documentsByProfessional.set(row.professional_id, list);
  }

  return (professionals ?? []).map((row: any) => {
    const profile = profileById.get(row.profile_id);
    return {
      professionalId: row.id,
      profileId: row.profile_id,
      fullName: profile?.full_name ?? "Professional",
      email: profile?.email ?? null,
      verificationStatus: row.verification_status,
      documents: documentsByProfessional.get(row.id) ?? [],
    };
  });
}

/** The signed-in professional's row, or null before onboarding. */
export async function getOwnVerificationSummary(
  profileId: string,
): Promise<{ professionalId: string; status: string } | null> {
  const admin = createAdminClient() as any;
  const { data, error } = await admin
    .from("professionals")
    .select("id, verification_status")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    console.warn("[verification] own summary failed:", error.message);
    return null;
  }

  return data
    ? { professionalId: data.id, status: data.verification_status }
    : null;
}

/** The signed-in professional's own documents. */
export async function listOwnVerificationDocuments(
  professionalId: string,
): Promise<VerificationDocument[]> {
  const admin = createAdminClient() as any;
  const { data, error } = await admin
    .from("verification_documents")
    .select(
      "id, document_type, storage_path, original_file_name, review_note, reviewed_at, created_at",
    )
    .eq("professional_id", professionalId)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("[verification] own documents failed:", error.message);
    return [];
  }

  const result: VerificationDocument[] = [];
  for (const row of data ?? []) {
    result.push({
      id: row.id,
      type: row.document_type,
      fileName: row.original_file_name,
      uploadedAt: row.created_at,
      reviewedAt: row.reviewed_at,
      reviewNote: row.review_note,
      url: await signedUrl(admin, row.storage_path),
    });
  }
  return result;
}
