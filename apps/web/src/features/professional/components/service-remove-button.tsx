"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { toggleProfessionalServiceAction } from "@/features/professional/actions";

export function ServiceRemoveButton({ categoryId }: { categoryId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleRemove() {
    setPending(true);
    // Toggle the service to inactive (isActive: false)
    const result = await toggleProfessionalServiceAction(categoryId, false);

    if (!result.ok) {
      toast.error(result.error);
    } else {
      toast.success("Service removed.");
      router.refresh();
    }

    setPending(false);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Remove service"
      disabled={pending}
      onClick={handleRemove}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <Trash2 className="size-4" aria-hidden />
      )}
    </Button>
  );
}
