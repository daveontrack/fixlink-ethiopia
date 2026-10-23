import type { Metadata } from "next";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ConversationList } from "@/features/messaging/components/conversation-list";
import { MessageThread } from "@/features/messaging/components/message-thread";
import { requireProfessional } from "@/lib/auth/guards";
import { listConversations, listMessages } from "@/services/messaging";

export const metadata: Metadata = {
  title: "Messages",
};

export default async function ProfessionalMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string }>;
}) {
  const user = await requireProfessional();
  const { conversation: activeId } = await searchParams;

  const conversations = await listConversations(
    user.profileId ?? user.clerkUserId,
    "professional",
  );

  const active = activeId
    ? conversations.find((item) => item.id === activeId)
    : undefined;

  const messages = active ? await listMessages(active.id) : [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Messages"
        description="Chat with your customers about requests and jobs."
      />

      {conversations.length === 0 ? (
        <EmptyState
          title="No conversations yet"
          description="Conversations open when a customer messages you about a request."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <ConversationList
            conversations={conversations}
            activeId={active?.id}
          />

          <Card className="lg:col-span-2">
            <CardContent className="h-[32rem] pt-6">
              {active ? (
                <MessageThread
                  conversationId={active.id}
                  messages={messages}
                  currentUserId={user.profileId ?? user.clerkUserId}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Select a conversation to start reading.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
