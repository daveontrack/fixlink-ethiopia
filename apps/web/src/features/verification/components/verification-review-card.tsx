"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { reviewVerification } from "@/features/verification/actions";
import type { VerificationCase } from "@/features/verification/queries";

const TYPE_LABELS: Record<string, string> = {
  id_card: "Government ID",
  business_license: "Business licence",
  trade_certificate: "Trade certificate",
  other: "Portfolio",
};

export function VerificationReviewCard({
  verificationCase,
}: {
  verificationCase: VerificationCase;
}) {
  const [pending, setPending] = useState<"approved" | "rejected" | null>(null);
  const [note, setNote] = useState("");

  async function decide(decision: "approved" | "rejected") {
    setPending(decision);
    const result = await reviewVerification(
      verificationCase.professionalId,
      decision,
      note.trim() || undefined,
    );

    if (!result.ok) {
      toast.error(result.error);
    } else {
      toast.success(`Verification ${decision}.`);
    }

    setPending(null);
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center gap-4">
          <UserAvatar
            name={verificationCase.fullName}
            imageUrl={null}
            className="size-10"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{verificationCase.fullName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {verificationCase.email ?? "No e-mail on the profile"}
            </p>
          </div>
          <StatusBadge
            status={verificationCase.verificationStatus}
            label={verificationCase.verificationStatus.replace("_", " ")}
          />
        </div>

        {verificationCase.documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No documents have been uploaded yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {verificationCase.documents.map((document) => (
              <li
                key={document.id}
                className="flex flex-wrap items-center gap-3 rounded-md border border-border p-2 text-sm"
              >
                <FileText className="size-4 text-muted-foreground" aria-hidden />
                <span className="font-medium">
                  {TYPE_LABELS[document.type] ?? document.type}
                </span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                  {document.fileName}
                </span>
                {document.url ? (
                  <a
                    href={document.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    Open private file
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    File unavailable
                  </span>
                )}
                {document.reviewNote ? (
                  <span className="w-full text-xs text-muted-foreground">
                    Note: {document.reviewNote}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-2">
          <label
            htmlFor={`note-${verificationCase.professionalId}`}
            className="text-sm font-medium"
          >
            Review note (optional, shown on rejection)
          </label>
          <textarea
            id={`note-${verificationCase.professionalId}`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            maxLength={1000}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            placeholder="Explain what is missing so the professional can resubmit."
          />
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={pending !== null}
            onClick={() => decide("approved")}
          >
            {pending === "approved" ? "Approving…" : "Approve"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending !== null}
            onClick={() => decide("rejected")}
          >
            {pending === "rejected" ? "Rejecting…" : "Reject"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
