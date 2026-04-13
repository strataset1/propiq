// __tests__/admin/upload.test.ts
import { POST } from "@/app/api/admin/upload/route";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn(),
}));

vi.mock("@/lib/utils/address", () => ({
  normaliseAddress: vi.fn().mockResolvedValue("12 smith st sydney nsw 2000"),
}));

vi.mock("@/lib/utils/hash", () => ({
  sha256: vi.fn().mockReturnValue("abc123hash"),
}));

import { createServiceClient } from "@/lib/supabase/server";

function makeRequest(body: FormData, secret = "test-secret"): NextRequest {
  return new NextRequest("http://localhost/api/admin/upload", {
    method: "POST",
    headers: { "x-admin-secret": secret },
    body,
  });
}

describe("POST /api/admin/upload", () => {
  beforeEach(() => {
    process.env.ADMIN_SECRET = "test-secret";
  });

  it("returns 401 when admin secret is wrong", async () => {
    const form = new FormData();
    const req = makeRequest(form, "wrong-secret");
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when required fields are missing", async () => {
    // Mock supabase so it doesn't blow up before the validation check
    vi.mocked(createServiceClient).mockReturnValue({} as any);

    const form = new FormData();
    // no file, address, type, label
    const req = makeRequest(form);
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 200 for duplicate document (same hash)", async () => {
    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "properties") {
          return {
            upsert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: "prop-1", address_raw: "12 Smith St", address_normalised: "12 smith st" },
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === "documents") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { id: "doc-existing" }, error: null }),
              })),
            })),
          };
        }
        return {};
      }),
    } as any;
    vi.mocked(createServiceClient).mockReturnValue(mockSupabase);

    const form = new FormData();
    form.append("address", "12 Smith St, Sydney NSW 2000");
    form.append("type", "strata");
    form.append("label", "Test Report");
    form.append("file", new Blob(["pdf content"], { type: "application/pdf" }), "test.pdf");

    const req = makeRequest(form);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.document_id).toBe("doc-existing");
  });

  it("returns 200 with new document_id after successful upload", async () => {
    const mockStorage = {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
      })),
    };

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "properties") {
          return {
            upsert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: "prop-2", address_raw: "5 Park Rd", address_normalised: "5 park rd" },
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === "documents") {
          return {
            // First call: select for dedup check — returns no existing doc
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
              })),
            })),
            // Second call: insert new doc
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: "doc-new" },
                  error: null,
                }),
              })),
            })),
          };
        }
        return {};
      }),
      storage: mockStorage,
    } as any;
    vi.mocked(createServiceClient).mockReturnValue(mockSupabase);

    const form = new FormData();
    form.append("address", "5 Park Rd, Sydney NSW 2000");
    form.append("type", "contract");
    form.append("label", "Contract of Sale");
    form.append("file", new Blob(["pdf content"], { type: "application/pdf" }), "contract.pdf");

    const req = makeRequest(form);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.document_id).toBe("doc-new");
    expect(body.property_id).toBe("prop-2");
  });

  it("returns 500 when property upsert fails", async () => {
    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "properties") {
          return {
            upsert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: "DB error" },
                }),
              })),
            })),
          };
        }
        return {};
      }),
    } as any;
    vi.mocked(createServiceClient).mockReturnValue(mockSupabase);

    const form = new FormData();
    form.append("address", "1 Fail St");
    form.append("type", "strata");
    form.append("label", "Report");
    form.append("file", new Blob(["data"], { type: "application/pdf" }), "report.pdf");

    const req = makeRequest(form);
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
