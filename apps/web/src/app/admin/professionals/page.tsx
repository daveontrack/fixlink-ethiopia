import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { UserAvatar } from "@/components/shared/user-avatar";
import { RatingStars } from "@/components/shared/rating-stars";
import { StatusBadge } from "@/components/shared/status-badge";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { listProfessionals } from "@/services/professionals";

export const metadata: Metadata = { title: "Professionals" };

export default async function AdminProfessionalsPage() {
  await requireAdmin();
  const professionals = await listProfessionals({ pageSize: 100 });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Professionals"
        description="All professionals registered on the marketplace."
      />

      {professionals.data.length === 0 ? (
        <EmptyState title="No professionals yet" description="Professionals appear here once they register." />
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {professionals.data.map((professional) => (
              <div key={professional.id} className="flex items-center gap-3 p-4">
                <UserAvatar
                  name={professional.fullName}
                  imageUrl={professional.avatarUrl}
                  className="size-9"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{professional.fullName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {professional.headline ?? "—"} · {professional.city ?? "Diredawa"}
                  </p>
                </div>
                <RatingStars
                  rating={professional.averageRating}
                  count={professional.totalReviews}
                />
                <StatusBadge
                  status={professional.verificationStatus === "approved" ? "accepted" : professional.verificationStatus === "rejected" ? "rejected" : "in_review"}
                  label={professional.verificationStatus.replace("_", " ")}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
