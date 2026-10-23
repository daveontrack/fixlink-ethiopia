"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { setCategoryActiveAction as setCategoryActive } from "@/features/admin/category-actions";

export function CategoryToggle({
  categoryId,
  initialActive,
}: {
  categoryId: string;
  initialActive: boolean;
}) {
  const [active, setActive] = useState(initialActive);
  const [pending, setPending] = useState(false);

  async function handleChange(next: boolean) {
    setPending(true);
    const result = await setCategoryActive(categoryId, next);

    if (!result.ok) {
      toast.error(result.error);
    } else {
      setActive(next);
    }

    setPending(false);
  }

  return <Switch checked={active} onCheckedChange={handleChange} disabled={pending} />;
}
