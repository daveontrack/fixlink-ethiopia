import "server-only";

import { createClerkClient } from "@/lib/supabase/clerk";
import type {
  Paginated,
  Quotation,
  QuotationCreateInput,
  QuotationStatus,
  TableFilters,
} from "@/types";

/**
 * Real quotation row (20261020000700_quotations_and_bookings.sql).
 * The App's Quotation shape is richer than the table; the projection below
 * maps the two cost columns onto subtotal/transportFee and exposes a single
 * descriptive line for each of them.
 */
interface QuotationRow {
  id: string;
  job_id: string;
  professional_id: string;
  labor_cost_etb: number;
  materials_cost_etb: number;
  notes: string | null;
  proposed_start_at: string | null;
  valid_until: string;
  status: string;
  created_at: string;
  job_requests?: { title: string | null; customer_id: string | null } | null;
}

interface ProfessionalRow {
  professional_id: string;
  full_name: string | null;
}

const QUOTATION_SELECT =
  "id, job_id, professional_id, labor_cost_etb, materials_cost_etb, notes, " +
  "proposed_start_at, valid_until, status, created_at, " +
  "job_requests ( title, customer_id )";

function toQuotationStatus(status: string): Quotation["status"] {
  switch (status) {
    case "submitted":
      return "sent";
    case "selected":
      return "accepted";
    case "declined":
      return "rejected";
    case "expired":
      return "expired";
    default:
      return "withdrawn";
  }
}

function toQuotation(
  row: QuotationRow,
  professionalName = "Professional",
): Quotation {
  const lines = [
    {
      id: `${row.id}-labor`,
      description: "Labour",
      quantity: 1,
      unitPrice: row.labor_cost_etb,
      total: row.labor_cost_etb,
    },
    {
      id: `${row.id}-materials`,
      description: "Materials",
      quantity: 1,
      unitPrice: row.materials_cost_etb,
      total: row.materials_cost_etb,
    },
  ];

  return {
    id: row.id,
    requestId: row.job_id,
    requestTitle: row.job_requests?.title ?? "Service request",
    customerId: row.job_requests?.customer_id ?? "",
    customerName: "Customer",
    professionalId: row.professional_id,
    professionalName,
    status: toQuotationStatus(row.status),
    lines,
    subtotal: row.labor_cost_etb,
    transportFee: row.materials_cost_etb,
    total: row.labor_cost_etb + row.materials_cost_etb,
    notes: row.notes,
    validUntil: row.valid_until,
    createdAt: row.created_at,
  };
}

async function professionalNames(
  supabase: any,
  ids: string[],
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const { data } = await supabase
    .from("professional_locations")
    .select("professional_id, full_name")
    .in("professional_id", ids);

  return new Map(
    ((data ?? []) as ProfessionalRow[]).map((row) => [
      row.professional_id,
      row.full_name ?? "Professional",
    ]),
  );
}

export async function listQuotations(
  filters: TableFilters & {
    customerId?: string;
    professionalId?: string;
    requestId?: string;
  } = {},
): Promise<Paginated<Quotation>> {
  const supabase = (await createClerkClient()) as any;
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;

  let query = supabase
    .from("quotations")
    .select(QUOTATION_SELECT, { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (filters.professionalId) {
    query = query.eq("professional_id", filters.professionalId);
  }
  if (filters.requestId) query = query.eq("job_id", filters.requestId);
  if (filters.status) {
    const dbStatus =
      filters.status === "sent"
        ? "submitted"
        : filters.status === "accepted"
          ? "selected"
          : filters.status === "rejected"
            ? "declined"
            : filters.status;
    query = query.eq("status", dbStatus);
  }

  const { data, count, error } = await query;

  if (error) {
    console.warn("[quotations] list failed:", error.message);
    return { data: [], page, pageSize, total: 0, totalPages: 0 };
  }

  const rows = (data ?? []) as unknown as QuotationRow[];
  const names = await professionalNames(
    supabase,
    [...new Set(rows.map((row) => row.professional_id))],
  );

  return {
    data: rows.map((row) =>
      toQuotation(row, names.get(row.professional_id) ?? "Professional"),
    ),
    page,
    pageSize,
    total: count ?? rows.length,
    totalPages: Math.ceil((count ?? rows.length) / pageSize),
  };
}

export async function getQuotation(id: string): Promise<Quotation | null> {
  const supabase = (await createClerkClient()) as any;
  const { data, error } = await supabase
    .from("quotations")
    .select(QUOTATION_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    if (error) console.warn("[quotations] get failed:", error.message);
    return null;
  }

  const row = data as unknown as QuotationRow;
  const names = await professionalNames(supabase, [row.professional_id]);
  return toQuotation(row, names.get(row.professional_id) ?? "Professional");
}

function toDbStatus(status: QuotationStatus): string {
  switch (status) {
    case "sent":
    case "draft":
      return "submitted";
    case "accepted":
      return "selected";
    case "rejected":
      return "declined";
    default:
      return status;
  }
}

/**
 * Create a quotation for a request.
 *
 * `professionalProfileId` is a `profiles.id` (what the session exposes), but
 * `quotations.professional_id` references `professionals.id`, so the row is
 * resolved first. The schema has two money columns, so the line items are
 * summed into `labor_cost_etb` and the transport fee becomes
 * `materials_cost_etb`.
 */
export type CreateQuotationResult =
  | { ok: true; quotation: Quotation }
  | { ok: false; error: string };

export async function createQuotation(
  professionalProfileId: string,
  customerId: string,
  input: QuotationCreateInput,
): Promise<CreateQuotationResult> {
  void customerId;
  const supabase = (await createClerkClient()) as any;

  const { data: professional, error: professionalError } = await supabase
    .from("professionals")
    .select("id, verification_status")
    .eq("profile_id", professionalProfileId)
    .maybeSingle();

  if (professionalError || !professional?.id) {
    console.error(
      "[quotations] professional lookup failed:",
      professionalError?.message,
    );
    return { ok: false, error: "We could not find your professional profile." };
  }

  // Professionals must be approved to submit quotations
  if (professional.verification_status !== "approved") {
    return {
      ok: false as const,
      error: professional.verification_status === "rejected" 
        ? "Your professional account has been rejected. Contact support to appeal." 
        : "Your professional account is pending verification. Please wait for approval before submitting quotations.",
    };
  }

  const labor = input.lines.reduce(
    (sum, line) => sum + line.quantity * line.unitPrice,
    0,
  );
  const materials = input.transportFee ?? 0;

  const { data, error } = await supabase
    .from("quotations")
    .insert({
      job_id: input.requestId,
      professional_id: professional.id,
      labor_cost_etb: labor,
      materials_cost_etb: materials,
      notes: input.notes ?? null,
      valid_until: input.validUntil,
    })
    .select(
      "id, job_id, professional_id, labor_cost_etb, materials_cost_etb, notes, " +
        "proposed_start_at, valid_until, status, created_at",
    )
    .single();

  if (error) {
    console.error("[quotations] create failed:", error.message);
    return { ok: false, error: "We could not send the quotation." };
  }

  return {
    ok: true,
    quotation: toQuotation(data as unknown as QuotationRow),
  };
}

export async function setQuotationStatus(
  id: string,
  status: QuotationStatus,
): Promise<boolean> {
  const supabase = (await createClerkClient()) as any;
  const { error } = await supabase
    .from("quotations")
    .update({ status: toDbStatus(status) })
    .eq("id", id);

  if (error) {
    console.error("[quotations] status update failed:", error.message);
    return false;
  }

  return true;
}
