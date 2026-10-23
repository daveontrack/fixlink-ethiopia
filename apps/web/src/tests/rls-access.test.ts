import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

/**
 * Read-only RLS integration checks.
 *
 * These run against the project in `.env` with the PUBLIC (anon) key, the
 * same credential a signed-out browser gets. They never write. When the
 * environment is missing the suite is skipped instead of failing the build.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const configured = Boolean(url && anonKey);

const anon = configured
  ? createClient(url!, anonKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

async function countOrError(table: string) {
  const { data, error } = await anon!.from(table).select("*").limit(3);
  return { rows: data ?? [], error };
}

describe.skipIf(!configured)("Row Level Security for signed-out visitors", () => {
  it("exposes the public service-area catalogue", async () => {
    const { rows, error } = await countOrError("sub_cities");
    expect(error).toBeNull();
    expect(rows.length).toBeGreaterThan(0);
  });

  it("hides profiles", async () => {
    const { rows, error } = await countOrError("profiles");
    expect(rows).toHaveLength(0);
    if (error) expect(error.message).toBeTruthy();
  });

  it("hides job requests", async () => {
    const { rows } = await countOrError("job_requests");
    expect(rows).toHaveLength(0);
  });

  it("hides verification documents", async () => {
    const { rows } = await countOrError("verification_documents");
    expect(rows).toHaveLength(0);
  });

  it("hides the matching configuration", async () => {
    const { rows } = await countOrError("matching_config");
    expect(rows).toHaveLength(0);
  });

  it("does not list objects in the private verification bucket", async () => {
    const { data, error } = await anon!.storage
      .from("verification-documents")
      .list("", { limit: 3 });

    expect(error ? [] : (data ?? [])).toHaveLength(0);
  });
});

describe.skipIf(configured)("RLS integration suite", () => {
  it("is skipped because the public Supabase environment is not set", () => {
    expect(configured).toBe(false);
  });
});
