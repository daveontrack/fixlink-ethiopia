import "server-only";

import { createClerkClient } from "@/lib/supabase/clerk";
import { createClient } from "@/lib/supabase/server";
import type {
  Paginated,
  ProfessionalProfile,
  TableFilters,
} from "@/types";

/**
 * The public directory is the `professional_locations` view, which is
 * readable without an account and only lists APPROVED professionals.
 * `profiles` itself is protected by RLS, so the base table cannot be joined
 * from an anonymous/public request.
 */
interface ProfessionalLocationRow {
  professional_id: string;
  profile_id: string;
  full_name: string | null;
  avatar_url: string | null;
  base_area_name: string | null;
  sub_city_code: string | null;
  verification_status: ProfessionalProfile["verificationStatus"];
  accepts_requests: boolean | null;
  service_radius_km: number | null;
  years_of_experience: number | null;
  average_rating: number | null;
  total_reviews: number | null;
  completed_jobs: number | null;
}

const PROFESSIONAL_SELECT =
  "professional_id, profile_id, full_name, avatar_url, base_area_name, " +
  "sub_city_code, verification_status, accepts_requests, service_radius_km, " +
  "years_of_experience, average_rating, total_reviews, completed_jobs";

function toProfessional(row: ProfessionalLocationRow): ProfessionalProfile {
  return {
    id: row.professional_id,
    clerkUserId: row.profile_id,
    role: "professional",
    fullName: row.full_name ?? "Professional",
    phone: null,
    email: "",
    avatarUrl: row.avatar_url,
    preferredLanguage: "en",
    city: row.base_area_name,
    subCity: row.sub_city_code,
    address: row.base_area_name,
    status: "active",
    createdAt: "",
    updatedAt: "",
    headline: null,
    bio: null,
    yearsExperience: row.years_of_experience ?? null,
    verificationStatus: row.verification_status ?? "pending",
    averageRating: row.average_rating ?? null,
    totalReviews: row.total_reviews ?? 0,
    completedJobs: row.completed_jobs ?? 0,
    isAvailable: row.accepts_requests ?? false,
  };
}

export async function listProfessionals(
  filters: TableFilters = {},
): Promise<Paginated<ProfessionalProfile>> {
  const supabase = await createClient();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 12;

  let query = supabase
    .from("professional_locations")
    .select(PROFESSIONAL_SELECT, { count: "exact" })
    .order("average_rating", { ascending: false, nullsFirst: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (filters.search) query = query.ilike("full_name", `%${filters.search}%`);

  const { data, count, error } = await query;

  if (error) {
    console.warn("[professionals] list failed:", error.message);
    return { data: [], page, pageSize, total: 0, totalPages: 0 };
  }

  const rows = (data ?? []) as unknown as ProfessionalLocationRow[];

  return {
    data: rows.map(toProfessional),
    page,
    pageSize,
    total: count ?? rows.length,
    totalPages: Math.ceil((count ?? rows.length) / pageSize),
  };
}

/**
 * The base service area of the signed-in professional. Returns null when the
 * caller has no professionals row yet (the profile is not set up).
 */
export async function getOwnServiceArea(
  profileId: string | null,
): Promise<{ subCityCode: string | null } | null> {
  if (!profileId) return null;

  const supabase = (await createClerkClient()) as any;
  const { data, error } = await supabase
    .from("professionals")
    .select("sub_city_code")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    console.warn("[professionals] own service area failed:", error.message);
    return null;
  }

  return data ? { subCityCode: data.sub_city_code } : null;
}

export async function getProfessional(
  id: string,
): Promise<ProfessionalProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("professional_locations")
    .select(PROFESSIONAL_SELECT)
    .eq("professional_id", id)
    .maybeSingle();

  if (error || !data) {
    if (error) console.warn("[professionals] get failed:", error.message);
    return null;
  }

  return toProfessional(data as unknown as ProfessionalLocationRow);
}
