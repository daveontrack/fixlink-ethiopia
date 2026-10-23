"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { setAccountStatusAction } from "@/features/admin/account-actions";

export function AccountStatusButtons({
  profileId,
  currentStatus,
}: {
  profileId: string;
  currentStatus: "active" | "suspended" | "closed";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function update(status: "active" | "suspended") {
    setPending(true);
    const result = await setAccountStatusAction(profileId, status);

    if (!result.ok) {
      toast.error(result.error);
    } else {
      toast.success(`Account ${status}.`);
      router.refresh();
    }

    setPending(false);
  }

  return (
    <div className="flex gap-2">
      {currentStatus === "active" ? (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => update("suspended")}
        >
          Suspend
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => update("active")}
        >
          Reinstate
        </Button>
      )}
    </div>
  );
}
