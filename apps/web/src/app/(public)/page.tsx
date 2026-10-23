import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  ClipboardList,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Star,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { SignInButton, SignUpButton } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RatingStars } from "@/components/shared/rating-stars";
import { UserAvatar } from "@/components/shared/user-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { SERVICE_CATEGORIES } from "@/lib/constants";
import { listProfessionals } from "@/services/professionals";

const STEPS = [
  {
    icon: ClipboardList,
    title: "Post your request",
    description:
      "Describe the job, add photos and set your budget. It takes about two minutes.",
  },
  {
    icon: MessageSquare,
    title: "Compare quotations",
    description:
      "Verified professionals in Diredawa send transparent, itemised quotations.",
  },
  {
    icon: CalendarCheck,
    title: "Book and get it done",
    description:
      "Accept the quotation you like, agree on a date and rate the work afterwards.",
  },
];

const TRUST_POINTS = [
  {
    icon: ShieldCheck,
    title: "Verified professionals",
    description:
      "Every professional submits ID and licence documents that our team reviews.",
  },
  {
    icon: BadgeCheck,
    title: "Transparent pricing",
    description:
      "Itemised quotations with no hidden fees — you approve the price first.",
  },
  {
    icon: MapPin,
    title: "Built for Diredawa",
    description:
      "A local marketplace that understands how services are booked in our city.",
  },
];

export default async function HomePage() {
  const professionals = await listProfessionals({ pageSize: 3 });

  return (
    <div className="space-y-20">
      <section className="border-b border-border bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto grid gap-12 px-4 py-16 lg:grid-cols-2 lg:py-24">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="size-3.5" aria-hidden />
              Now serving Diredawa, Ethiopia
            </span>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Book trusted home services in Diredawa
            </h1>
            <p className="max-w-lg text-lg text-muted-foreground">
              Post a request, receive quotations from verified local professionals and book the job — with clear prices and ratings you can trust.
            </p>
            <div className="flex flex-wrap gap-3">
              <SignInButton mode="modal" fallbackRedirectUrl="/sign-in">
                <Button asChild size="lg" variant="secondary">
                  Sign in
                </Button>
              </SignInButton>
              <SignUpButton mode="modal" fallbackRedirectUrl="/sign-up/customer">
                <Button asChild size="lg" variant="outline">
                  Get Started
                </Button>
              </SignUpButton>
            </div>
            <dl className="grid max-w-lg grid-cols-3 gap-6 pt-4">
              {[
                { label: "Service categories", value: SERVICE_CATEGORIES.length },
                { label: "Verified pros", value: "120+" },
                { label: "Average rating", value: "4.8" },
              ].map((stat) => (
                <div key={stat.label}>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    {stat.label}
                  </dt>
                  <dd className="text-2xl font-semibold">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {SERVICE_CATEGORIES.slice(0, 6).map((category) => (
              <Link
                key={category.value}
                href={`/services/${category.value}`}
                className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-accent/40"
              >
                <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Wrench className="size-5" aria-hidden />
                </span>
                <p className="mt-3 font-medium">{category.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Get matched with a verified professional
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">
              How FIXLINK works
            </h2>
            <p className="mt-2 text-muted-foreground">
              Three simple steps from request to finished job.
            </p>
          </div>
          <Button asChild variant="ghost">
            <Link href="/about#how-it-works">
              Learn more
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </div>

        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.title}>
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-5" aria-hidden />
                      </span>
                      <span className="text-sm font-semibold text-muted-foreground">
                        Step {index + 1}
                      </span>
                    </div>
                    <CardTitle className="text-lg">{step.title}</CardTitle>
                    <CardDescription>{step.description}</CardDescription>
                  </CardHeader>
                </Card>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="border-y border-border bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">
                Top rated professionals
              </h2>
              <p className="mt-2 text-muted-foreground">
                Vetted by our team and rated by customers.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/professionals">See all professionals</Link>
            </Button>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {professionals.data.length === 0 ? (
              <div className="md:col-span-3">
                <EmptyState
                  title="Professionals are being verified"
                  description="Our first batch of Diredawa professionals is completing verification. Check back shortly."
                  icon={Star}
                />
              </div>
            ) : (
              professionals.data.map((professional) => (
                <Card key={professional.id} className="h-full">
                  <CardContent className="flex h-full flex-col gap-4 p-5">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        name={professional.fullName}
                        imageUrl={professional.avatarUrl}
                        className="size-12"
                      />
                      <div>
                        <p className="font-medium">{professional.fullName}</p>
                        <p className="text-sm text-muted-foreground">
                          {professional.headline ?? "Home service professional"}
                        </p>
                      </div>
                    </div>
                    <RatingStars
                      rating={professional.averageRating}
                      count={professional.totalReviews}
                    />
                    <p className="text-sm text-muted-foreground">
                      {professional.completedJobs} jobs completed
                    </p>
                    <Button asChild variant="outline" size="sm" className="mt-auto">
                      <Link href={`/professionals/${professional.id}`}>View profile</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4">
        <div className="grid gap-6 md:grid-cols-3">
          {TRUST_POINTS.map((point) => {
            const Icon = point.icon;
            return (
              <Card key={point.title} className="h-full">
                <CardHeader>
                  <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <CardTitle className="text-lg">{point.title}</CardTitle>
                  <CardDescription>{point.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="container mx-auto px-4 pb-8">
        <div className="rounded-2xl bg-primary px-6 py-12 text-center text-primary-foreground">
          <h2 className="text-3xl font-semibold tracking-tight">
            Ready to get it done?
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-primary-foreground/80">
            Create an account and choose your role — it is free for customers.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <SignInButton mode="modal" fallbackRedirectUrl="/sign-in">
              <Button asChild size="lg" variant="secondary">
                Sign in
              </Button>
            </SignInButton>
            <SignUpButton mode="modal" fallbackRedirectUrl="/sign-up/customer">
              <Button asChild size="lg" variant="outline">
                Get Started
              </Button>
            </SignUpButton>
          </div>
        </div>
      </section>
    </div>
  );
}