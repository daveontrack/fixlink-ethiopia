"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

import { PriceField } from "@/components/forms/price-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { TextField } from "@/components/forms/text-field";
import { TextareaField } from "@/components/forms/textarea-field";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import {
  createQuotationAction,
  quotationSchema,
  type QuotationFormValues,
} from "@/features/quotations/create-actions";
import { formatCurrency } from "@/lib/format";

export function QuotationForm({ requestId }: { requestId: string }) {
  const form = useForm<any>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      requestId,
      lines: [{ description: "", quantity: 1, unitPrice: 0 }],
      transportFee: 0,
      notes: "",
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  const lines = form.watch("lines");
  const subtotal = (lines ?? []).reduce(
    (sum: number, line: any) =>
      sum + Number(line?.quantity ?? 0) * Number(line?.unitPrice ?? 0),
    0,
  );
  const transportFee = Number(form.watch("transportFee") || 0);

  async function onSubmit(values: any) {
    const result = await createQuotationAction(values);

    if (!result.ok) {
      toast.error(result.error);
    } else {
      toast.success("Quotation sent to the customer.");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <input type="hidden" {...form.register("requestId")} />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Line items</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ description: "", quantity: 1, unitPrice: 0 })}
            >
              <Plus className="size-4" aria-hidden />
              Add item
            </Button>
          </div>

          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-[1fr_6rem_9rem_2.5rem] sm:items-end"
            >
              <TextField
                name={`lines.${index}.description`}
                label="Item"
                placeholder="Diagnose and repair the mixer tap"
              />
              <TextField
                name={`lines.${index}.quantity`}
                label="Qty"
                type="number"
                min={1}
                inputMode="numeric"
              />
              <PriceField name={`lines.${index}.unitPrice`} label="Unit price" />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remove item"
                onClick={() => remove(index)}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <PriceField
            name="transportFee"
            label="Transport fee"
            description="Travel and material collection"
          />
          <TextField
            name="validUntil"
            label="Valid until"
            type="date"
            required
          />
        </div>

        <TextareaField
          name="notes"
          label="Notes for the customer"
          placeholder="Materials needed, warranty, preferred time…"
          rows={3}
        />

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-muted/60 p-4">
          <p className="text-sm text-muted-foreground">
            Total including transport
          </p>
          <p className="text-lg font-semibold">
            {formatCurrency(subtotal + transportFee)}
          </p>
        </div>

        <SubmitButton pendingLabel="Sending quotation…">Send quotation</SubmitButton>
      </form>
    </Form>
  );
}
