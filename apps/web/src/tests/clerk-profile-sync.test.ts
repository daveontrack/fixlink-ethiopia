import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: state.from })),
}));

import { syncProfile } from "@/lib/auth/profile";

function updateQuery(result: unknown) {
  const query = {
    update: vi.fn(),
    eq: vi.fn(),
    select: vi.fn(),
    maybeSingle: vi.fn(),
  };
  query.update.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.select.mockReturnValue(query);
  query.maybeSingle.mockResolvedValue(result);
  return query;
}

describe("Clerk profile sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("syncs the identity fields without the e-mail copy when the column is missing", async () => {
    const primary = updateQuery({
      data: null,
      error: {
        code: "PGRST204",
        message:
          "Could not find the 'email' column of 'profiles' in the schema cache",
      },
    });
    const fallback = updateQuery({ data: { id: "profile-1" }, error: null });
    state.from
      .mockReturnValueOnce(primary)
      .mockReturnValueOnce(fallback);

    await expect(
      syncProfile({
        clerkUserId: "user_professional",
        email: "pro@example.com",
        fullName: "Professional",
        phone: null,
        imageUrl: null,
      }),
    ).resolves.toEqual({ id: "profile-1" });

    expect(fallback.update).toHaveBeenCalledWith(
      expect.objectContaining({ full_name: "Professional" }),
    );
    expect(fallback.update).toHaveBeenCalledWith(
      expect.not.objectContaining({ email: expect.anything() }),
    );
  });

  it("still rejects errors that are not about a missing column", async () => {
    const primary = updateQuery({
      data: null,
      error: { code: "42501", message: "permission denied for table profiles" },
    });
    state.from.mockReturnValueOnce(primary);

    await expect(
      syncProfile({
        clerkUserId: "user_professional",
        email: "pro@example.com",
        fullName: "Professional",
      }),
    ).rejects.toThrow("permission denied");

    expect(primary.update).toHaveBeenCalledOnce();
  });
});
