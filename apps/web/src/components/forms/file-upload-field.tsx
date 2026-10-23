"use client";

import { Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface FileUploadFieldProps {
  name: string;
  label: string;
  bucket?: string;
  folder?: string;
  accept?: string;
  description?: string;
  required?: boolean;
  className?: string;
}

/**
 * Uploads a file to Supabase Storage and stores the public URL in the form.
 */
export function FileUploadField({
  name,
  label,
  bucket = "verification-documents",
  folder = "documents",
  accept = "image/png,image/jpeg,application/pdf",
  description,
  required,
  className,
}: FileUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>
            {label}
            {required ? <span className="text-destructive"> *</span> : null}
          </FormLabel>
          <FormControl>
            <div className="space-y-2">
              <input
                ref={inputRef}
                type="file"
                accept={accept}
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;

                  setUploading(true);
                  try {
                    const supabase = createClient();
                    const path = `${folder}/${Date.now()}-${file.name}`;

                    const { error } = await supabase.storage
                      .from(bucket)
                      .upload(path, file, {
                        upsert: false,
                        contentType: file.type,
                      });

                    if (error) throw error;

                    const { data } = supabase.storage
                      .from(bucket)
                      .getPublicUrl(path);

                    field.onChange(data.publicUrl);
                    setFileName(file.name);
                    toast.success("File uploaded");
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "Upload failed. Please try again.",
                    );
                  } finally {
                    setUploading(false);
                  }
                }}
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => inputRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Upload className="size-4" aria-hidden />
                  )}
                  Choose file
                </Button>
                <span
                  className={cn(
                    "truncate text-sm text-muted-foreground",
                    !fileName && "italic",
                  )}
                >
                  {fileName ?? "No file selected"}
                </span>
              </div>
            </div>
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
