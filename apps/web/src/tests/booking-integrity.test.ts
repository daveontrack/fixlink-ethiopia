import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireCustomerMock, getQuotationMock, createBookingMock } =
  vi.hoisted(() => ({
    requireCustomerMock: vi.fn(),
    getQuotationMock: vi.fn(),
    createBookingMock: vi.fn(),
  }));

vi.mock("@/lib/auth/guards", () => ({ requireCustomer: requireCustomerMock }));
vi.mock("@/services/quotations", () => ({
  getQuotation: getQuotationMock,
  setQuotationStatus: vi.fn(),
}));
vi.mock("@/services/bookings", () => ({ createBooking: createBookingMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { acceptQuotation } from "@/features/quotations/actions";

const CUSTOMER = {
  clerkUserId: "user_customer",
  profileId: "11111111-1111-4111-8111-111111111111",
  role: "customer",
  fullName: "Customer",
  email: "customer@example.com",
  imageUrl: null,
};

function quotation(overrides: Record<string, unknown> = {}) {
  return {
    id: "44444444-4444-4444-8444-444444444444",
    requestId: "33333333-3333-4333-8333-333333333333",
    requestTitle: "Leaking tap",
    customerId: CUSTOMER.profileId,
    customerName: "Customer",
    professionalId: "55555555-5555-4555-8555-555555555555",
    professionalName: "Plumber",
    status: "sent",
    lines: [],
    subtotal: 200,
    transportFee: 50,
    total: 250,
    notes: null,
    validUntil: "2026-10-30T00:00:00.000Z",
    createdAt: "2026-10-23T00:00:00.000Z",
    ...overrides,
  };
}

describe("Booking integrity on quotation acceptance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireCustomerMock.mockResolvedValue(CUSTOMER);
  });

  it("refuses a quotation that belongs to another customer", async () => {
    getQuotationMock.mockResolvedValue(
      quotation({ customerId: "99999999-9999-4999-8999-999999999999" }),
    );

    const result = await acceptQuotation("44444444-4444-4444-8444-444444444444");

    expect(result).toEqual({
      ok: false,
      error: "This quotation belongs to another customer.",
    });
    expect(createBookingMock).not.toHaveBeenCalled();
  });

  it("refuses a quotation that is no longer open", async () => {
    getQuotationMock.mockResolvedValue(quotation({ status: "accepted" }));

    const result = await acceptQuotation("44444444-4444-4444-8444-444444444444");

    expect(result.ok).toBe(false);
    expect(createBookingMock).not.toHaveBeenCalled();
  });

  it("creates the booking only through createBooking (the DB function)", async () => {
    getQuotationMock.mockResolvedValue(quotation());
    createBookingMock.mockResolvedValue({ id: "booking-1" });

    const result = await acceptQuotation("44444444-4444-4444-8444-444444444444");

    expect(createBookingMock).toHaveBeenCalledWith({
      quotationId: "44444444-4444-4444-8444-444444444444",
    });
    expect(result).toEqual({ ok: true, bookingId: "booking-1" });
  });

  it("reports a failure when the database refuses the booking", async () => {
    getQuotationMock.mockResolvedValue(quotation());
    createBookingMock.mockResolvedValue(null);

    const result = await acceptQuotation("44444444-4444-4444-8444-444444444444");

    expect(result).toEqual({
      ok: false,
      error: "We could not create the booking.",
    });
  });
});
