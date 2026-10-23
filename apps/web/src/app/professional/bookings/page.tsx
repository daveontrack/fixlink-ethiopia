import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { BookingCard } from "@/features/bookings/components/booking-card";
import { requireProfessional } from "@/lib/auth/guards";
import { listBookings } from "@/services/bookings";
import { BOOKING_STATUS_LABEL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Bookings",
};

export default async function ProfessionalBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireProfessional();
  const { status } = await searchParams;

  const bookings = await listBookings({
    professionalId: user.profileId ?? user.clerkUserId,
    status,
    pageSize: 50,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Bookings"
        description="Jobs you have been hired for."
      />

      <div className="flex flex-wrap gap-2">
        <Button asChild variant={status ? "outline" : "secondary"} size="sm">
          <Link href="/professional/bookings">All</Link>
        </Button>
        {Object.entries(BOOKING_STATUS_LABEL).map(([value, label]) => (
          <Button
            key={value}
            asChild
            variant={status === value ? "secondary" : "outline"}
            size="sm"
          >
            <Link href={`/professional/bookings?status=${value}`}>{label}</Link>
          </Button>
        ))}
      </div>

      {bookings.data.length === 0 ? (
        <EmptyState
          title="No bookings yet"
          description="When a customer accepts one of your quotations, a booking appears here."
          action={
            <Button asChild size="sm">
              <Link href="/professional/requests">Browse requests</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {bookings.data.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              counterpartyLabel="Customer"
              href={`/professional/bookings/${booking.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
