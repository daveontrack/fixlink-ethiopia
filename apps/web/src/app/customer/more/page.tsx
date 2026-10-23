import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { CUSTOMER_MORE_NAV } from "@/components/layout/navigation";

export const metadata: Metadata = {
  title: "More",
};

export default function CustomerMorePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="More"
        description="Additional pages and account options."
      />

      <Card>
        <CardContent className="divide-y divide-border p-0">
          {CUSTOMER_MORE_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 p-4 transition-colors hover:bg-accent/50"
              >
                <Icon className="size-5 text-muted-foreground" aria-hidden />
                <span className="font-medium">{item.title}</span>
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
