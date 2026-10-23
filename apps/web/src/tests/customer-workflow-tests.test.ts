import { beforeEach, describe, expect, it, vi } from "vitest";

import { requestSchema } from "@/features/requests/schema";

const { createClerkClientMock } = vi.hoisted(() => ({
  createClerkClientMock: vi.fn(),
}));

vi.mock("@/lib/supabase/clerk", () => ({
  createClerkClient: createClerkClientMock,
}));

import { createRequest, listRequests } from "@/services/requests";

const CATEGORY_ID = "22222222-2222-4222-8222-222222222222";

const validRequest = {
  categoryId: CATEGORY_ID,
  title: "Leaking kitchen tap",
  description: "The kitchen tap drips constantly and needs a new washer.",
  priority: "normal" as const,
  subCityCode: "sabian",
};

function jobRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "33333333-3333-4333-8333-333333333333",
    customer_id: "11111111-1111-4111-8111-111111111111",
    category_id: CATEGORY_ID,
    title: validRequest.title,
    description: validRequest.description,
    status: "open",
    priority: "normal",
    sub_city_code: "sabian",
    area_name: "Sabian",
    created_at: "2026-10-23T00:00:00.000Z",
    updated_at: "2026-10-23T00:00:00.000Z",
    customer: { full_name: "Test Customer" },
    category: null,
    ...overrides,
  };
}

describe("Customer request form", () => {
  it("accepts a complete request", () => {
    expect(requestSchema.safeParse(validRequest).success).toBe(true);
  });

  it("rejects a missing category, short title and unknown priority", () => {
    const result = requestSchema.safeParse({
      ...validRequest,
      categoryId: "not-a-uuid",
      title: "tap",
      priority: "later",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a request without a sub-city", () => {
    const result = requestSchema.safeParse({ ...validRequest, subCityCode: "" });
    expect(result.success).toBe(false);
  });
});

describe("Customer request service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates the request through the approved RPC with the chosen sub-city", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: jobRow(), error: null });
    createClerkClientMock.mockResolvedValue({ rpc });

    const created = await createRequest("11111111-1111-4111-8111-111111111111", {
      categoryId: CATEGORY_ID,
      title: validRequest.title,
      description: validRequest.description,
      priority: "normal",
      subCityCode: "sabian",
    });

    expect(rpc).toHaveBeenCalledWith("create_job_request", {
      p_category_id: CATEGORY_ID,
      p_title: validRequest.title,
      p_description: validRequest.description,
      p_sub_city_code: "sabian",
      p_priority: "normal",
    });
    expect(created).toMatchObject({ subCity: "sabian", status: "open" });
  });

  it("returns null and logs when the RPC rejects the request", async () => {
    const warn = vi.spyOn(console, "error").mockImplementation(() => {});
    const rpc = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: "unknown_sub_city" } });
    createClerkClientMock.mockResolvedValue({ rpc });

    const created = await createRequest("customer", {
      categoryId: CATEGORY_ID,
      title: validRequest.title,
      description: validRequest.description,
      priority: "normal",
      subCityCode: "not-a-real-kebele",
    });

    expect(created).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("scopes the customer list to the caller's profile", async () => {
    const range = vi.fn().mockResolvedValue({ data: [jobRow()], count: 1, error: null });
    const builder: any = {
      select: vi.fn(() => builder),
      order: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      range,
    };
    createClerkClientMock.mockResolvedValue({ from: vi.fn(() => builder) });

    const page = await listRequests("11111111-1111-4111-8111-111111111111");

    expect(builder.eq).toHaveBeenCalledWith(
      "customer_id",
      "11111111-1111-4111-8111-111111111111",
    );
    expect(page.total).toBe(1);
    expect(page.data[0]?.subCity).toBe("sabian");
  });
});
