import { describe, expect, it } from "vitest";

import { getPostAuthRedirect, POST_AUTH_REDIRECT } from "@/lib/auth/redirects";

describe("post-auth destinations", () => {
  it.each([
    ["customer", "/customer/dashboard"],
    ["professional", "/professional/dashboard"],
    ["admin", "/admin/dashboard"],
  ] as const)("routes stored role %s to its dashboard", (role, destination) => {
    expect(getPostAuthRedirect(role)).toBe(destination);
  });

  it("routes a missing profile to explicit onboarding", () => {
    expect(getPostAuthRedirect(null)).toBe("/onboarding");
    expect(POST_AUTH_REDIRECT).toBe("/onboarding");
  });
});
