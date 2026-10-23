"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { QuotationActions } from "@/features/quotations/components/quotation-card";
import { acceptQuotation, rejectQuotation } from "@/features/quotations/actions";

export function QuotationActionButtons({
  quotationId,
}: {
  quotationId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleAccept() {
    setPending(true);
    const result = await acceptQuotation(quotationId);

    if (!result.ok) {
      toast.error(result.error);
    } else {
      toast.success("Quotation accepted — a booking has been created.");
      router.refresh();
    }

    setPending(false);
  }

  async function handleReject() {
    setPending(true);
    const result = await rejectQuotation(quotationId);

    if (!result.ok) {
      toast.error(result.error);
    } else {
      toast.success("Quotation declined.");
      router.refresh();
    }

    setPending(false);
  }

  return (
    <QuotationActions
      onAccept={handleAccept}
      onReject={handleReject}
      disabled={pending}
    />
  );
}
