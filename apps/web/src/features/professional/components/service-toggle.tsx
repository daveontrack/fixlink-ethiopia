"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { toggleProfessionalServiceAction } from "@/features/professional/actions";

export function ServiceToggle({
  serviceId,
  initialActive,
}: {
  serviceId: string;
  initialActive: boolean;
}) {
  const [active, setActive] = useState(initialActive);
  const [pending, setPending] = useState(false);

  async function handleChange(next: boolean) {
    setPending(true);
    const result = await toggleProfessionalServiceAction(serviceId, next);

    if (!result.ok) {
      toast.error(result.error);
      setPending(false);
      return;
    }

    setActive(next);
    setPending(false);
  }

  return <Switch checked={active} onCheckedChange={handleChange} disabled={pending} />;
}
