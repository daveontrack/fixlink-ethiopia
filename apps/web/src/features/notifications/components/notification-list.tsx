import { Bell } from "lucide-react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/types";

export function NotificationList({
  notifications,
}: {
  notifications: AppNotification[];
}) {
  return (
    <Card>
      <CardContent className="divide-y divide-border p-0">
        {notifications.map((notification) => {
          const body = (
            <div className="flex items-start gap-3 p-4">
              <span
                className={cn(
                  "mt-0.5 grid size-8 shrink-0 place-items-center rounded-full",
                  notification.isRead
                    ? "bg-muted text-muted-foreground"
                    : "bg-primary/10 text-primary",
                )}
              >
                <Bell className="size-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-sm",
                    notification.isRead ? "font-normal" : "font-semibold",
                  )}
                >
                  {notification.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  {notification.body}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatRelativeTime(notification.createdAt)}
                </p>
              </div>
            </div>
          );

          return notification.href ? (
            <Link key={notification.id} href={notification.href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ring)]">
              {body}
            </Link>
          ) : (
            <div key={notification.id}>{body}</div>
          );
        })}
      </CardContent>
    </Card>
  );
}
