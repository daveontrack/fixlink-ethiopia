import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClerkClientMock } = vi.hoisted(() => ({
  createClerkClientMock: vi.fn(),
}));

vi.mock("@/lib/supabase/clerk", () => ({
  createClerkClient: createClerkClientMock,
}));

import { createQuotation } from "@/services/quotations";

const ROW = {
  id: "44444444-4444-4444-8444-444444444444",
  job_id: "33333333-3333-4333-8333-333333333333",
  professional_id: "55555555-5555-4555-8555-555555555555",
  labor_cost_etb: 200,
  materials_cost_etb: 50,
  notes: "Includes a new washer",
  proposed_start_at: null,
  valid_until: "2026-10-30T00:00:00.000Z",
  status: "submitted",
  created_at: "2026-10-23T00:00:00.000Z",
  job_requests: { title: "Leaking tap", customer_id: "customer-1" },
};

function fakeClient(verificationStatus: string) {
  const professionalQuery: any = {};
  professionalQuery.select = vi.fn(() => professionalQuery);
  professionalQuery.eq = vi.fn(() => professionalQuery);
  professionalQuery.maybeSingle = vi.fn().mockResolvedValue({
    data: { id: ROW.professional_id, verification_status: verificationStatus },
    error: null,
  });

  const quotationQuery: any = {};
  quotationQuery.insert = vi.fn(() => quotationQuery);
  quotationQuery.select = vi.fn(() => quotationQuery);
  quotationQuery.single = vi
    .fn()
    .mockResolvedValue({ data: ROW, error: null });

  const from = vi.fn((table: string) =>
    table === "professionals" ? professionalQuery : quotationQuery,
  );

  return { from, quotationQuery, professionalQuery };
}

const input = {
  requestId: ROW.job_id,
  lines: [
    { description: "Replace washer", quantity: 2, unitPrice: 100 },
  ],
  transportFee: 50,
  notes: "Includes a new washer",
  validUntil: "2026-10-30",
};

describe("Professional quotations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks a professional who is not approved", async () => {
    const { from, quotationQuery } = fakeClient("pending");
    createClerkClientMock.mockResolvedValue({ from });

    const result = await createQuotation("profile-1", "customer-1", input);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/pending verification/i);
    }
    expect(quotationQuery.insert).not.toHaveBeenCalled();
  });

  it("blocks a rejected professional with an appeal message", async () => {
    const { from } = fakeClient("rejected");
    createClerkClientMock.mockResolvedValue({ from });

    const result = await createQuotation("profile-1", "customer-1", input);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/rejected/i);
  });

  it("sums the line items into labor and transport into materials", async () => {
    const { from, quotationQuery } = fakeClient("approved");
    createClerkClientMock.mockResolvedValue({ from });

    const result = await createQuotation("profile-1", "customer-1", input);

    const inserted = quotationQuery.insert.mock.calls[0][0];
    expect(inserted).toMatchObject({
      job_id: ROW.job_id,
      professional_id: ROW.professional_id,
      labor_cost_etb: 200,
      materials_cost_etb: 50,
      notes: "Includes a new washer",
    });
    // The database default is `submitted`; the service must not send a
    // status the professional could choose.
    expect(inserted).not.toHaveProperty("status");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.quotation).toMatchObject({
        id: ROW.id,
        subtotal: 200,
        transportFee: 50,
        total: 250,
        status: "sent",
      });
    }
  });
});
