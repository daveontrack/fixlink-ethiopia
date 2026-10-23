import { z } from "zod";

export const requestSchema = z.object({
  categoryId: z.string().uuid("Choose a service category"),
  title: z.string().min(5, "Give your request a short title").max(120),
  description: z
    .string()
    .min(10, "Describe the job in at least 10 characters")
    .max(5000),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  subCityCode: z.string().min(1, "Choose a sub-city"),
});

export type RequestFormValues = z.infer<typeof requestSchema>;