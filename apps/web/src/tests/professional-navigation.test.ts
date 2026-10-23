import { describe, expect, it } from "vitest";

import { isNavItemActive, PROFESSIONAL_NAV } from "@/components/layout/navigation";

const routes = [
  "/professional/dashboard",
  "/professional/requests",
  "/professional/quotations",
  "/professional/bookings",
  "/professional/availability",
  "/professional/profile",
  "/professional/verification",
  "/professional/messages",
  "/professional/notifications",
  "/professional/reviews",
  "/professional/earnings",
  "/professional/settings",
];

describe("professional dashboard navigation", () => {
  it("keeps the SRS destinations in their requested order", () => {
    expect(PROFESSIONAL_NAV.map((item) => item.href)).toEqual(routes);
  });

  it("marks nested routes and the services alias as active", () => {
    const requests = PROFESSIONAL_NAV.find(
      (item) => item.href === "/professional/requests",
    );
    const profile = PROFESSIONAL_NAV.find(
      (item) => item.href === "/professional/profile",
    );

    expect(requests && isNavItemActive("/professional/requests/abc", requests)).toBe(true);
    expect(profile && isNavItemActive("/professional/services", profile)).toBe(true);
  });
});
