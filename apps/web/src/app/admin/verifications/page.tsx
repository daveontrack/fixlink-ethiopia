import type { Metadata } from "next";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { VerificationReviewCard } from "@/features/verification/components/verification-review-card";
import { listVerificationCases } from "@/features/verification/queries";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Verifications" };

export default async function AdminVerificationsPage() {
  await requireAdmin();

  const admin = createAdminClient() as any;
  const { data: pendingRows, error } = await admin
    .from("professionals")
    .select("id")
    .eq("verification_status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("[admin] pending verifications failed:", error.message);
  }

  const cases = await listVerificationCases(
    ((pendingRows ?? []) as Array<{ id: string }>).map((row) => row.id),
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Verifications"
        description="Review private documents and approve or reject a professional. Every decision is written to the audit log."
      />

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          We could not load the pending verifications.
        </p>
      ) : cases.length === 0 ? (
        <EmptyState
          title="No pending verifications"
          description="Professionals with submitted documents appear here."
        />
      ) : (
        <div className="space-y-3">
          {cases.map((verificationCase) => (
            <VerificationReviewCard
              key={verificationCase.professionalId}
              verificationCase={verificationCase}
            />
          ))}
        </div>
      )}
    </div>
  );
}
