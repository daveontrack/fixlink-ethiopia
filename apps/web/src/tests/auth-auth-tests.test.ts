import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CurrentUser, UserRole } from "@/types";

const { redirectMock, getCurrentUserMock, authMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  getCurrentUserMock: vi.fn(),
  authMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: getCurrentUserMock }));

import {
  requireAdmin,
  requireCustomer,
  requireProfessional,
  requireRole,
  requireUser,
} from "@/lib/auth/guards";

function user(role: UserRole): CurrentUser {
  return {
    clerkUserId: "user_test",
    profileId: "11111111-1111-4111-8111-111111111111",
    role,
    fullName: "Test User",
    email: "test@example.com",
    imageUrl: null,
  };
}

async function expectRedirect(promise: Promise<unknown>, target: string) {
  await expect(promise).rejects.toThrow(`REDIRECT:${target}`);
}

describe("Authentication guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user_test" });
  });

  it("sends a signed-out visitor to sign-in", async () => {
    authMock.mockResolvedValue({ userId: null });
    getCurrentUserMock.mockResolvedValue(null);

    await expectRedirect(requireUser(), "/sign-in");
    expect(redirectMock).toHaveBeenCalledWith("/sign-in");
  });

  it("returns the signed-in user for requireUser", async () => {
    getCurrentUserMock.mockResolvedValue(user("customer"));

    await expect(requireUser()).resolves.toMatchObject({ role: "customer" });
  });

  it("sends an authenticated user without a profile to onboarding", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    await expectRedirect(requireUser(), "/onboarding");
  });

  it("redirects a customer away from requireAdmin", async () => {
    getCurrentUserMock.mockResolvedValue(user("customer"));

    await expectRedirect(requireAdmin(), "/customer/dashboard");
  });

  it("redirects an admin away from requireCustomer", async () => {
    getCurrentUserMock.mockResolvedValue(user("admin"));

    await expectRedirect(requireCustomer(), "/admin/dashboard");
  });

  it("allows requireProfessional only for professionals", async () => {
    getCurrentUserMock.mockResolvedValue(user("professional"));
    await expect(requireProfessional()).resolves.toMatchObject({
      role: "professional",
    });

    getCurrentUserMock.mockResolvedValue(user("customer"));
    await expectRedirect(requireProfessional(), "/customer/dashboard");
  });

  it.each(["customer", "professional", "admin"] as const)(
    "allows direct access to a %s dashboard when the stored role matches",
    async (role) => {
      getCurrentUserMock.mockResolvedValue(user(role));
      await expect(requireRole(role)).resolves.toMatchObject({ role });
    },
  );

  it("requireRole accepts any of the listed roles", async () => {
    getCurrentUserMock.mockResolvedValue(user("professional"));

    await expect(requireRole("customer", "professional")).resolves.toMatchObject(
      { role: "professional" },
    );

    await expectRedirect(requireRole("admin"), "/professional/dashboard");
  });
});
