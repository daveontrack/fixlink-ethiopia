import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ConversationList } from "@/features/messaging/components/conversation-list";
import { MessageThread } from "@/features/messaging/components/message-thread";
import { requireCustomer } from "@/lib/auth/guards";
import { listConversations, listMessages } from "@/services/messaging";

interface PageProps {
  params: Promise<{ conversationId: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { conversationId } = await params;
  return { title: `Conversation ${conversationId.slice(0, 8)}` };
}

export default async function CustomerConversationDetailPage({ params }: PageProps) {
  const { conversationId } = await params;
  const user = await requireCustomer();

  const conversations = await listConversations(
    user.profileId ?? user.clerkUserId,
    "customer",
  );

  const active = conversations.find((item) => item.id === conversationId);
  if (!active) notFound();

  const messages = await listMessages(active.id);

  return (
    <div className="space-y-8">
      <PageHeader
        title={active.participantName}
        description="Private conversation about your booking."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <ConversationList
          conversations={conversations}
          activeId={active.id}
        />

        <Card className="lg:col-span-2">
          <CardContent className="h-[32rem] pt-6">
            <MessageThread
              conversationId={active.id}
              messages={messages}
              currentUserId={user.profileId ?? user.clerkUserId}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
