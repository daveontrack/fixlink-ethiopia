import { describe, expect, it } from "vitest";

import { matchingConfigSchema } from "@/features/admin/matching-schema";

/** The provisional pilot values documented in docs/matching-pilot.md. */
const PILOT = {
  batchSize: 3,
  timeoutMinutes: 15,
  radiusExpansionKm: 5,
  maxSearchRadiusKm: 15,
  maxExpansionRounds: 2,
  expirationHours: 48,
  maxConcurrentJobs: 3,
};

describe("Matching configuration", () => {
  it("accepts the provisional pilot values", () => {
    expect(matchingConfigSchema.safeParse(PILOT).success).toBe(true);
  });

  it("coerces numeric form inputs", () => {
    const parsed = matchingConfigSchema.parse({
      batchSize: "3",
      timeoutMinutes: "15",
      radiusExpansionKm: "5",
      maxSearchRadiusKm: "15",
      maxExpansionRounds: "2",
      expirationHours: "48",
      maxConcurrentJobs: "3",
    });

    expect(parsed.batchSize).toBe(3);
    expect(parsed.maxSearchRadiusKm).toBe(15);
  });

  it.each([
    ["batchSize", 0],
    ["batchSize", 51],
    ["timeoutMinutes", 0],
    ["maxExpansionRounds", 11],
    ["expirationHours", 0],
    ["maxConcurrentJobs", 101],
  ])("rejects %s = %s outside the database range", (field, value) => {
    const result = matchingConfigSchema.safeParse({ ...PILOT, [field]: value });
    expect(result.success).toBe(false);
  });

  it("rejects a radius expansion larger than the maximum radius", () => {
    const result = matchingConfigSchema.safeParse({
      ...PILOT,
      radiusExpansionKm: 20,
      maxSearchRadiusKm: 15,
    });

    expect(result.success).toBe(false);
  });

  it("rejects fractional values for integer fields", () => {
    const result = matchingConfigSchema.safeParse({
      ...PILOT,
      batchSize: 2.5,
    });
    expect(result.success).toBe(false);
  });
});
