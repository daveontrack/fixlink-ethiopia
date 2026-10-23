"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { requireCustomer } from "@/lib/auth/guards";
import { listServiceCategories } from "@/services/categories";

import { requestSchema, type RequestFormValues } from "./schema";

const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** The database `job_priority` enum only has `normal` and `urgent`. */
function toDbPriority(priority: RequestFormValues["priority"]) {
  return priority === "high" || priority === "urgent" ? "urgent" : "normal";
}

function extensionFor(file: File): string {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

export async function createServiceRequest(
  values: RequestFormValues,
  files: File[] = [],
) {
  const user = await requireCustomer();

  const parsed = requestSchema.safeParse(values);

  if (!parsed.success) {
    return {
      ok: false as const,
      error: "Please check the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const categories = await listServiceCategories();
  const categoryExists = categories.some(
    (category) => category.id === parsed.data.categoryId,
  );

  if (!categoryExists) {
    return {
      ok: false as const,
      error: "That service category is not available.",
    };
  }

  if (!user.profileId) {
    return {
      ok: false as const,
      error:
        "Your profile could not be loaded. Check the Clerk + Supabase connection and try again.",
    };
  }

  const { createClerkClient } = await import("@/lib/supabase/clerk");
  const supabase = (await createClerkClient()) as any;

  const { data: created, error } = await supabase.rpc("create_job_request", {
    p_category_id: parsed.data.categoryId,
    p_title: parsed.data.title,
    p_description: parsed.data.description,
    p_sub_city_code: parsed.data.subCityCode,
    p_priority: toDbPriority(parsed.data.priority),
  });

  if (error) {
    console.error(
      "[requests] create failed:",
      error.message,
      error.details,
      error.hint,
    );
    return {
      ok: false as const,
      error: `We could not save your request: ${error.message}`,
    };
  }

  const job = (Array.isArray(created) ? created[0] : created) as
    | { id: string }
    | null;

  if (!job?.id) {
    return {
      ok: false as const,
      error: "We could not save your request. No data returned.",
    };
  }

  // Start the matching workflow. Non-fatal: the maintenance worker can pick
  // the request up later.
  try {
    const { error: matchError } = await supabase.rpc("match_job", {
      p_job_id: job.id,
      p_batch_size: 5,
    });
    if (matchError) {
      console.error("[requests] match_job failed:", matchError.message);
    }
  } catch (matchException) {
    console.error("[requests] match_job exception:", matchException);
  }

  // Upload photos to the private bucket and record their metadata.
  const validFiles = files
    .filter((file) => ALLOWED_PHOTO_TYPES.includes(file.type))
    .filter((file) => file.size > 0 && file.size <= MAX_PHOTO_BYTES)
    .slice(0, MAX_PHOTOS);

  if (validFiles.length !== files.length) {
    console.warn(
      `[requests] ignored ${files.length - validFiles.length} invalid photo(s)`,
    );
  }

  for (const [index, file] of validFiles.entries()) {
    const path = `${user.profileId}/${job.id}/${globalThis.crypto.randomUUID()}.${extensionFor(file)}`;

    const { error: uploadError } = await supabase.storage
      .from("job-photos")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      console.error("[requests] photo upload failed:", uploadError.message);
      continue;
    }

    const { error: photoError } = await supabase.from("job_photos").insert({
      job_id: job.id,
      storage_path: path,
      caption: file.name.slice(0, 200),
      sort_order: index,
    });

    if (photoError) {
      console.error("[requests] photo record failed:", photoError.message);
    }
  }

  redirect(`/customer/requests/${job.id}`);
}
