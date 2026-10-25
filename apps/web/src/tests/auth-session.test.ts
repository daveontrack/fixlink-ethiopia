import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  auth: vi.fn(),
  from: vi.fn(),
  query: {} as Record<string, ReturnType<typeof vi.fn>>,
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: state.auth }));
vi.mock("@/lib/supabase/clerk", () => ({
  createClerkClient: vi.fn(async () => ({ from: state.from })),
}));

import { getCurrentUser } from "@/lib/auth/session";

describe("current authenticated profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.auth.mockResolvedValue({ userId: "user_professional" });
    state.query = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn(),
    };
    state.query.select.mockReturnValue(state.query);
    state.query.eq.mockReturnValue(state.query);
    state.from.mockReturnValue(state.query);
  });

  it("loads the persisted role by the canonical Clerk profile id", async () => {
    state.query.maybeSingle.mockResolvedValue({
      data: {
        id: "profile-1",
        clerk_user_id: "user_professional",
        email: "pro@example.com",
        full_name: "Professional",
        role: "professional",
        phone: null,
        avatar_url: null,
        account_status: "active",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
      error: null,
    });

    await expect(getCurrentUser()).resolves.toMatchObject({
      role: "professional",
      profileId: "profile-1",
    });
    expect(state.query.eq).toHaveBeenCalledWith(
      "clerk_user_id",
      "user_professional",
    );
  });

  it("loads the profile when the deployed schema has no e-mail copy column", async () => {
    const primary = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn(),
    };
    primary.select.mockReturnValue(primary);
    primary.eq.mockReturnValue(primary);
    primary.maybeSingle.mockResolvedValue({
      data: null,
      error: { code: "42703", message: "column profiles.email does not exist" },
    });

    const fallback = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn(),
    };
    fallback.select.mockReturnValue(fallback);
    fallback.eq.mockReturnValue(fallback);
    fallback.maybeSingle.mockResolvedValue({
      data: {
        id: "profile-1",
        clerk_user_id: "user_professional",
        full_name: "Professional",
        role: "professional",
        phone: null,
        avatar_url: null,
        preferred_language: "en",
        account_status: "active",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
      error: null,
    });

    state.from.mockReturnValueOnce(primary).mockReturnValueOnce(fallback);

    await expect(getCurrentUser()).resolves.toMatchObject({
      role: "professional",
      profileId: "profile-1",
      email: "",
    });
  });

  it("returns no user profile rather than defaulting a missing profile to customer", async () => {
    state.query.maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(getCurrentUser()).resolves.toBeNull();
    expect(state.query.eq).toHaveBeenCalledWith(
      "clerk_user_id",
      "user_professional",
    );
  });
});
