import { MessageSquare } from "lucide-react";
import Link from "next/link";

import { UserAvatar } from "@/components/shared/user-avatar";
import { Card, CardContent } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/format";
import type { Conversation } from "@/types";

export function ConversationList({
  conversations,
  activeId,
}: {
  conversations: Conversation[];
  activeId?: string;
}) {
  return (
    <Card>
      <CardContent className="divide-y divide-border p-0">
        {conversations.map((conversation) => (
          <Link
            key={conversation.id}
            href={`?conversation=${conversation.id}`}
            className="flex items-center gap-3 p-4 transition-colors hover:bg-accent/50"
          >
            <UserAvatar
              name={conversation.participantName}
              imageUrl={conversation.participantImage}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {conversation.participantName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {conversation.lastMessage ?? "No messages yet"}
              </p>
            </div>
            <div className="text-right">
              {conversation.lastMessageAt ? (
                <p className="text-xs text-muted-foreground">
                  {formatRelativeTime(conversation.lastMessageAt)}
                </p>
              ) : null}
              {conversation.unreadCount > 0 ? (
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                  <MessageSquare className="size-3" aria-hidden />
                  {conversation.unreadCount}
                </span>
              ) : null}
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
