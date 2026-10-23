import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { BookingCard } from "@/features/bookings/components/booking-card";
import { requireCustomer } from "@/lib/auth/guards";
import { listBookings } from "@/services/bookings";
import { BOOKING_STATUS_LABEL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "My bookings",
};

export default async function CustomerBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireCustomer();
  const { status } = await searchParams;

  const bookings = await listBookings({
    customerId: user.profileId ?? user.clerkUserId,
    status,
    pageSize: 50,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="My bookings"
        description="Scheduled and completed jobs with your professionals."
      />

      <div className="flex flex-wrap gap-2">
        <Button asChild variant={status ? "outline" : "secondary"} size="sm">
          <Link href="/customer/bookings">All</Link>
        </Button>
        {Object.entries(BOOKING_STATUS_LABEL).map(([value, label]) => (
          <Button
            key={value}
            asChild
            variant={status === value ? "secondary" : "outline"}
            size="sm"
          >
            <Link href={`/customer/bookings?status=${value}`}>{label}</Link>
          </Button>
        ))}
      </div>

      {bookings.data.length === 0 ? (
        <EmptyState
          title="No bookings yet"
          description="Accept a quotation on one of your requests to schedule a job."
          action={
            <Button asChild size="sm">
              <Link href="/customer/requests">View requests</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {bookings.data.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              href={`/customer/bookings/${booking.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
