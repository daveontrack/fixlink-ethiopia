import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { getCurrentUser } from "@/lib/auth/session";
import { ROLE_HOME } from "@/lib/constants";
import { OnboardingForm } from "@/features/onboarding/onboarding-form";

export const metadata: Metadata = {
  title: "Get started",
};

export default async function OnboardingPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/sign-in");
  if (user.profileId) redirect(ROLE_HOME[user.role]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="How will you use FIXLINK?"
        description="This decides which dashboard and tools you get. You can contact us later if you want to switch."
      />
      <OnboardingForm />
    </div>
  );
}
