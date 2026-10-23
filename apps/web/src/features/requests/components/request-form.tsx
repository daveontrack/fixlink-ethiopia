"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { SelectField } from "@/components/forms/select-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { TextField } from "@/components/forms/text-field";
import { TextareaField } from "@/components/forms/textarea-field";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { createServiceRequest } from "@/features/requests/actions";
import { requestSchema, type RequestFormValues } from "@/features/requests/schema";
import type { SelectOption } from "@/types";

const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface RequestFormProps {
  categories: SelectOption[];
  subCities: SelectOption[];
  /** Message to show when the locations could not be loaded. */
  subCitiesError?: string | null;
  defaultCategoryId?: string;
}

interface PendingPhoto {
  file: File;
  previewUrl: string;
}

export function RequestForm({
  categories,
  subCities,
  subCitiesError,
  defaultCategoryId,
}: RequestFormProps) {
  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      categoryId: defaultCategoryId ?? "",
      title: "",
      description: "",
      priority: "normal",
      subCityCode: subCities[0]?.value ?? "",
    },
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const photosRef = useRef<PendingPhoto[]>([]);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  // Release object URLs when the component unmounts.
  useEffect(() => {
    return () => {
      photosRef.current.forEach((photo) =>
        URL.revokeObjectURL(photo.previewUrl),
      );
    };
  }, []);

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;

    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      toast.error(`You can add up to ${MAX_PHOTOS} photos.`);
      return;
    }

    const accepted: PendingPhoto[] = [];
    for (const file of Array.from(fileList).slice(0, remaining)) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: only JPG, PNG or WebP photos are allowed.`);
        continue;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        toast.error(`${file.name}: photos must be 5 MB or smaller.`);
        continue;
      }
      accepted.push({ file, previewUrl: URL.createObjectURL(file) });
    }

    setPhotos((current) => [...current, ...accepted]);
  }

  function removePhoto(index: number) {
    setPhotos((current) => {
      const photo = current[index];
      if (photo) URL.revokeObjectURL(photo.previewUrl);
      return current.filter((_, i) => i !== index);
    });
  }

  async function onSubmit(values: RequestFormValues) {
    const result = await createServiceRequest(
      values,
      photos.map((photo) => photo.file),
    );

    if (!result.ok) {
      toast.error(result.error);
    }
  }

  if (categories.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Service categories are still being configured. Please check back shortly
        or contact support.
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            name="categoryId"
            label="Service category"
            options={categories}
            placeholder="Select a category"
            required
          />
          <SelectField
            name="priority"
            label="Priority"
            options={[
              { value: "low", label: "Low — flexible timing" },
              { value: "normal", label: "Normal" },
              { value: "high", label: "High — needed soon" },
              { value: "urgent", label: "Urgent — safety issue" },
            ]}
            required
          />
        </div>

        <TextField
          name="title"
          label="Request title"
          placeholder="Leaking kitchen tap"
          description="A short summary professionals will see first."
          required
        />

        <TextareaField
          name="description"
          label="What needs to be done?"
          placeholder="Describe the problem, the room, and anything that would help the professional prepare."
          description="The more detail you give, the more accurate your quotations will be."
          rows={5}
          required
        />

        {subCitiesError ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
          >
            {subCitiesError} Refresh the page to try again, or contact support.
          </div>
        ) : subCities.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            No service areas are available yet. Please check back shortly or
            contact support.
          </div>
        ) : (
          <SelectField
            name="subCityCode"
            label="Sub-city / neighborhood"
            options={subCities}
            placeholder="Select your sub-city"
            required
          />
        )}

        <div className="rounded-lg border border-border bg-background p-4">
          <h3 className="mb-1 font-medium">Request photos (optional)</h3>
          <p className="mb-3 text-sm text-muted-foreground">
            Up to {MAX_PHOTOS} photos, 5 MB each. JPG, PNG or WebP.
          </p>

          {photos.length > 0 ? (
            <div className="mb-3 grid grid-cols-3 gap-2">
              {photos.map((photo, index) => (
                <div
                  key={photo.previewUrl}
                  className="flex flex-col items-center rounded border border-border p-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.previewUrl}
                    alt={photo.file.name}
                    className="mb-2 h-24 w-full rounded object-cover"
                  />
                  <p className="w-full truncate text-xs text-muted-foreground">
                    {photo.file.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="text-xs text-destructive hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(event) => {
              addFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={photos.length >= MAX_PHOTOS || form.formState.isSubmitting}
          >
            {photos.length >= MAX_PHOTOS ? "Maximum photos added" : "+ Add photos"}
          </Button>
        </div>

        <div className="flex gap-2">
          <SubmitButton pendingLabel="Publishing…">Publish request</SubmitButton>
          <Button type="button" variant="ghost" asChild>
            <a href="/customer/requests">Cancel</a>
          </Button>
        </div>
      </form>
    </Form>
  );
}
