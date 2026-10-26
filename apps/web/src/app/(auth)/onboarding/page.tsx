import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { getPostAuthRedirect } from "@/lib/auth/redirects";
import { OnboardingForm } from "@/features/onboarding/onboarding-form";

export default async function OnboardingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // Do NOT redirect based on stored profile role here.
  // The onboarding form will handle role selection and persist it via completeOnboarding.
  // Redirecting early causes the loop: /onboarding → /customer/dashboard → /onboarding.

  return (
    <div className="space-y-6">
      <PageHeader
        title="How will you use FIXLINK?"
        description="This decides which dashboard and tools you get."
      />
      <OnboardingForm />
    </div>
  );
}