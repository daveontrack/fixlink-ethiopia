import type { Metadata } from "next";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { ReportReviewCard } from "@/features/admin/components/report-review-card";
import { requireAdmin } from "@/lib/auth/guards";
import { listReports } from "@/services/reports";

export const metadata: Metadata = { title: "Reports" };

export default async function AdminReportsPage() {
  await requireAdmin();
  const reports = await listReports(undefined, { pageSize: 100 });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Reports & complaints"
        description="Review reports submitted by customers or professionals."
      />

      {reports.data.length === 0 ? (
        <EmptyState
          title="No reports yet"
          description="Submitted reports will appear here for review."
        />
      ) : (
        <div className="space-y-3">
          {reports.data.map((report) => (
            <ReportReviewCard key={report.id} report={report} />
          ))}
        </div>
      )}
    </div>
  );
}
