"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { saveAvailabilityAction as saveAvailability } from "@/features/professional/availability-actions";
import { cn } from "@/lib/utils";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

interface SlotState {
  weekday: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

const DEFAULT_SLOTS: SlotState[] = DAYS.map((_, weekday) => ({
  weekday,
  startTime: "08:00",
  endTime: "18:00",
  isActive: false,
}));

export function AvailabilityForm({
  initialSlots,
}: {
  initialSlots: SlotState[];
}) {
  const [slots, setSlots] = useState<SlotState[]>(
    initialSlots.length ? initialSlots : DEFAULT_SLOTS,
  );
  const [pending, setPending] = useState(false);

  function updateSlot(weekday: number, patch: Partial<SlotState>) {
    setSlots((current) =>
      current.map((slot) =>
        slot.weekday === weekday ? { ...slot, ...patch } : slot,
      ),
    );
  }

  async function handleSave() {
    setPending(true);
    const result = await saveAvailability(slots);

    if (!result.ok) {
      toast.error(result.error);
    } else {
      toast.success("Availability updated.");
    }

    setPending(false);
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        {slots.map((slot) => (
          <div
            key={slot.weekday}
            className={cn(
              "flex flex-wrap items-center gap-3 rounded-lg border border-border p-3",
              !slot.isActive && "opacity-60",
            )}
          >
            <Switch
              checked={slot.isActive}
              aria-label={`Available on ${DAYS[slot.weekday]}`}
              onCheckedChange={(checked) =>
                updateSlot(slot.weekday, { isActive: checked })
              }
            />
            <span className="w-28 font-medium">{DAYS[slot.weekday]}</span>
            <div className="flex items-center gap-2">
              <input
                type="time"
                aria-label={`${DAYS[slot.weekday]} start time`}
                className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                value={slot.startTime}
                onChange={(event) =>
                  updateSlot(slot.weekday, { startTime: event.target.value })
                }
                disabled={!slot.isActive}
              />
              <span className="text-muted-foreground">to</span>
              <input
                type="time"
                aria-label={`${DAYS[slot.weekday]} end time`}
                className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                value={slot.endTime}
                onChange={(event) =>
                  updateSlot(slot.weekday, { endTime: event.target.value })
                }
                disabled={!slot.isActive}
              />
            </div>
          </div>
        ))}

        <Button onClick={handleSave} disabled={pending}>
          {pending ? "Saving…" : "Save schedule"}
        </Button>
      </CardContent>
    </Card>
  );
}
