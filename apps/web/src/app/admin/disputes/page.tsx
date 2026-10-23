import type { Metadata } from "next";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { ReportReviewCard } from "@/features/admin/components/report-review-card";
import { requireAdmin } from "@/lib/auth/guards";
import { listReports } from "@/services/reports";

export const metadata: Metadata = { title: "Disputes" };

export default async function AdminDisputesPage() {
  await requireAdmin();
  const reports = await listReports(undefined, { pageSize: 100 });

  const disputes = reports.data.filter((report) =>
    ["payment_dispute", "fraud", "poor_quality"].includes(report.reason),
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Disputes"
        description="Investigate booking-related disputes and disagreements."
      />

      {disputes.length === 0 ? (
        <EmptyState
          title="No disputes"
          description="Dispute-related reports will appear here."
        />
      ) : (
        <div className="space-y-3">
          {disputes.map((report) => (
            <ReportReviewCard key={report.id} report={report} />
          ))}
        </div>
      )}
    </div>
  );
}
