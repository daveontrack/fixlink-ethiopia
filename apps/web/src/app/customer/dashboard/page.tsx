import { CalendarCheck, ClipboardList, MessageSquare, Plus, Star } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingCard } from "@/features/bookings/components/booking-card";
import { RequestCard } from "@/features/requests/components/request-card";
import { requireCustomer } from "@/lib/auth/guards";
import { listBookings } from "@/services/bookings";
import { listRequests } from "@/services/requests";

export default async function CustomerDashboardPage() {
  const user = await requireCustomer();
  const customerId = user.profileId ?? user.clerkUserId;

  const [requests, bookings] = await Promise.all([
    listRequests(customerId, { pageSize: 5 }),
    listBookings({ customerId, pageSize: 5 }),
  ]);

  const openRequests = requests.data.filter(
    (request) =>
      request.status === "open" ||
      request.status === "in_review" ||
      request.status === "quoted",
  ).length;

  const upcoming = bookings.data.filter(
    (booking) =>
      booking.status === "confirmed" || booking.status === "pending",
  ).length;

  const spent = bookings.data.reduce(
    (sum, booking) => sum + booking.totalPrice,
    0,
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Track your requests, quotations and upcoming jobs."
        actions={
          <Button asChild>
            <Link href="/customer/requests/new">
              <Plus className="size-4" aria-hidden />
              New request
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Open requests"
          value={openRequests}
          icon={ClipboardList}
          hint="Awaiting quotations"
        />
        <StatCard
          label="Upcoming bookings"
          value={upcoming}
          icon={CalendarCheck}
          hint="Confirmed jobs"
        />
        <StatCard
          label="Total requests"
          value={requests.total}
          icon={Star}
          hint="All time"
        />
        <StatCard
          label="Quoted value"
          value={`ETB ${spent.toLocaleString("en-ET")}`}
          icon={MessageSquare}
          hint="Across recent bookings"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Recent requests</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/customer/requests">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {requests.data.length === 0 ? (
              <EmptyState
                title="No requests yet"
                description="Post your first request and professionals will send you quotations."
                action={
                  <Button asChild size="sm">
                    <Link href="/customer/requests/new">Post a request</Link>
                  </Button>
                }
              />
            ) : (
              requests.data.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Upcoming bookings</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/customer/bookings">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {bookings.data.length === 0 ? (
              <EmptyState
                title="No bookings yet"
                description="Accept a quotation to schedule your first job."
                icon={CalendarCheck}
              />
            ) : (
              bookings.data.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  href={`/customer/bookings/${booking.id}`}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
