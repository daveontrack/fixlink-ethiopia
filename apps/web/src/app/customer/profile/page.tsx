import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/features/profile/components/profile-form";
import { requireCustomer } from "@/lib/auth/guards";
import { getCurrentProfile } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Profile",
};

export default async function CustomerProfilePage() {
  const user = await requireCustomer();
  const profile = await getCurrentProfile();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Profile"
        description="Keep your contact details up to date so professionals can reach you."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-3">
              <UserAvatar
                name={user.fullName}
                imageUrl={user.imageUrl}
                className="size-14"
              />
              <div>
                <p className="font-medium">{user.fullName}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <p className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              Your identity is managed by FIXLINK. Contact support if you need
              to change your email or phone number.
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Personal details</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm
              defaultValues={{
                fullName: profile?.fullName ?? user.fullName,
                phone: profile?.phone ?? "",
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
