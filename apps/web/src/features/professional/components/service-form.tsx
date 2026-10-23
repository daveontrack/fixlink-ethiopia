"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { PriceField } from "@/components/forms/price-field";
import { SelectField } from "@/components/forms/select-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { TextField } from "@/components/forms/text-field";
import { TextareaField } from "@/components/forms/textarea-field";
import { Form } from "@/components/ui/form";
import {
  createProfessionalServiceAction,
  professionalServiceSchema,
  type ProfessionalServiceFormValues,
} from "@/features/professional/actions";
import type { SelectOption } from "@/types";

// Re-export the schema so the form can import it.
export { professionalServiceSchema } from "@/features/professional/actions";

export function ProfessionalServiceForm({
  categories,
}: {
  categories: SelectOption[];
}) {
  const form = useForm<any>({
    resolver: zodResolver(professionalServiceSchema),
    defaultValues: {
      categoryId: categories[0]?.value ?? "",
      title: "",
      description: "",
      basePrice: 0,
      pricingUnit: "fixed",
    },
  });

  async function onSubmit(values: any) {
    const result = await createProfessionalServiceAction(values);

    if (!result.ok) {
      toast.error(result.error);
    } else {
      toast.success("Service added.");
      form.reset({
        categoryId: categories[0]?.value ?? "",
        title: "",
        description: "",
        basePrice: 0,
        pricingUnit: "fixed",
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <SelectField
          name="categoryId"
          label="Category"
          options={categories}
          required
        />
        <TextField name="title" label="Service title" placeholder="Tap repair" required />
        <TextareaField
          name="description"
          label="Description"
          rows={3}
          placeholder="What is included in this service"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <PriceField name="basePrice" label="Base price" required />
          <SelectField
            name="pricingUnit"
            label="Pricing unit"
            options={[
              { value: "fixed", label: "Fixed price" },
              { value: "hourly", label: "Per hour" },
              { value: "per_meter", label: "Per metre" },
              { value: "per_item", label: "Per item" },
            ]}
            required
          />
        </div>
        <SubmitButton pendingLabel="Adding…">Add service</SubmitButton>
      </form>
    </Form>
  );
}
