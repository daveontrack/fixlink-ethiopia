"use client";

import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendChatMessage } from "@/features/messaging/actions";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Message } from "@/types";

interface MessageThreadProps {
  conversationId: string;
  messages: Message[];
  currentUserId: string;
}

export function MessageThread({
  conversationId,
  messages,
  currentUserId,
}: MessageThreadProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    const trimmed = body.trim();
    if (!trimmed) return;

    setSending(true);
    const result = await sendChatMessage(conversationId, trimmed);

    if (!result.ok) {
      toast.error(result.error);
    } else {
      setBody("");
      router.refresh();
    }

    setSending(false);
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex-1 space-y-3 overflow-y-auto rounded-lg border border-border bg-muted/20 p-4">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No messages yet. Say hello and share the details of the job.
          </p>
        ) : (
          messages.map((message) => {
            const mine = message.senderId === currentUserId;

            return (
              <div
                key={message.id}
                className={cn(
                  "flex max-w-[80%] flex-col gap-1",
                  mine ? "ml-auto items-end" : "items-start",
                )}
              >
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2 text-sm",
                    mine
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-foreground shadow-sm",
                  )}
                >
                  {message.body}
                </div>
                <p className="px-1 text-[10px] text-muted-foreground">
                  {message.senderName} · {formatDateTime(message.createdAt)}
                </p>
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-end gap-2">
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void handleSend();
            }
          }}
          placeholder="Write a message…"
          rows={2}
        />
        <Button onClick={handleSend} disabled={sending || !body.trim()}>
          <Send className="size-4" aria-hidden />
          Send
        </Button>
      </div>
    </div>
  );
}
