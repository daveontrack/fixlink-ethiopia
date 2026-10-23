import { z } from "zod";

/**
 * The matching parameters of the pilot.
 *
 * The ranges mirror the CHECK constraints of `public.matching_config`
 * (20261020000800_matching.sql), so an invalid value is rejected before it
 * reaches Postgres.
 */
export const matchingConfigSchema = z
  .object({
    batchSize: z.coerce.number().int("Whole numbers only").min(1).max(50),
    timeoutMinutes: z.coerce.number().int("Whole numbers only").min(1).max(1440),
    radiusExpansionKm: z.coerce.number().min(0.1).max(100),
    maxSearchRadiusKm: z.coerce.number().min(0.1).max(100),
    maxExpansionRounds: z.coerce
      .number()
      .int("Whole numbers only")
      .min(0)
      .max(10),
    expirationHours: z.coerce.number().int("Whole numbers only").min(1).max(720),
    maxConcurrentJobs: z.coerce
      .number()
      .int("Whole numbers only")
      .min(1)
      .max(100),
  })
  .refine((config) => config.radiusExpansionKm <= config.maxSearchRadiusKm, {
    message: "Radius expansion cannot exceed the maximum search radius.",
    path: ["radiusExpansionKm"],
  });

export type MatchingConfigValues = z.infer<typeof matchingConfigSchema>;
