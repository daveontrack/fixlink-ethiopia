import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * A service area of the Dire Dawa city administration.
 *
 * `is_active` decides whether the location is offered in the pickers.
 * Inactive rows stay in the table because saved requests and professional
 * profiles still reference their codes.
 */
export interface SubCity {
  code: string;
  name: string;
  nameAm: string | null;
  nameOm: string | null;
  sortOrder: number;
  isActive: boolean;
  source: string | null;
  sourceCode: string | null;
}

interface SubCityRow {
  code: string;
  name: string;
  name_am: string | null;
  name_om: string | null;
  sort_order: number;
  is_active?: boolean;
  source?: string | null;
  source_code?: string | null;
}

// Base columns that exist in the original migration
const BASE_SUB_CITY_SELECT = "code, name, name_am, name_om, sort_order";
// Full columns including the new ones from migration 20261023000100
const FULL_SUB_CITY_SELECT = "code, name, name_am, name_om, sort_order, is_active, source, source_code";

function toSubCity(row: SubCityRow): SubCity {
  return {
    code: row.code,
    name: row.name,
    nameAm: row.name_am ?? null,
    nameOm: row.name_om ?? null,
    sortOrder: row.sort_order,
    isActive: row.is_active ?? true, // Default to true if column doesn't exist
    source: row.source ?? null,
    sourceCode: row.source_code ?? null,
  };
}

export interface SubCityList {
  data: SubCity[];
  /** A message ready to show to the user, or null when the query succeeded. */
  error: string | null;
}

/**
 * The locations offered by the forms.
 *
 * `includeInactive` is for the administrator screen only: a customer must
 * never be offered a location that is no longer a valid service area.
 */
export async function listSubCities(
  options: { includeInactive?: boolean } = {},
): Promise<SubCityList> {
  const supabase = await createClient();

  // Try with full columns first (migration 20261023000100 may or may not be applied)
  const baseQuery = supabase
    .from("sub_cities")
    .select(FULL_SUB_CITY_SELECT)
    .order("sort_order", { ascending: true });

  // Only filter by is_active if the column exists
  if (!options.includeInactive) {
    const { data: filteredData, error: filterError } = await baseQuery.eq("is_active", true);
    
    if (!filterError && filteredData) {
      return {
        data: (filteredData as unknown as SubCityRow[]).map(toSubCity),
        error: null,
      };
    }
    
    // If filter failed (column doesn't exist), fall back to all rows with base columns
    const { data, error } = await supabase
      .from("sub_cities")
      .select(BASE_SUB_CITY_SELECT)
      .order("sort_order", { ascending: true });
    
    if (error) {
      console.warn("[sub-cities] list failed:", error.message);
      return { data: [], error: "We could not load the service areas." };
    }

    return {
      data: ((data ?? []) as unknown as SubCityRow[]).map(toSubCity),
      error: null,
    };
  }

  // If includeInactive is true, just get all rows
  const { data, error } = await supabase
    .from("sub_cities")
    .select(FULL_SUB_CITY_SELECT)
    .order("sort_order", { ascending: true });

  if (error) {
    // Try with base columns if full select fails
    const { data: baseData, error: baseError } = await supabase
      .from("sub_cities")
      .select(BASE_SUB_CITY_SELECT)
      .order("sort_order", { ascending: true });
    
    if (baseError) {
      console.warn("[sub-cities] list failed:", baseError.message);
      return { data: [], error: "We could not load the service areas." };
    }
    
    return {
      data: ((baseData ?? []) as unknown as SubCityRow[]).map(toSubCity),
      error: null,
    };
  }

  return {
    data: ((data ?? []) as unknown as SubCityRow[]).map(toSubCity),
    error: null,
  };
}
