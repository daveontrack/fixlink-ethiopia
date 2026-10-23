"use client";

import { useState } from "react";
import { BriefcaseBusiness, UserRound } from "lucide-react";
import { SignUp } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { POST_AUTH_REDIRECT } from "@/lib/auth/redirects";

type Role = "customer" | "professional";
const SIGNUP_ROLE_KEY = "fixlink-signup-role";

export default function SignUpPage() {
  const [role, setRole] = useState<Role | null>(null);

  function selectRole(nextRole: Role) {
    // This only prefills the post-auth onboarding choice. The server validates
    // and writes the selected role to profiles before granting dashboard access.
    window.sessionStorage.setItem(SIGNUP_ROLE_KEY, nextRole);
    setRole(nextRole);
  }

  if (!role) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-1 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
            <p className="text-sm text-muted-foreground">
              How will you use FixLink?
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card
              role="button"
              tabIndex={0}
              onClick={() => selectRole("customer")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  selectRole("customer");
                }
              }}
              className="hover-lift cursor-pointer rounded-2xl shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              <CardHeader>
                <span className="grid size-10 place-items-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-100">
                  <UserRound className="size-5" aria-hidden />
                </span>
                <CardTitle className="text-lg">Customer</CardTitle>
                <CardDescription>Hire professionals for your home.</CardDescription>
              </CardHeader>
            </Card>
            <Card
              role="button"
              tabIndex={0}
              onClick={() => selectRole("professional")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  selectRole("professional");
                }
              }}
              className="hover-lift cursor-pointer rounded-2xl shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              <CardHeader>
                <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100">
                  <BriefcaseBusiness className="size-5" aria-hidden />
                </span>
                <CardTitle className="text-lg">Professional</CardTitle>
                <CardDescription>Offer services and get work.</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setRole(null)}>
          ← Back
        </Button>
        <SignUp
          fallbackRedirectUrl={POST_AUTH_REDIRECT}
          forceRedirectUrl={POST_AUTH_REDIRECT}
        />
      </div>
    </div>
  );
}
