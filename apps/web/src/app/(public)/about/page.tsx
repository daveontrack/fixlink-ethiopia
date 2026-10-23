import type { Metadata } from "next";
import { BadgeCheck, ClipboardList, MessageSquare, ShieldCheck, Target } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "About",
  description:
    "FIXLINK is a Diredawa based marketplace that connects households with verified local home service professionals.",
};

const VALUES = [
  {
    icon: ShieldCheck,
    title: "Trust first",
    description:
      "Identity checks, licence verification and customer ratings keep quality high on both sides of the platform.",
  },
  {
    icon: Target,
    title: "Local by design",
    description:
      "We start in Diredawa, learn how the city works and build for Ethiopian homes and businesses.",
  },
  {
    icon: BadgeCheck,
    title: "Fair pricing",
    description:
      "Professionals quote their own work with itemised pricing, so customers always know what they pay.",
  },
];

export default function AboutPage() {
  return (
    <div className="container mx-auto space-y-12 px-4 py-12">
      <PageHeader
        title="About FIXLINK"
        description="We are building the default way to hire home services in Diredawa — safe, quick and transparent."
      />

      <section className="grid gap-6 md:grid-cols-3">
        {VALUES.map((value) => {
          const Icon = value.icon;
          return (
            <Card key={value.title}>
              <CardHeader>
                <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden />
                </span>
                <CardTitle className="text-lg">{value.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section id="how-it-works" className="space-y-6 scroll-mt-20">
        <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: ClipboardList,
              title: "Customers post requests",
              description:
                "Describe the job, share the address and set a budget range. Requests are visible to matching professionals.",
            },
            {
              icon: MessageSquare,
              title: "Professionals quote",
              description:
                "Verified professionals review the request, ask questions in chat and send itemised quotations.",
            },
            {
              icon: BadgeCheck,
              title: "Work is booked and rated",
              description:
                "Accept a quotation, agree a date, then rate the completed job to keep the community honest.",
            },
          ].map((step) => {
            const Icon = step.icon;
            return (
              <Card key={step.title}>
                <CardContent className="space-y-3 p-5">
                  <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <p className="font-medium">{step.title}</p>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
