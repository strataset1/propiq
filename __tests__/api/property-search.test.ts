// __tests__/api/property-search.test.ts
import { GET } from "@/app/api/v1/property/search/route";
import { NextRequest } from "next/server";

vi.mock("@/lib/api/with-auth", () => ({
  withAuth: (handler: any) => (req: any, ctx: any) =>
    handler(req, ctx, {
      org: { id: "org-1", license_paid_at: "2026-01-01", monthly_quota: 500, plan: "starter" },
      apiKey: { id: "key-1", org_id: "org-1" },
    }),
}));

vi.mock("@/lib/utils/address", () => ({
  normaliseAddress: vi.fn(async (s: string) => s.toLowerCase().trim()),
}));

vi.mock("@/lib/db/properties", () => ({
  findPropertyByAddress: vi.fn(),
  findPropertySummary: vi.fn(),
  createProperty: vi.fn(),
}));

vi.mock("@/lib/db/documents", () => ({
  findDocumentsByProperty: vi.fn(),
}));

vi.mock("@/lib/api/quota", () => ({
  recordUsage: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn(() => ({})),
}));

import { findPropertyByAddress, findPropertySummary, createProperty } from "@/lib/db/properties";
import { findDocumentsByProperty } from "@/lib/db/documents";

describe("GET /v1/property/search", () => {
  it("returns 400 when address param is missing", async () => {
    const req = new NextRequest("http://localhost/api/v1/property/search");
    const res = await GET(req, {});
    expect(res.status).toBe(400);
  });

  it("returns 200 with property data when found and ready", async () => {
    vi.mocked(findPropertyByAddress).mockResolvedValue({
      id: "prop-1", address_raw: "12 Smith St", address_normalised: "12 smith st",
      suburb: "Sydney", state: "NSW", postcode: "2000", status: "ready",
      last_crawled_at: null, created_at: "2026-01-01",
    });
    vi.mocked(findPropertySummary).mockResolvedValue({
      id: "sum-1", property_id: "prop-1", summary: "A nice flat",
      checklist: { pets_allowed: { value: "yes", detail: "Cats ok" } },
      confidence: 0.9, model_version: "claude-sonnet-4-6", generated_at: "2026-01-01",
    });
    vi.mocked(findDocumentsByProperty).mockResolvedValue([
      { id: "doc-1", property_id: "prop-1", type: "strata", label: "Strata Report",
        source_url: null, storage_path: null, file_hash: null, page_count: 80,
        ingested_via: "manual", processed_at: "2026-01-01", created_at: "2026-01-01" },
    ]);

    const req = new NextRequest("http://localhost/api/v1/property/search?address=12+Smith+St");
    const res = await GET(req, {});
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.property_id).toBe("prop-1");
    expect(body.summary).toBe("A nice flat");
    expect(body.documents).toHaveLength(1);
  });

  it("returns 202 when property not yet in DB", async () => {
    vi.mocked(findPropertyByAddress).mockResolvedValue(null);
    vi.mocked(createProperty).mockResolvedValue({
      id: "prop-new", address_raw: "unknown address", address_normalised: "unknown address",
      suburb: null, state: null, postcode: null, status: "processing",
      last_crawled_at: null, created_at: "2026-01-01",
    });

    const req = new NextRequest("http://localhost/api/v1/property/search?address=unknown+address");
    const res = await GET(req, {});
    expect(res.status).toBe(202);

    const body = await res.json();
    expect(body.job_id).toBeDefined();
  });

  it("returns 202 when property is still processing", async () => {
    vi.mocked(findPropertyByAddress).mockResolvedValue({
      id: "prop-2", address_raw: "5 Park Rd", address_normalised: "5 park rd",
      suburb: null, state: null, postcode: null, status: "processing",
      last_crawled_at: null, created_at: "2026-01-01",
    });

    const req = new NextRequest("http://localhost/api/v1/property/search?address=5+Park+Rd");
    const res = await GET(req, {});
    expect(res.status).toBe(202);
  });
});
