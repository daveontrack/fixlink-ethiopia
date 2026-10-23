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
    <div className="space-y-20 bg-[#f8fefc]">
      <section className="relative overflow-hidden border-b border-teal-100/80">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_500px_at_85%_-10%,#ccfbf1,transparent_65%),radial-gradient(700px_360px_at_5%_0%,#e0f2fe,transparent_60%)]"
          aria-hidden
        />
        <div className="container relative mx-auto grid items-center gap-14 px-4 py-16 lg:grid-cols-2 lg:py-24">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-teal-800 shadow-sm backdrop-blur">
              <Sparkles className="size-3.5" aria-hidden />
              Now serving Dire Dawa, Ethiopia
            </span>
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-slate-900 sm:text-5xl xl:text-6xl">
              Book{" "}
              <span className="bg-gradient-to-r from-teal-700 to-emerald-500 bg-clip-text text-transparent">
                trusted home services
              </span>{" "}
              in Dire Dawa
            </h1>
            <p className="max-w-lg text-lg leading-relaxed text-slate-600">
              Post a request, receive quotations from verified local
              professionals and book the job — with clear prices in Ethiopian
              Birr and ratings you can trust.
            </p>
            <div className="flex flex-wrap gap-3">
              <SignUpButton mode="modal" fallbackRedirectUrl="/sign-up/customer">
                <Button size="lg">
                  Get Started
                </Button>
              </SignUpButton>
              <SignInButton mode="modal" fallbackRedirectUrl="/sign-in">
                <Button size="lg" variant="outline">
                  Sign in
                </Button>
              </SignInButton>
            </div>
            <dl className="grid max-w-lg grid-cols-3 gap-6 border-t border-teal-100 pt-6">
              {[
                { label: "Service categories", value: SERVICE_CATEGORIES.length },
                { label: "Verified pros", value: "120+" },
                { label: "Average rating", value: "4.8" },
              ].map((stat) => (
                <div key={stat.label}>
                  <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                    {stat.label}
                  </dt>
                  <dd className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {SERVICE_CATEGORIES.slice(0, 6).map((category, index) => (
              <Link
                key={category.value}
                href={`/services/${category.value}`}
                className="group relative overflow-hidden rounded-2xl border border-teal-100 bg-white/90 p-5 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-teal-300 hover:shadow-xl hover:shadow-teal-900/5"
              >
                <span
                  className="pointer-events-none absolute -right-6 -top-6 size-20 rounded-full bg-teal-50 transition-transform duration-300 group-hover:scale-125"
                  aria-hidden
                />
                <div className="relative flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-100 transition-colors group-hover:bg-teal-600 group-hover:text-white">
                    <Wrench className="size-5" aria-hidden />
                  </span>
                  <span className="text-[11px] font-semibold tabular-nums text-teal-700/50">
                    0{index + 1}
                  </span>
                </div>
                <p className="relative mt-3 font-semibold tracking-tight text-slate-900">
                  {category.label}
                </p>
                <p className="relative mt-1 text-sm text-slate-500">
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

      <section className="border-y border-teal-100 bg-white/70 py-16">
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
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-700 px-6 py-14 text-center text-white shadow-2xl shadow-teal-900/20">
          <span
            className="pointer-events-none absolute -left-16 -top-16 size-64 rounded-full bg-white/10 blur-3xl"
            aria-hidden
          />
          <span
            className="pointer-events-none absolute -bottom-24 right-0 size-72 rounded-full bg-emerald-400/20 blur-3xl"
            aria-hidden
          />
          <h2 className="relative text-3xl font-semibold tracking-tight sm:text-4xl">
            Ready to get it done?
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-teal-50/90">
            Create an account and choose your role — it is free for customers.
          </p>
          <div className="relative mt-7 flex flex-wrap justify-center gap-3">
            <SignUpButton mode="modal" fallbackRedirectUrl="/sign-up/customer">
              <Button
                size="lg"
                className="bg-white text-teal-900 hover:bg-teal-50"
              >
                Get Started
              </Button>
            </SignUpButton>
            <SignInButton mode="modal" fallbackRedirectUrl="/sign-in">
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                Sign in
              </Button>
            </SignInButton>
          </div>
        </div>
      </section>
    </div>
  );
}