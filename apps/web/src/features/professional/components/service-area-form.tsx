"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { SelectField } from "@/components/forms/select-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Form } from "@/components/ui/form";
import { updateServiceAreaAction } from "@/features/professional/actions";
import type { SelectOption } from "@/types";

const schema = z.object({
  subCityCode: z.string().min(1, "Choose your sub-city"),
});

type Values = z.infer<typeof schema>;

interface ServiceAreaFormProps {
  subCities: SelectOption[];
  defaultSubCityCode?: string;
}

export function ServiceAreaForm({
  subCities,
  defaultSubCityCode,
}: ServiceAreaFormProps) {
  const router = useRouter();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { subCityCode: defaultSubCityCode ?? "" },
  });

  async function onSubmit(values: Values) {
    const result = await updateServiceAreaAction(values.subCityCode);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Service area updated.");
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <SelectField
          name="subCityCode"
          label="Base sub-city"
          options={subCities}
          placeholder="Select your sub-city"
          description="Used to match you with nearby requests and to place you on the map."
          required
        />
        <SubmitButton pendingLabel="Saving…">Save service area</SubmitButton>
      </form>
    </Form>
  );
}
