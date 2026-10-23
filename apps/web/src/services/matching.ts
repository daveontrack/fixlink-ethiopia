import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ServiceRequest } from "@/types";

export interface MatchResult {
  professionalId: string;
  name: string;
  headline: string | null;
  categoryIds: string[];
  rating: number | null;
  completedJobs: number;
  isAvailable: boolean;
  score: number;
  reasons: string[];
}

const WEIGHTS = {
  category: 40,
  availability: 25,
  rating: 20,
  experience: 15,
} as const;

/**
 * Rank professionals for a request.
 *
 * Score = category match + availability + rating + completed jobs.
 * Ties are broken by rating, then by number of completed jobs.
 *
 * Reads the real `professionals` table (`accepts_requests`, no `is_available`)
 * and resolves display names from the public `professional_locations` view.
 */
export async function matchProfessionals(
  request: ServiceRequest,
  limit = 10,
): Promise<MatchResult[]> {
  const supabase = (await createClient()) as any;

  const { data, error } = await supabase
    .from("professionals")
    .select(
      `
      id, bio, average_rating, completed_jobs, accepts_requests,
      verification_status,
      professional_services ( category_id )
    `,
    )
    .eq("verification_status", "approved")
    .eq("accepts_requests", true);

  if (error) {
    console.warn("[matching] query failed:", error.message);
    return [];
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>;

  const ids = rows.map((row) => row.id as string);
  const names = new Map<string, string>();

  if (ids.length > 0) {
    const { data: locations } = await supabase
      .from("professional_locations")
      .select("professional_id, full_name")
      .in("professional_id", ids);

    for (const location of (locations ?? []) as Array<{
      professional_id: string;
      full_name: string | null;
    }>) {
      if (location.full_name) names.set(location.professional_id, location.full_name);
    }
  }

  const results = rows.map((r) => {
    const services = (r.professional_services ?? []) as Array<{
      category_id: string;
    }>;
    const categoryIds = services.map((service) => service.category_id);
    const hasCategory = categoryIds.includes(request.category.id);

    const rating = (r.average_rating as number | null) ?? 0;
    const completedJobs = (r.completed_jobs as number | null) ?? 0;
    const isAvailable = (r.accepts_requests as boolean | null) ?? false;
    const reasons: string[] = [];

    let score = 0;

    if (hasCategory) {
      score += WEIGHTS.category;
      reasons.push("Offers this service category");
    }

    if (isAvailable) {
      score += WEIGHTS.availability;
      reasons.push("Available for new jobs");
    }

    score += (Math.min(rating, 5) / 5) * WEIGHTS.rating;
    if (rating >= 4.5) reasons.push(`Rated ${rating.toFixed(1)} by customers`);

    score += Math.min(completedJobs / 20, 1) * WEIGHTS.experience;
    if (completedJobs > 0) reasons.push(`${completedJobs} jobs completed`);

    const id = r.id as string;

    return {
      professionalId: id,
      name: names.get(id) ?? "Professional",
      headline: (r.bio as string | null) ?? null,
      categoryIds,
      rating: (r.average_rating as number | null) ?? null,
      completedJobs,
      isAvailable,
      score: Math.round(score),
      reasons,
    } satisfies MatchResult;
  });

  return results
    .sort((a, b) => b.score - a.score || (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, limit);
}
