"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { SubmitButton } from "@/components/forms/submit-button";
import { TextField } from "@/components/forms/text-field";
import { Form } from "@/components/ui/form";
import { updateMatchingConfig } from "@/features/admin/matching-actions";
import {
  matchingConfigSchema,
  type MatchingConfigValues,
} from "@/features/admin/matching-schema";

interface MatchingConfigFormProps {
  defaultValues: MatchingConfigValues;
}

export function MatchingConfigForm({ defaultValues }: MatchingConfigFormProps) {
  const router = useRouter();
  // The resolver coerces the numeric inputs; react-hook-form types the
  // input side as `unknown`, so the form is intentionally untyped here.
  const form = useForm<any>({
    resolver: zodResolver(matchingConfigSchema) as any,
    defaultValues,
  });

  async function onSubmit(values: MatchingConfigValues) {
    const result = await updateMatchingConfig(values);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Matching configuration updated.");
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TextField
            name="batchSize"
            label="Batch size"
            type="number"
            min={1}
            max={50}
            description="Professionals notified per batch (1–50)."
            required
          />
          <TextField
            name="timeoutMinutes"
            label="Match timeout (minutes)"
            type="number"
            min={1}
            max={1440}
            description="How long a match stays open before the next round."
            required
          />
          <TextField
            name="maxExpansionRounds"
            label="Max expansion rounds"
            type="number"
            min={0}
            max={10}
            description="How many times the search radius may widen (0 disables)."
            required
          />
          <TextField
            name="radiusExpansionKm"
            label="Radius expansion (km)"
            type="number"
            step={0.5}
            min={0.1}
            max={100}
            description="Added to the radius at each round."
            required
          />
          <TextField
            name="maxSearchRadiusKm"
            label="Max search radius (km)"
            type="number"
            step={0.5}
            min={0.1}
            max={100}
            description="Hard ceiling for the matching distance."
            required
          />
          <TextField
            name="expirationHours"
            label="Request expiry (hours)"
            type="number"
            min={1}
            max={720}
            description="How long an unanswered request stays open."
            required
          />
          <TextField
            name="maxConcurrentJobs"
            label="Max concurrent jobs"
            type="number"
            min={1}
            max={100}
            description="Active jobs a professional may carry at once."
            required
          />
        </div>

        <SubmitButton pendingLabel="Saving…">Save configuration</SubmitButton>
      </form>
    </Form>
  );
}
