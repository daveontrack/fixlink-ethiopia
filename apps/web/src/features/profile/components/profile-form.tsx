"use client";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { SelectField } from "@/components/forms/select-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { TextField } from "@/components/forms/text-field";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { updateProfile, type ProfileFormValues } from "@/features/profile/actions";

const schema = z.object({
  fullName: z.string().min(2).max(120),
  phone: z.string().max(20).optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  subCity: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
});

interface ProfileFormProps {
  defaultValues: {
    fullName: string;
    phone: string;
  };
}

export function ProfileForm({ defaultValues }: ProfileFormProps) {
  const router = useRouter();
  const form = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  async function onSubmit(values: any) {
    const result = await updateProfile(values);

    if (!result.ok) {
      toast.error(result.error);
    } else {
      toast.success("Profile updated.");
      router.refresh();
      router.push("/customer/dashboard");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <TextField name="fullName" label="Full name" required />
        <TextField
          name="phone"
          label="Phone"
          type="tel"
          placeholder="+251 91 234 5678"
        />
        <div className="flex gap-2">
          <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
          <Button type="button" variant="ghost" onClick={() => form.reset()}>
            Reset
          </Button>
        </div>
      </form>
    </Form>
  );
}
