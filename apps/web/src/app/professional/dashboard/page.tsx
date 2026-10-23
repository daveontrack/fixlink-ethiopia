import {
  CalendarCheck,
  ClipboardList,
  FileText,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingCard } from "@/features/bookings/components/booking-card";
import { QuotationCard } from "@/features/quotations/components/quotation-card";
import { RequestCard } from "@/features/requests/components/request-card";
import { requireProfessional } from "@/lib/auth/guards";
import { formatCurrency } from "@/lib/format";
import { listBookings } from "@/services/bookings";
import { listQuotations } from "@/services/quotations";
import { listMatchedRequests } from "@/services/requests";

export default async function ProfessionalDashboardPage() {
  const user = await requireProfessional();
  const professionalId = user.profileId ?? user.clerkUserId;

  const [quotations, bookings] = await Promise.all([
    listQuotations({ professionalId, pageSize: 5 }),
    listBookings({ professionalId, pageSize: 5 }),
  ]);

  const [matchedRequests] = await Promise.all([
    listMatchedRequests(professionalId, { pageSize: 5 }),
  ]);

  const earnings = bookings.data
    .filter((booking) => booking.status === "completed")
    .reduce((sum, booking) => sum + booking.totalPrice, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="New requests, your quotations and upcoming jobs."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Matched requests"
          value={matchedRequests.total}
          icon={ClipboardList}
          hint="Requests matched to you"
        />
        <StatCard
          label="Quotations sent"
          value={quotations.total}
          icon={FileText}
          hint="All time"
        />
        <StatCard
          label="Active bookings"
          value={
            bookings.data.filter(
              (booking) =>
                booking.status === "confirmed" ||
                booking.status === "in_progress",
            ).length
          }
          icon={CalendarCheck}
          hint="Confirmed jobs"
        />
        <StatCard
          label="Completed earnings"
          value={formatCurrency(earnings)}
          icon={TrendingUp}
          hint="From finished jobs"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Requests to quote</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/professional/requests">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {matchedRequests.data.length === 0 ? (
              <EmptyState
                title="No matched requests"
                description="No requests matched to your categories yet."
              />
            ) : (
              matchedRequests.data.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  href={`/professional/requests/${request.id}`}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Recent quotations</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/professional/quotations">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {quotations.data.length === 0 ? (
              <EmptyState
                title="No quotations yet"
                description="Quote on an open request to start receiving bookings."
                icon={FileText}
              />
            ) : (
              quotations.data.map((quotation) => (
                <QuotationCard key={quotation.id} quotation={quotation} />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Upcoming jobs</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/professional/bookings">View all</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {bookings.data.length === 0 ? (
            <EmptyState
              title="No bookings yet"
              description="Accepted quotations turn into bookings automatically."
              icon={CalendarCheck}
            />
          ) : (
            bookings.data.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                counterpartyLabel="Customer"
                href={`/professional/bookings/${booking.id}`}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
