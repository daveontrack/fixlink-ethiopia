"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { useForm } from "react-hook-form";

import { SelectField } from "@/components/forms/select-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { submitDocument } from "@/features/verification/actions";

interface VerificationFormValues {
  type: "id" | "business_license" | "certificate" | "portfolio";
}

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];

export function VerificationForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const form = useForm<VerificationFormValues>({
    defaultValues: { type: "id" },
  });

  function chooseFile(selected: File | null) {
    if (!selected) return;

    if (!ALLOWED_TYPES.includes(selected.type)) {
      toast.error("Only JPG, PNG or PDF documents are accepted.");
      return;
    }
    if (selected.size > MAX_BYTES) {
      toast.error("The file must be 10 MB or smaller.");
      return;
    }

    setFile(selected);
  }

  async function onSubmit(values: VerificationFormValues) {
    if (!file) {
      toast.error("Choose a file to upload.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.set("type", values.type);
    formData.set("file", file);

    const result = await submitDocument(formData);
    setUploading(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Document submitted for review.");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    form.reset({ type: values.type });
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <SelectField
            name="type"
            label="Document type"
            options={[
              { value: "id", label: "Government ID" },
              { value: "business_license", label: "Business licence" },
              { value: "certificate", label: "Professional certificate" },
              { value: "portfolio", label: "Portfolio / work samples" },
            ]}
            required
          />

          <div className="space-y-2">
            <p className="text-sm font-medium">
              File<span className="text-destructive"> *</span>
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              className="hidden"
              onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                Choose file
              </Button>
              <span className="truncate text-sm text-muted-foreground">
                {file?.name ?? "No file selected"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              JPG, PNG or PDF, 10 MB maximum. Documents are private: only you
              and the review team can open them.
            </p>
          </div>

          <SubmitButton pendingLabel="Uploading…" disabled={uploading}>
            Submit for review
          </SubmitButton>
      </form>
    </Form>
  );
}
