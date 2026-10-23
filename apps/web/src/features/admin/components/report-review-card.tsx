"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { updateReportStatus } from "@/features/admin/report-actions";

export function ReportReviewCard({
  report,
}: {
  report: {
    id: string;
    reason: string;
    details: string;
    status: string;
    bookingId: string | null;
    createdAt: string;
  };
}) {
  const [pending, setPending] = useState<string | null>(null);

  async function update(status: string) {
    setPending(status);
    const result = await updateReportStatus(report.id, status);

    if (!result.ok) {
      toast.error(result.error);
    } else {
      toast.success(`Report marked as ${status}.`);
    }

    setPending(null);
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="font-medium capitalize">{report.reason.replace("_", " ")}</p>
          <StatusBadge status={report.status} label={report.status} />
        </div>
        <p className="text-sm text-muted-foreground">{report.details}</p>
        {report.bookingId ? (
          <p className="text-xs text-muted-foreground">
            Booking: {report.bookingId}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {["investigating", "resolved", "dismissed"].map((status) => (
            <Button
              key={status}
              size="sm"
              variant="outline"
              disabled={pending !== null}
              onClick={() => update(status)}
            >
              {status}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
