"use client";

import { useState } from "react";
import { BriefcaseBusiness, UserRound } from "lucide-react";
import { SignUp } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Role = "customer" | "professional";

export default function SignUpPage() {
  const [role, setRole] = useState<Role | null>(null);

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
              onClick={() => setRole("customer")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
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
              onClick={() => setRole("professional")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
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

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setRole(null)}>
          ← Back
        </Button>
        <SignUp
          fallbackRedirectUrl={
            role === "professional"
              ? "/professional/dashboard"
              : "/customer/dashboard"
          }
        />
      </div>
    </div>
  );
}