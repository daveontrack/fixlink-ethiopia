import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  createAdminClient: vi.fn(),
  createClerkClient: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: state.auth,
  currentUser: state.currentUser,
}));
vi.mock("next/navigation", () => ({ redirect: state.redirect }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: state.createAdminClient,
}));
vi.mock("@/lib/supabase/clerk", () => ({
  createClerkClient: state.createClerkClient,
}));

import { completeOnboarding } from "@/features/onboarding/actions";

function profileQuery(result: unknown) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
    insert: vi.fn(),
    single: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.insert.mockReturnValue(query);
  query.maybeSingle.mockResolvedValue(result);
  query.single.mockResolvedValue(result);
  return query;
}

describe("onboarding role persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.auth.mockResolvedValue({ userId: "user_new" });
    state.currentUser.mockResolvedValue({
      fullName: "New User",
      primaryEmailAddress: { emailAddress: "new@example.com" },
      primaryPhoneNumber: null,
      imageUrl: null,
    });
    state.createClerkClient.mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({ error: null }),
    });
  });

  it("keeps an existing stored role even when a different choice is submitted", async () => {
    const lookup = profileQuery({ data: { id: "p1", role: "customer" }, error: null });
    state.createAdminClient.mockReturnValue({ from: vi.fn(() => lookup) });

    await expect(
      completeOnboarding({ role: "professional" }),
    ).rejects.toThrow("REDIRECT:/customer/dashboard");
    expect(lookup.insert).not.toHaveBeenCalled();
    expect(state.createClerkClient).not.toHaveBeenCalled();
  });

  it("persists a new professional role in profiles before redirecting", async () => {
    const lookup = profileQuery({ data: null, error: null });
    const legacyLookup = profileQuery({ data: null, error: null });
    const created = profileQuery({
      data: { id: "p2", role: "professional" },
      error: null,
    });
    const database = {
      from: vi
        .fn()
        .mockReturnValueOnce(lookup)
        .mockReturnValueOnce(legacyLookup)
        .mockReturnValueOnce(created),
    };
    state.createAdminClient.mockReturnValue(database);

    await expect(
      completeOnboarding({ role: "professional" }),
    ).rejects.toThrow("REDIRECT:/professional/dashboard");
    expect(created.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        clerk_user_id: "user_new",
        role: "professional",
      }),
    );
    expect(state.createClerkClient).toHaveBeenCalledOnce();
  });

  it("creates the profile when the database has no legacy identity or e-mail column", async () => {
    const lookup = profileQuery({ data: null, error: null });
    const legacyLookup = profileQuery({
      data: null,
      error: {
        code: "42703",
        message: "column profiles.auth_user_id does not exist",
      },
    });
    const insertWithEmail = profileQuery({
      data: null,
      error: {
        code: "PGRST204",
        message:
          "Could not find the 'email' column of 'profiles' in the schema cache",
      },
    });
    const insertWithoutEmail = profileQuery({
      data: { id: "p3", role: "customer" },
      error: null,
    });
    const database = {
      from: vi
        .fn()
        .mockReturnValueOnce(lookup)
        .mockReturnValueOnce(legacyLookup)
        .mockReturnValueOnce(insertWithEmail)
        .mockReturnValueOnce(insertWithoutEmail),
    };
    state.createAdminClient.mockReturnValue(database);

    await expect(
      completeOnboarding({ role: "customer" }),
    ).rejects.toThrow("REDIRECT:/customer/dashboard");

    expect(insertWithoutEmail.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        clerk_user_id: "user_new",
        role: "customer",
      }),
    );
    expect(insertWithoutEmail.insert).toHaveBeenCalledWith(
      expect.not.objectContaining({ email: expect.anything() }),
    );
  });

  it("rejects attempts to assign admin through onboarding", async () => {
    await expect(
      completeOnboarding({ role: "admin" } as never),
    ).resolves.toMatchObject({ ok: false });
    expect(state.createAdminClient).not.toHaveBeenCalled();
  });
});
