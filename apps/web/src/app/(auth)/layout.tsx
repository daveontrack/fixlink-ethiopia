import { BadgeCheck, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";

import { APP_NAME } from "@/lib/constants";

const HIGHLIGHTS = [
  {
    icon: ShieldCheck,
    title: "Verified professionals",
    description: "ID and licence checks before anyone accepts work.",
  },
  {
    icon: BadgeCheck,
    title: "Clear quotations",
    description: "Itemised prices in Ethiopian Birr, approved by you.",
  },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative flex flex-col items-center justify-center px-4 py-12">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_360px_at_50%_0%,#f0fdfa,transparent_70%)]"
          aria-hidden
        />
        <div className="relative w-full max-w-md space-y-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 font-semibold"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-teal-700 to-emerald-500 text-white shadow-lg shadow-teal-600/25">
              FL
            </span>
            <span className="tracking-tight text-slate-900">{APP_NAME}</span>
          </Link>
          {children}
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-gradient-to-br from-teal-950 via-teal-900 to-emerald-800 lg:block">
        <span
          className="pointer-events-none absolute -right-20 top-10 size-96 rounded-full bg-emerald-400/20 blur-3xl"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute -bottom-24 -left-16 size-80 rounded-full bg-teal-400/10 blur-3xl"
          aria-hidden
        />
        <div className="relative flex h-full flex-col justify-center px-12 text-white xl:px-16">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-teal-50 backdrop-blur">
            <Sparkles className="size-3.5" aria-hidden />
            Dire Dawa service marketplace
          </span>
          <h2 className="mt-6 max-w-md text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
            One marketplace for every home service in Dire Dawa
          </h2>
          <p className="mt-4 max-w-md leading-relaxed text-teal-100/80">
            Post a request, compare quotations from verified professionals and
            book the job in minutes — all in one place.
          </p>

          <ul className="mt-10 space-y-5">
            {HIGHLIGHTS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.title} className="flex gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/10 text-teal-100">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-sm text-teal-100/70">
                      {item.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
