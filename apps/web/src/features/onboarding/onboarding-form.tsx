"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { BriefcaseBusiness, UserRound } from "lucide-react";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { SubmitButton } from "@/components/forms/submit-button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { completeOnboarding } from "@/features/onboarding/actions";
import { cn } from "@/lib/utils";

const schema = z.object({
  role: z.enum(["customer", "professional"]),
});

type Values = z.infer<typeof schema>;

const OPTIONS: Array<{
  role: "customer" | "professional";
  title: string;
  description: string;
  icon: typeof UserRound;
}> = [
  {
    role: "customer",
    title: "I need services",
    description:
      "Post requests, compare quotations and book professionals for your home or business.",
    icon: UserRound,
  },
  {
    role: "professional",
    title: "I offer services",
    description:
      "Receive matching requests, send quotations and grow your client base.",
    icon: BriefcaseBusiness,
  },
];

const SIGNUP_ROLE_KEY = "fixlink-signup-role";

export function OnboardingForm() {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { role: undefined },
  });

  const selected = useWatch({ control: form.control, name: "role" });

  useEffect(() => {
    const pendingRole = window.sessionStorage.getItem(SIGNUP_ROLE_KEY);
    window.sessionStorage.removeItem(SIGNUP_ROLE_KEY);

    if (pendingRole === "customer" || pendingRole === "professional") {
      form.setValue("role", pendingRole, { shouldValidate: true });
    }
  }, [form]);

  async function onSubmit(values: Values) {
    const result = await completeOnboarding({ role: values.role });

    if (!result.ok) {
      toast.error(result.error);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid gap-4 sm:grid-cols-2"
      >
        <input type="hidden" {...form.register("role")} />
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const active = selected === option.role;

          return (
            <Card
              key={option.role}
              role="button"
              tabIndex={0}
              aria-pressed={active}
              onClick={() => {
                form.setValue("role", option.role, { shouldValidate: true });
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  form.setValue("role", option.role, { shouldValidate: true });
                }
              }}
              className={cn(
                "cursor-pointer transition-colors",
                active && "border-primary ring-2 ring-primary/30",
              )}
            >
              <CardHeader>
                <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden />
                </span>
                <CardTitle className="text-lg">{option.title}</CardTitle>
                <CardDescription>{option.description}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}

        <div className="sm:col-span-2">
          <SubmitButton pendingLabel="Setting up…">Continue</SubmitButton>
        </div>
      </form>
    </Form>
  );
}
