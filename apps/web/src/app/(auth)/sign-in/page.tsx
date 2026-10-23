"use client";

import { useState, useEffect } from "react";
import { BriefcaseBusiness, UserRound } from "lucide-react";
import { SignIn } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Role = "customer" | "professional";

export default function SignInPage() {
  const [role, setRole] = useState<Role | null>(null);

  // Read selected role from localStorage on component mount
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("fixlink-selected-role") : null;
    if (stored) {
      setRole(stored as Role);
    }
  }, []);

  if (!role) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-1 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground">
              How will you use FixLink?
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card
              role="button"
              tabIndex={0}
              onClick={() => {
                localStorage.setItem("fixlink-selected-role", "customer");
                setRole("customer");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  localStorage.setItem("fixlink-selected-role", "customer");
                  setRole("customer");
                }
              }}
              className="cursor-pointer transition-colors hover:border-primary/40"
            >
              <CardHeader>
                <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <UserRound className="size-5" aria-hidden />
                </span>
                <CardTitle className="text-lg">Customer</CardTitle>
                <CardDescription>Hire professionals for your home.</CardDescription>
              </CardHeader>
            </Card>
            <Card
              role="button"
              tabIndex={0}
              onClick={() => {
                localStorage.setItem("fixlink-selected-role", "professional");
                setRole("professional");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  localStorage.setItem("fixlink-selected-role", "professional");
                  setRole("professional");
                }
              }}
              className="cursor-pointer transition-colors hover:border-primary/40"
            >
              <CardHeader>
                <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
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

  // Role is set, proceed with Clerk sign-in. The role is persisted to the
  // profile by `completeOnboarding` after the session exists; a client
  // component must never import the Clerk server SDK.
  return (
    <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-4">
        <Button variant="ghost" size="sm" onClick={() => {
          localStorage.removeItem("fixlink-selected-role");
          setRole(null);
        }}>
          ← Back
        </Button>
        <SignIn
          fallbackRedirectUrl={
            role === "professional"
              ? "/professional/dashboard"
              : "/customer/dashboard"
        }/>
      </div>
    </div>
  );
}