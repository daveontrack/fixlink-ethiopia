import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VerificationForm } from "@/features/verification/components/verification-form";
import {
  getOwnVerificationSummary,
  listOwnVerificationDocuments,
} from "@/features/verification/queries";
import { requireProfessional } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Verification",
};

export default async function ProfessionalVerificationPage() {
  const user = await requireProfessional();

  const summary = user.profileId
    ? await getOwnVerificationSummary(user.profileId)
    : null;

  const documents = summary
    ? await listOwnVerificationDocuments(summary.professionalId)
    : [];

  const status = summary?.status ?? "not_started";
  const latestNote = documents.find((document) => document.reviewNote)?.reviewNote;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Verification"
        description="Submit identity and licence documents. Our team reviews them within two working days."
        actions={
          <StatusBadge
            status={status}
            label={status.replace("_", " ")}
            kind="request"
          />
        }
      />

      {status === "rejected" ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
        >
          <p className="font-medium">Your verification was rejected.</p>
          <p>
            {latestNote ??
              "Upload a clearer or corrected document to be reviewed again."}
          </p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Submit a document</CardTitle>
            </CardHeader>
            <CardContent>
              <VerificationForm />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your documents</CardTitle>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  You have not uploaded any documents yet.
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {documents.map((document) => (
                    <li
                      key={document.id}
                      className="flex flex-wrap items-center gap-2 border-b border-border pb-2 last:border-0"
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {document.fileName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {document.reviewedAt ? "Reviewed" : "Pending review"}
                      </span>
                      {document.url ? (
                        <a
                          href={document.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline-offset-2 hover:underline"
                        >
                          Open
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">What we need</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <ul className="list-disc space-y-2 pl-5">
              <li>A clear photo of your government ID.</li>
              <li>A business or trade licence (if applicable).</li>
              <li>Any professional certificates for your trade.</li>
              <li>Optional: photos of past work.</li>
            </ul>
            <p>
              Once your documents are approved, your profile becomes visible to
              customers and you can receive requests. Documents are private:
              they are never exposed on your public profile.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
