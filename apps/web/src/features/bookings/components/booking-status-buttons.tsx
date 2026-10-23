"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { changeBookingStatus } from "@/features/bookings/actions";
import type { BookingStatus } from "@/types";

const LABELS: Record<string, string> = {
  in_progress: "Mark in progress",
  completed: "Mark completed",
  cancelled: "Cancel booking",
};

export function BookingStatusButtons({
  bookingId,
  currentStatus,
  allowedStatuses,
}: {
  bookingId: string;
  currentStatus: BookingStatus;
  allowedStatuses: BookingStatus[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  if (allowedStatuses.length === 0) return null;

  async function update(status: BookingStatus) {
    setPending(status);
    const result = await changeBookingStatus(bookingId, status);

    if (!result.ok) {
      toast.error(result.error);
    } else {
      toast.success(`Booking marked as ${status.replace("_", " ")}.`);
      router.refresh();
    }

    setPending(null);
  }

  return (
    <div className="flex flex-col gap-2">
      {allowedStatuses.map((status) => (
        <Button
          key={status}
          size="sm"
          variant={status === "cancelled" ? "outline" : "default"}
          disabled={pending !== null}
          onClick={() => update(status)}
        >
          {LABELS[status] ?? status}
        </Button>
      ))}
    </div>
  );
}
