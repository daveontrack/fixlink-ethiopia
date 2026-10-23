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
    <footer className="border-t border-border bg-muted/30">
      <div className="container mx-auto grid gap-10 px-4 py-12 md:grid-cols-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 font-semibold">
            <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Wrench className="size-5" aria-hidden />
            </span>
            {APP_NAME}
          </div>
          <p className="text-sm text-muted-foreground">{APP_TAGLINE}</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <MapPin className="size-4" aria-hidden /> Diredawa, Ethiopia
            </li>
            <li className="flex items-center gap-2">
              <Phone className="size-4" aria-hidden /> +251 91 000 0000
            </li>
            <li className="flex items-center gap-2">
              <Mail className="size-4" aria-hidden /> hello@fixlink.et
            </li>
          </ul>
        </div>

        {FOOTER_LINKS.map((column) => (
          <div key={column.title}>
            <h3 className="text-sm font-semibold">{column.title}</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border py-6">
        <div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 text-xs text-muted-foreground sm:flex-row">
          <p>
            © {new Date().getFullYear()} {APP_NAME}. Built in Diredawa, Ethiopia.
          </p>
          <p>All prices are quoted in Ethiopian Birr (ETB).</p>
        </div>
      </div>
    </footer>
  );
}
