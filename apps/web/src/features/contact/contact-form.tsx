"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { SubmitButton } from "@/components/forms/submit-button";
import { TextField } from "@/components/forms/text-field";
import { TextareaField } from "@/components/forms/textarea-field";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { sendContactMessage } from "@/features/contact/actions";

const contactSchema = z.object({
  name: z.string().min(2, "Please enter your name"),
  email: z.email("Enter a valid email address"),
  phone: z
    .string()
    .min(7, "Enter a valid phone number")
    .max(20)
    .optional()
    .or(z.literal("")),
  subject: z.string().min(3, "Please add a subject"),
  message: z.string().min(20, "Tell us a little more (20 characters minimum)"),
});

type ContactValues = z.infer<typeof contactSchema>;

export function ContactForm() {
  const form = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", phone: "", subject: "", message: "" },
  });

  async function onSubmit(values: ContactValues) {
    const result = await sendContactMessage(values);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Thanks! We will get back to you shortly.");
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <TextField
          name="name"
          label="Full name"
          placeholder="Abebe Bekele"
          autoComplete="name"
          required
        />
        <TextField
          name="email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
        <TextField
          name="phone"
          label="Phone"
          type="tel"
          placeholder="+251 91 234 5678"
          autoComplete="tel"
        />
        <TextField
          name="subject"
          label="Subject"
          placeholder="Question about a booking"
          required
        />
        <TextareaField
          name="message"
          label="Message"
          placeholder="How can we help?"
          rows={5}
          required
        />
        <SubmitButton pendingLabel="Sending…">Send message</SubmitButton>
      </form>
    </Form>
  );
}
