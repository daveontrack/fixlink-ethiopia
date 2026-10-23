import { CalendarDays, Clock, MapPin } from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Booking } from "@/types";

interface BookingCardProps {
  booking: Booking;
  counterpartyLabel?: string;
  href?: string;
}

export function BookingCard({
  booking,
  counterpartyLabel = "Professional",
  href,
}: BookingCardProps) {
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            {href ? (
              <Link
                href={href}
                className="font-medium underline-offset-4 hover:underline"
              >
                {booking.title}
              </Link>
            ) : (
              <p className="font-medium">{booking.title}</p>
            )}
            <p className="text-sm text-muted-foreground">
              {counterpartyLabel}: {booking.professionalName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={booking.status} kind="booking" />
            <StatusBadge
              status={booking.paymentStatus}
              label={booking.paymentStatus}
              kind="booking"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-3.5" aria-hidden />
            {formatDate(booking.scheduledDate)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden />
            {booking.scheduledTime} · {booking.durationHours}h
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" aria-hidden />
            {booking.address}
          </span>
        </div>

        <p className="text-sm font-semibold">{formatCurrency(booking.totalPrice)}</p>
      </CardContent>
    </Card>
  );
}
