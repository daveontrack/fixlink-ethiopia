import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireCustomer } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Settings" };

export default async function CustomerSettingsPage() {
  await requireCustomer();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Manage your account preferences."
      />

      <Card>
        <CardContent className="space-y-4 p-6 text-sm text-muted-foreground">
          <p>
            Account settings are managed through your Clerk account. Use the
            options below to manage your session.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Update your profile at /customer/profile.</li>
            <li>Sign out using the account menu in the header.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
