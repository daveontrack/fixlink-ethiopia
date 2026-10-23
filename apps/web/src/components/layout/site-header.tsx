"use client";

import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";
import { Menu, Wrench } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

import { PUBLIC_NAV } from "./navigation";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-teal-100/80 bg-white/85 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        >
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-teal-700 to-emerald-500 text-white shadow-lg shadow-teal-600/25">
            <Wrench className="size-5" aria-hidden />
          </span>
          <span className="text-lg tracking-tight text-slate-900">
            {APP_NAME}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {PUBLIC_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-teal-50 text-teal-800"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              {item.title}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Show when="signed-out">
            <SignInButton mode="modal" fallbackRedirectUrl="/sign-in">
              <Button variant="ghost" size="sm" className="text-slate-700">
                Sign in
              </Button>
            </SignInButton>
            <SignUpButton mode="modal" fallbackRedirectUrl="/sign-up/customer">
              <Button size="sm">Get Started</Button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Link
              href="/sign-up"
              className="text-sm font-medium text-teal-800 underline-offset-4 hover:underline"
            >
              Continue signup
            </Link>
          </Show>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden">
              <Menu className="size-5" aria-hidden />
              <span className="sr-only">Toggle navigation</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[288px]">
            <SheetHeader className="text-left">
              <SheetTitle className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-teal-700 to-emerald-500 text-white">
                  <Wrench className="size-4" aria-hidden />
                </span>
                {APP_NAME}
              </SheetTitle>
              <SheetDescription className="sr-only">
                Main navigation
              </SheetDescription>
            </SheetHeader>
            <nav className="mt-6 flex flex-col gap-1" aria-label="Mobile">
              {PUBLIC_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-teal-50 text-teal-800"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  )}
                >
                  {item.title}
                </Link>
              ))}
            </nav>
            <div className="mt-6 flex flex-col gap-2 border-t border-border pt-4">
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <Button variant="outline" className="w-full">
                    Sign in
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button className="w-full">Get Started</Button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                <Link
                  href="/sign-up"
                  className="text-center text-sm font-medium text-teal-800 underline-offset-4 hover:underline"
                >
                  Continue signup
                </Link>
              </Show>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
