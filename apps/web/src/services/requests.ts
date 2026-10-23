import "server-only";

import { createClerkClient } from "@/lib/supabase/clerk";
import type {
  Paginated,
  RequestCreateInput,
  ServiceRequest,
  TableFilters,
} from "@/types";

const PAGE_SIZE = 20;

interface JobRequestRow {
  id: string;
  customer_id: string;
  category_id: string;
  title: string;
  description: string;
  status: ServiceRequest["status"];
  priority: ServiceRequest["priority"];
  sub_city_code: string;
  area_name: string;
  created_at: string;
  updated_at: string;
  customer?: { full_name: string } | null;
  category?: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    icon: string | null;
    is_active: boolean;
    sort_order: number;
  } | null;
}

function toServiceRequest(row: JobRequestRow): ServiceRequest {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer?.full_name ?? "Customer",
    category: row.category
      ? {
          id: row.category.id,
          slug: row.category.slug as ServiceRequest["category"]["slug"],
          name: row.category.name,
          description: row.category.description,
          icon: row.category.icon,
          isActive: row.category.is_active,
          sortOrder: row.category.sort_order,
        }
      : {
          id: row.category_id,
          slug: "other",
          name: "Other",
          description: null,
          icon: null,
          isActive: true,
          sortOrder: 0,
        },
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    city: row.area_name,
    subCity: row.sub_city_code,
    address: null,
    scheduledDate: null,
    budgetMin: null,
    budgetMax: null,
    quotationCount: 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const REQUEST_SELECT = `
  id, customer_id, category_id, title, description, status, priority,
  sub_city_code, area_name, created_at, updated_at,
  customer:profiles!job_requests_customer_id_fkey ( full_name ),
  category:service_categories ( id, slug, name, description, icon, is_active, sort_order )
`;

export async function listRequests(
  customerId: string,
  filters: TableFilters = {},
): Promise<Paginated<ServiceRequest>> {
  const supabase = (await createClerkClient()) as any;
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? PAGE_SIZE;

  let query = supabase
    .from("job_requests")
    .select(REQUEST_SELECT, { count: "exact" })
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.search) query = query.ilike("title", `%${filters.search}%`);

  const { data, count, error } = await query;

  if (error) {
    console.warn("[requests] list failed:", error.message);
    return { data: [], page, pageSize, total: 0, totalPages: 0 };
  }

  const rows = (data ?? []) as unknown as JobRequestRow[];

  return {
    data: rows.map(toServiceRequest),
    page,
    pageSize,
    total: count ?? rows.length,
    totalPages: Math.ceil((count ?? rows.length) / pageSize),
  };
}

export async function listOpenRequests(
  filters: TableFilters = {},
): Promise<Paginated<ServiceRequest>> {
  const supabase = (await createClerkClient()) as any;
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? PAGE_SIZE;

  let query = supabase
    .from("job_requests")
    .select(REQUEST_SELECT, { count: "exact" })
    .in("status", ["open", "matching", "quoted"])
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (filters.search) query = query.ilike("title", `%${filters.search}%`);

  const { data, count, error } = await query;

  if (error) {
    console.warn("[requests] open list failed:", error.message);
    return { data: [], page, pageSize, total: 0, totalPages: 0 };
  }

  const rows = (data ?? []) as unknown as JobRequestRow[];

  return {
    data: rows.map(toServiceRequest),
    page,
    pageSize,
    total: count ?? rows.length,
    totalPages: Math.ceil((count ?? rows.length) / pageSize),
  };
}

export async function listMatchedRequests(
  professionalId: string,
  filters: TableFilters = {},
): Promise<Paginated<ServiceRequest>> {
  const supabase = (await createClerkClient()) as any;
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? PAGE_SIZE;

  // Use the real job_matches -> job_requests relationship so pagination and
  // the exact count both cover the complete set of this professional's jobs.
  let query = supabase
    .from("job_requests")
    .select(`${REQUEST_SELECT}, job_matches!inner(professional_id)`, {
      count: "exact",
    })
    .eq("job_matches.professional_id", professionalId)
    .in("status", ["open", "matching", "quoted"])
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (filters.search) query = query.ilike("title", `%${filters.search}%`);

  const { data, count, error } = await query;

  if (error) {
    console.warn("[requests] matched list failed:", error.message);
    return { data: [], page, pageSize, total: 0, totalPages: 0 };
  }

  const rows = (data ?? []) as unknown as JobRequestRow[];

  return {
    data: rows.map(toServiceRequest),
    page,
    pageSize,
    total: count ?? rows.length,
    totalPages: Math.ceil((count ?? rows.length) / pageSize),
  };
}

export async function listAllRequests(
  filters: TableFilters = {},
): Promise<Paginated<ServiceRequest>> {
  const supabase = (await createClerkClient()) as any;
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 50;

  let query = supabase
    .from("job_requests")
    .select(REQUEST_SELECT, { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.search) query = query.ilike("title", `%${filters.search}%`);

  const { data, count, error } = await query;

  if (error) {
    console.warn("[requests] all list failed:", error.message);
    return { data: [], page, pageSize, total: 0, totalPages: 0 };
  }

  const rows = (data ?? []) as unknown as JobRequestRow[];

  return {
    data: rows.map(toServiceRequest),
    page,
    pageSize,
    total: count ?? rows.length,
    totalPages: Math.ceil((count ?? rows.length) / pageSize),
  };
}

export async function getRequest(id: string): Promise<ServiceRequest | null> {
  const supabase = (await createClerkClient()) as any;
  const { data, error } = await supabase
    .from("job_requests")
    .select(REQUEST_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    console.warn("[requests] get failed:", error?.message);
    return null;
  }

  return toServiceRequest(data as unknown as JobRequestRow);
}

export async function createRequest(
  customerId: string,
  input: {
    categoryId: string;
    title: string;
    description: string;
    priority: ServiceRequest["priority"];
    subCityCode: string;
  },
): Promise<ServiceRequest | null> {
  const supabase = (await createClerkClient()) as any;

  const { data, error } = await supabase.rpc("create_job_request", {
    p_category_id: input.categoryId,
    p_title: input.title,
    p_description: input.description,
    p_sub_city_code: input.subCityCode,
    p_priority: input.priority,
  });

  if (error) {
    console.error("[requests] create failed:", error.message);
    return null;
  }

  return toServiceRequest(data as unknown as JobRequestRow);
}
