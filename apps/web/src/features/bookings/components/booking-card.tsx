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
    <Card className="hover-lift group rounded-xl border-border/70 py-0 shadow-none">
      <CardContent className="space-y-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {href ? (
              <Link
                href={href}
                className="text-[15px] font-semibold tracking-tight underline-offset-4 transition-colors group-hover:text-[var(--role-ink)] hover:underline"
              >
                {booking.title}
              </Link>
            ) : (
              <p className="text-[15px] font-semibold tracking-tight">
                {booking.title}
              </p>
            )}
            <p className="mt-0.5 text-xs text-muted-foreground">
              {counterpartyLabel}: {booking.professionalName}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={booking.status} kind="booking" />
            <StatusBadge
              status={booking.paymentStatus}
              label={booking.paymentStatus}
              kind="booking"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays
              className="size-3.5 text-[var(--role-accent)]"
              aria-hidden
            />
            {formatDate(booking.scheduledDate)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5 text-[var(--role-accent)]" aria-hidden />
            {booking.scheduledTime} · {booking.durationHours}h
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5 text-[var(--role-accent)]" aria-hidden />
            {booking.address}
          </span>
        </div>

        <div className="flex items-center justify-between border-t border-border/60 pt-3">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Agreed total
          </span>
          <span className="text-sm font-semibold tracking-tight">
            {formatCurrency(booking.totalPrice)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
