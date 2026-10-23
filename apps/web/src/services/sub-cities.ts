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
  is_active: boolean;
  source: string | null;
  source_code: string | null;
}

const SUB_CITY_SELECT = "code, name, name_am, name_om, sort_order, is_active, source, source_code";

function toSubCity(row: SubCityRow): SubCity {
  return {
    code: row.code,
    name: row.name,
    nameAm: row.name_am,
    nameOm: row.name_om,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    source: row.source,
    sourceCode: row.source_code,
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

  let query = supabase
    .from("sub_cities")
    .select(SUB_CITY_SELECT)
    .order("sort_order", { ascending: true });

  if (!options.includeInactive) query = query.eq("is_active", true);

  const { data, error } = await query;

  if (error) {
    console.warn("[sub-cities] list failed:", error.message);
    return { data: [], error: "We could not load the service areas." };
  }

  return {
    data: ((data ?? []) as unknown as SubCityRow[]).map(toSubCity),
    error: null,
  };
}
