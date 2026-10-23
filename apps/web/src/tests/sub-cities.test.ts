import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));

import { listSubCities } from "@/services/sub-cities";

function builder(result: unknown) {
  const query: any = {};
  query.select = vi.fn(() => query);
  query.order = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.then = (resolve: any, reject: any) =>
    Promise.resolve(result).then(resolve, reject);
  return query;
}

const ROW = {
  code: "sabian",
  name: "Sabian",
  name_am: null,
  name_om: null,
  sort_order: 10,
  is_active: true,
  source: "OCHA COD-AB ET via openadmindata.org (retrieved 2026-10-23)",
  source_code: "ET150103",
};

describe("Service area list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("offers only active rows to the forms", async () => {
    const query = builder({ data: [ROW], error: null });
    createClientMock.mockResolvedValue({
      from: vi.fn(() => query),
    });

    const result = await listSubCities();

    expect(query.eq).toHaveBeenCalledWith("is_active", true);
    expect(result.error).toBeNull();
    expect(result.data).toEqual([
      {
        code: "sabian",
        name: "Sabian",
        nameAm: null,
        nameOm: null,
        sortOrder: 10,
        isActive: true,
        source: "OCHA COD-AB ET via openadmindata.org (retrieved 2026-10-23)",
        sourceCode: "ET150103",
      },
    ]);
  });

  it("can include inactive rows for the administrator screen", async () => {
    const query = builder({ data: [], error: null });
    createClientMock.mockResolvedValue({ from: vi.fn(() => query) });

    await listSubCities({ includeInactive: true });

    expect(query.eq).not.toHaveBeenCalled();
  });

  it("returns a user-facing message instead of throwing on query errors", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const query = builder({ data: null, error: { message: "boom" } });
    createClientMock.mockResolvedValue({ from: vi.fn(() => query) });

    const result = await listSubCities();

    expect(result.data).toEqual([]);
    expect(result.error).toBe("We could not load the service areas.");
    warn.mockRestore();
  });
});
