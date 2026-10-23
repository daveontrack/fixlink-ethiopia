import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireProfessionalMock,
  requireAdminMock,
  createAdminClientMock,
  createClerkClientMock,
  uploadMock,
  removeMock,
  insertMock,
  updateMock,
  maybeSingleMock,
} = vi.hoisted(() => ({
  requireProfessionalMock: vi.fn(),
  requireAdminMock: vi.fn(),
  createAdminClientMock: vi.fn(),
  createClerkClientMock: vi.fn(),
  uploadMock: vi.fn(),
  removeMock: vi.fn(),
  insertMock: vi.fn(),
  updateMock: vi.fn(),
  maybeSingleMock: vi.fn(),
}));

vi.mock("@/lib/auth/guards", () => ({
  requireProfessional: requireProfessionalMock,
  requireAdmin: requireAdminMock,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: createAdminClientMock,
}));
vi.mock("@/lib/supabase/clerk", () => ({
  createClerkClient: createClerkClientMock,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { reviewVerification, submitDocument } from "@/features/verification/actions";

function fakeAdmin(professionalStatus = "pending") {
  const professionalsQuery: any = {};
  professionalsQuery.select = vi.fn(() => professionalsQuery);
  professionalsQuery.eq = vi.fn(() => professionalsQuery);
  professionalsQuery.maybeSingle = maybeSingleMock;

  updateMock.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

  const from = vi.fn((table: string) => {
    if (table === "professionals") {
      return Object.assign({}, professionalsQuery, { update: updateMock });
    }
    return { insert: insertMock };
  });

  const storage = {
    from: vi.fn(() => ({ upload: uploadMock, remove: removeMock })),
  };

  maybeSingleMock.mockResolvedValue({
    data: { id: "prof-1", verification_status: professionalStatus },
    error: null,
  });

  return { from, storage };
}

function documentForm(type = "id", file?: File) {
  const formData = new FormData();
  formData.set("type", type);
  if (file) formData.set("file", file);
  return formData;
}

const pdf = () =>
  new File([new Uint8Array([1, 2, 3])], "national-id.pdf", {
    type: "application/pdf",
  });

describe("Professional verification workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireProfessionalMock.mockResolvedValue({
      clerkUserId: "user_1",
      profileId: "11111111-1111-4111-8111-111111111111",
      role: "professional",
    });
    requireAdminMock.mockResolvedValue({
      clerkUserId: "user_admin",
      profileId: "99999999-9999-4999-8999-999999999999",
      role: "admin",
    });
    uploadMock.mockResolvedValue({ error: null });
    removeMock.mockResolvedValue({ error: null });
    insertMock.mockResolvedValue({ error: null });
    createAdminClientMock.mockReturnValue(fakeAdmin());
  });

  it("rejects a file type outside the private bucket's allow-list", async () => {
    const result = await submitDocument(
      documentForm(
        "id",
        new File(["hello"], "notes.txt", { type: "text/plain" }),
      ),
    );

    expect(result.ok).toBe(false);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("requires a file", async () => {
    const result = await submitDocument(documentForm("id"));
    expect(result.ok).toBe(false);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("uploads under the professional id and stores only the private path", async () => {
    const result = await submitDocument(documentForm("id", pdf()));

    expect(result.ok).toBe(true);
    const [path, , options] = uploadMock.mock.calls[0];
    expect(path).toMatch(/^prof-1\/[0-9a-f-]{36}\.pdf$/);
    expect(options).toMatchObject({
      contentType: "application/pdf",
      upsert: false,
    });

    expect(insertMock).toHaveBeenCalledWith({
      professional_id: "prof-1",
      document_type: "id_card",
      storage_path: path,
      original_file_name: "national-id.pdf",
    });
    // No public URL is ever written: the bucket is private.
    expect(JSON.stringify(insertMock.mock.calls[0][0])).not.toMatch(
      /http|public/i,
    );
  });

  it("returns a rejected professional to the pending queue on resubmission", async () => {
    createAdminClientMock.mockReturnValue(fakeAdmin("rejected"));

    const result = await submitDocument(documentForm("certificate", pdf()));

    expect(result.ok).toBe(true);
    expect(updateMock).toHaveBeenCalledWith({
      verification_status: "pending",
    });
  });

  it("keeps an approved professional approved when a new document is added", async () => {
    createAdminClientMock.mockReturnValue(fakeAdmin("approved"));
    await submitDocument(documentForm("id", pdf()));

    expect(updateMock).not.toHaveBeenCalled();
  });

  it("removes the uploaded object when the database row cannot be written", async () => {
    insertMock.mockResolvedValue({ error: { message: "insert failed" } });

    const result = await submitDocument(documentForm("id", pdf()));

    expect(result.ok).toBe(false);
    expect(removeMock).toHaveBeenCalledTimes(1);
  });

  it("sends the admin decision through the audited RPC, with the note", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    createClerkClientMock.mockResolvedValue({ rpc });

    const result = await reviewVerification(
      "55555555-5555-4555-8555-555555555555",
      "rejected",
      "The licence photo is unreadable.",
    );

    expect(rpc).toHaveBeenCalledWith("set_verification_status", {
      p_professional_id: "55555555-5555-4555-8555-555555555555",
      p_decision: "rejected",
      p_note: "The licence photo is unreadable.",
    });
    expect(result.ok).toBe(true);
  });

  it("reports an RPC failure instead of claiming the decision was saved", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    createClerkClientMock.mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({ error: { message: "admin_required" } }),
    });

    const result = await reviewVerification(
      "55555555-5555-4555-8555-555555555555",
      "approved",
    );

    expect(result.ok).toBe(false);
    error.mockRestore();
  });
});
