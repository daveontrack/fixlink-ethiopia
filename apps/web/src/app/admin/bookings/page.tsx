import type { Metadata } from "next";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { BookingCard } from "@/features/bookings/components/booking-card";
import { requireAdmin } from "@/lib/auth/guards";
import { listBookings } from "@/services/bookings";

export const metadata: Metadata = { title: "Bookings" };

export default async function AdminBookingsPage() {
  await requireAdmin();
  const bookings = await listBookings({ pageSize: 100 });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Bookings"
        description="All bookings across the marketplace."
      />

      {bookings.data.length === 0 ? (
        <EmptyState title="No bookings yet" description="Bookings appear here once customers accept quotations." />
      ) : (
        <div className="space-y-3">
          {bookings.data.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              href={`/admin/bookings/${booking.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
