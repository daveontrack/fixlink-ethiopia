import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/features/profile/components/profile-form";
import { ServiceAreaForm } from "@/features/professional/components/service-area-form";
import { requireProfessional } from "@/lib/auth/guards";
import { getCurrentProfile } from "@/lib/auth/session";
import { getOwnServiceArea } from "@/services/professionals";
import { listSubCities } from "@/services/sub-cities";

export const metadata: Metadata = {
  title: "Profile",
};

export default async function ProfessionalProfilePage() {
  const user = await requireProfessional();
  const profile = await getCurrentProfile();
  const [{ data: subCities, error: subCitiesError }, serviceArea] =
    await Promise.all([listSubCities(), getOwnServiceArea(user.profileId)]);

  const subCityOptions = subCities.map((subCity) => ({
    value: subCity.code,
    label: subCity.name,
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Profile"
        description="Keep your public profile up to date so customers can find you."
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
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Service area</CardTitle>
            </CardHeader>
            <CardContent>
              {subCitiesError ? (
                <p role="alert" className="text-sm text-destructive">
                  {subCitiesError} Refresh the page to try again.
                </p>
              ) : subCities.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No service areas are available yet. Please check back shortly
                  or contact support.
                </p>
              ) : (
                <ServiceAreaForm
                  subCities={subCityOptions}
                  defaultSubCityCode={serviceArea?.subCityCode ?? ""}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
