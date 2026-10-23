import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { AvailabilityForm } from "@/features/professional/components/availability-form";
import { requireProfessional } from "@/lib/auth/guards";
import { listAvailability } from "@/services/availability";

export const metadata: Metadata = {
  title: "Availability",
};

export default async function ProfessionalAvailabilityPage() {
  const user = await requireProfessional();
  const professionalId = user.profileId ?? user.clerkUserId;

  const slots = await listAvailability(professionalId);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Availability"
        description="Set the days and hours you are available for new jobs."
      />

      <AvailabilityForm
        initialSlots={slots.map((slot) => ({
          weekday: slot.weekday,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isActive: slot.isActive,
        }))}
      />
    </div>
  );
}
