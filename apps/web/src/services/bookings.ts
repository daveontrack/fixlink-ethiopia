import "server-only";

import { createClerkClient } from "@/lib/supabase/clerk";
import type { Booking, BookingStatus, Paginated, TableFilters } from "@/types";

/**
 * The real booking table (see 20261020000700_quotations_and_bookings.sql):
 *   id, job_id, quotation_id, customer_id, professional_id,
 *   scheduled_at, status, accepted_at, started_at, completed_at,
 *   cancelled_at, cancellation_reason, created_at, updated_at
 *
 * Names/titles are not stored on the row, so they are fetched in a second
 * round trip from `job_requests` and the public `professional_locations` view.
 */
interface BookingRow {
  id: string;
  job_id: string;
  quotation_id: string;
  customer_id: string;
  professional_id: string;
  scheduled_at: string;
  status: string;
  created_at: string;
}

interface JobRow {
  id: string;
  title: string;
  area_name: string | null;
}

interface ProfessionalRow {
  professional_id: string;
  full_name: string | null;
}

interface QuotationRow {
  id: string;
  labor_cost_etb: number | null;
  materials_cost_etb: number | null;
}

const BOOKING_SELECT =
  "id, job_id, quotation_id, customer_id, professional_id, scheduled_at, status, created_at";

function toBookingStatus(status: string): BookingStatus {
  switch (status) {
    case "booked":
      return "confirmed";
    case "in_progress":
      return "in_progress";
    case "completed":
      return "completed";
    case "cancelled":
    case "disputed":
      return "cancelled";
    default:
      return "pending";
  }
}

async function enrich(
  supabase: any,
  rows: BookingRow[],
): Promise<Booking[]> {
  if (rows.length === 0) return [];

  const jobIds = [...new Set(rows.map((row) => row.job_id))];
  const professionalIds = [...new Set(rows.map((row) => row.professional_id))];
  const quotationIds = [...new Set(rows.map((row) => row.quotation_id))];

  const [jobsResult, professionalsResult, quotationsResult] = await Promise.all([
    supabase.from("job_requests").select("id, title, area_name").in("id", jobIds),
    supabase
      .from("professional_locations")
      .select("professional_id, full_name")
      .in("professional_id", professionalIds),
    supabase
      .from("quotations")
      .select("id, labor_cost_etb, materials_cost_etb")
      .in("id", quotationIds),
  ]);

  const jobs = new Map<string, JobRow>(
    ((jobsResult.data ?? []) as JobRow[]).map((job) => [job.id, job]),
  );
  const professionals = new Map<string, ProfessionalRow>(
    ((professionalsResult.data ?? []) as ProfessionalRow[]).map((row) => [
      row.professional_id,
      row,
    ]),
  );
  const quotations = new Map<string, QuotationRow>(
    ((quotationsResult.data ?? []) as QuotationRow[]).map((row) => [row.id, row]),
  );

  return rows.map((row) => {
    const job = jobs.get(row.job_id);
    const professional = professionals.get(row.professional_id);
    const quotation = quotations.get(row.quotation_id);
    const scheduled = new Date(row.scheduled_at);

    return {
      id: row.id,
      requestId: row.job_id,
      quotationId: row.quotation_id,
      customerId: row.customer_id,
      customerName: "Customer",
      customerPhone: null,
      professionalId: row.professional_id,
      professionalName: professional?.full_name ?? "Professional",
      professionalPhone: null,
      title: job?.title ?? "Booked service",
      status: toBookingStatus(row.status),
      paymentStatus: "unpaid",
      scheduledDate: row.scheduled_at,
      scheduledTime: Number.isNaN(scheduled.getTime())
        ? "09:00"
        : scheduled.toISOString().slice(11, 16),
      durationHours: 1,
      totalPrice:
        (quotation?.labor_cost_etb ?? 0) + (quotation?.materials_cost_etb ?? 0),
      address: job?.area_name ?? "Address shared in chat",
      notes: null,
      createdAt: row.created_at,
    };
  });
}

export async function listBookings(
  filters: TableFilters & {
    customerId?: string;
    professionalId?: string;
    scheduledAfter?: string;
  } = {},
): Promise<Paginated<Booking>> {
  const supabase = (await createClerkClient()) as any;
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;

  let query = supabase
    .from("bookings")
    .select(BOOKING_SELECT, { count: "exact" })
    .order("scheduled_at", { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (filters.customerId) query = query.eq("customer_id", filters.customerId);
  if (filters.professionalId) {
    query = query.eq("professional_id", filters.professionalId);
  }
  if (filters.scheduledAfter) {
    query = query.gt("scheduled_at", filters.scheduledAfter);
  }
  if (filters.status) {
    const databaseStatus =
      filters.status === "pending" || filters.status === "confirmed"
        ? "booked"
        : filters.status;
    query = query.eq("status", databaseStatus);
  }

  const { data, count, error } = await query;

  if (error) {
    console.warn("[bookings] list failed:", error.message);
    return { data: [], page, pageSize, total: 0, totalPages: 0 };
  }

  const rows = (data ?? []) as unknown as BookingRow[];
  const bookings = await enrich(supabase, rows);

  return {
    data: bookings,
    page,
    pageSize,
    total: count ?? rows.length,
    totalPages: Math.ceil((count ?? rows.length) / pageSize),
  };
}

export async function getBooking(id: string): Promise<Booking | null> {
  const supabase = (await createClerkClient()) as any;
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    if (error) console.warn("[bookings] get failed:", error.message);
    return null;
  }

  const [booking] = await enrich(supabase, [data as BookingRow]);
  return booking ?? null;
}

/**
 * A booking is created only by accepting a quotation. The database function
 * enforces the customer, validity and single-booking rules atomically.
 */
export async function createBooking(input: {
  quotationId?: string | null;
}): Promise<Booking | null> {
  if (!input.quotationId) {
    console.error("[bookings] create failed: quotationId is required");
    return null;
  }

  const supabase = (await createClerkClient()) as any;
  const { data, error } = await supabase.rpc("accept_quotation", {
    p_quotation_id: input.quotationId,
  });

  if (error || !data) {
    console.error("[bookings] create failed:", error?.message);
    return null;
  }

  const id = (Array.isArray(data) ? data[0] : data)?.id as string | undefined;
  return id ? getBooking(id) : null;
}

export async function updateBookingStatus(
  id: string,
  status: BookingStatus,
): Promise<boolean> {
  // "pending"/"confirmed" describe the database's "booked" state.
  if (status === "pending" || status === "confirmed") return true;

  const supabase = (await createClerkClient()) as any;
  const { error } = await supabase.rpc("transition_booking", {
    p_booking_id: id,
    p_to: status,
    p_reason: status === "cancelled" ? "Cancelled by user" : null,
  });

  if (error) {
    console.error("[bookings] status update failed:", error.message);
    return false;
  }

  return true;
}
