"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { SelectField } from "@/components/forms/select-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { TextareaField } from "@/components/forms/textarea-field";
import { TextField } from "@/components/forms/text-field";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { submitReport, reportSchema, type ReportFormValues } from "@/features/reports/actions";

export function ReportForm({
  bookings,
}: {
  bookings: Array<{ id: string; title: string }>;
}) {
  const form = useForm<any>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      bookingId: "",
      reportedUserId: "",
      reason: "poor_quality",
      details: "",
    },
  });

  async function onSubmit(values: any) {
    const result = await submitReport(values);

    if (!result.ok) {
      toast.error(result.error);
    } else {
      toast.success("Report submitted. Our team will review it.");
      form.reset();
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <SelectField
          name="bookingId"
          label="Related booking"
          options={bookings.map((booking) => ({
            value: booking.id,
            label: booking.title,
          }))}
          placeholder="Select a booking (optional)"
        />
        <SelectField
          name="reason"
          label="Reason"
          options={[
            { value: "no_show", label: "No show" },
            { value: "poor_quality", label: "Poor quality" },
            { value: "unsafe", label: "Unsafe" },
            { value: "unprofessional", label: "Unprofessional" },
            { value: "fraud", label: "Fraud" },
            { value: "payment_dispute", label: "Payment dispute" },
            { value: "other", label: "Other" },
          ]}
          required
        />
        <TextareaField
          name="details"
          label="Description"
          placeholder="Describe what happened…"
          rows={5}
          required
        />
        <SubmitButton pendingLabel="Submitting…">Submit report</SubmitButton>
      </form>
    </Form>
  );
}
