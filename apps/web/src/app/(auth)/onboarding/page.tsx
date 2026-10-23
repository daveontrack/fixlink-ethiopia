import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { getCurrentUser } from "@/lib/auth/session";
import { getPostAuthRedirect } from "@/lib/auth/redirects";
import { OnboardingForm } from "@/features/onboarding/onboarding-form";

export default async function OnboardingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await getCurrentUser();

  // The stored profile role wins. Missing profiles proceed through onboarding.
  if (user?.profileId) redirect(getPostAuthRedirect(user.role));

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
