import { Mail, MapPin, Phone, Wrench } from "lucide-react";
import Link from "next/link";

import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

const FOOTER_LINKS = [
  {
    title: "Marketplace",
    links: [
      { label: "Browse services", href: "/services" },
      { label: "Find a professional", href: "/professionals" },
      { label: "How it works", href: "/about#how-it-works" },
    ],
  },
  {
    title: "For professionals",
    links: [
      { label: "Create an account", href: "/sign-up" },
      { label: "Verification", href: "/professional/verification" },
      { label: "Professional dashboard", href: "/professional/dashboard" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About us", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Sign in", href: "/sign-in" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-slate-950 text-slate-300">
      <span
        className="pointer-events-none absolute -top-24 right-0 size-80 rounded-full bg-teal-500/10 blur-3xl"
        aria-hidden
      />
      <div className="container relative mx-auto grid gap-10 px-4 py-14 md:grid-cols-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 font-semibold text-white">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-teal-600 to-emerald-500 shadow-lg shadow-teal-900/40">
              <Wrench className="size-5" aria-hidden />
            </span>
            {APP_NAME}
          </div>
          <p className="text-sm leading-relaxed text-slate-400">{APP_TAGLINE}</p>
          <ul className="space-y-2 text-sm text-slate-400">
            <li className="flex items-center gap-2">
              <MapPin className="size-4 text-teal-400" aria-hidden /> Dire Dawa,
              Ethiopia
            </li>
            <li className="flex items-center gap-2">
              <Phone className="size-4 text-teal-400" aria-hidden /> +251 91 000
              0000
            </li>
            <li className="flex items-center gap-2">
              <Mail className="size-4 text-teal-400" aria-hidden />{" "}
              hello@fixlink.et
            </li>
          </ul>
        </div>

        {FOOTER_LINKS.map((column) => (
          <div key={column.title}>
            <h3 className="text-sm font-semibold text-white">{column.title}</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="transition-colors hover:text-teal-300"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="relative border-t border-white/10 py-6">
        <div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 text-xs text-slate-500 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {APP_NAME}. Built in Dire Dawa,
            Ethiopia.
          </p>
          <p>All prices are quoted in Ethiopian Birr (ETB).</p>
        </div>
      </div>
    </footer>
  );
}
