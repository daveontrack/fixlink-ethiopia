import type { Metadata } from "next";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { BookingCard } from "@/features/bookings/components/booking-card";
import { requireCustomer } from "@/lib/auth/guards";
import { listBookings } from "@/services/bookings";

export const metadata: Metadata = {
  title: "Job history",
};

export default async function CustomerHistoryPage() {
  const user = await requireCustomer();
  const bookings = await listBookings({
    customerId: user.profileId ?? user.clerkUserId,
    status: "completed",
    pageSize: 50,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Job history"
        description="Your completed services and past bookings."
      />

      {bookings.data.length === 0 ? (
        <EmptyState
          title="No completed jobs yet"
          description="Completed services will appear here for review."
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
