import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingStatusButtons } from "@/features/bookings/components/booking-status-buttons";
import { requireCustomer } from "@/lib/auth/guards";
import { formatCurrency, formatDate } from "@/lib/format";
import { getBooking } from "@/services/bookings";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const booking = await getBooking(id);
  return { title: booking?.title ?? "Booking" };
}

export default async function CustomerBookingDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireCustomer();

  const booking = await getBooking(id);
  if (!booking) notFound();
  if (booking.customerId && booking.customerId !== user.profileId) notFound();

  return (
    <div className="space-y-8">
      <PageHeader
        title={booking.title}
        description={`With ${booking.professionalName}`}
        actions={<StatusBadge status={booking.status} kind="booking" />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Booking details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Date</dt>
                <dd className="font-medium">
                  {formatDate(booking.scheduledDate)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Time</dt>
                <dd className="font-medium">
                  {booking.scheduledTime} ({booking.durationHours}h)
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Address</dt>
                <dd className="font-medium">{booking.address}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Total</dt>
                <dd className="font-medium">
                  {formatCurrency(booking.totalPrice)}
                </dd>
              </div>
            </dl>
            {booking.notes ? (
              <p className="rounded-lg bg-muted/60 p-3 text-muted-foreground">
                {booking.notes}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Professional</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{booking.professionalName}</p>
              {booking.professionalPhone ? (
                <a
                  href={`tel:${booking.professionalPhone}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {booking.professionalPhone}
                </a>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <BookingStatusButtons
                bookingId={booking.id}
                currentStatus={booking.status}
                allowedStatuses={["in_progress", "completed", "cancelled"]}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
