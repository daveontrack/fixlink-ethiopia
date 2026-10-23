import type { Metadata } from "next";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ReportForm } from "@/features/reports/components/report-form";
import { requireProfessional } from "@/lib/auth/guards";
import { listBookings } from "@/services/bookings";

export const metadata: Metadata = { title: "Report a problem" };

export default async function ProfessionalReportPage() {
  const user = await requireProfessional();
  const bookings = await listBookings({
    professionalId: user.profileId ?? user.clerkUserId,
    pageSize: 50,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Report a problem"
        description="Report an issue with a booking. Our team will review it."
      />

      <Card>
        <CardContent className="p-6">
          {bookings.data.length === 0 ? (
            <EmptyState
              title="No bookings to report"
              description="You can report an issue once you have a booking."
            />
          ) : (
            <ReportForm
              bookings={bookings.data.map((booking) => ({
                id: booking.id,
                title: booking.title,
              }))}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
