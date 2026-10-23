import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LanguagePreferenceForm } from "@/features/professional/components/language-preference-form";
import { requireProfessional } from "@/lib/auth/guards";
import { getCurrentProfile } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your professional account preferences.",
};

export default async function ProfessionalSettingsPage() {
  await requireProfessional();
  const profile = await getCurrentProfile();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Manage your supported account preferences and find account help."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Language</CardTitle>
          </CardHeader>
          <CardContent>
            {profile ? (
              <LanguagePreferenceForm
                initialLanguage={profile.preferredLanguage}
              />
            ) : (
              <p role="alert" className="text-sm text-destructive">
                Your account preferences are unavailable right now. Refresh the page to try again.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account and support</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sign-in methods and session security are managed by Clerk from the account menu.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/professional/profile">Edit profile</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/professional/verification">Verification</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/professional/report">Report a booking issue</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
