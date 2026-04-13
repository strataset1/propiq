import { extractBearerToken, validateApiKey } from "@/lib/api/auth";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn(),
}));

import { createServiceClient } from "@/lib/supabase/server";

describe("extractBearerToken", () => {
  it("extracts token from valid Authorization header", () => {
    const req = new NextRequest("http://localhost/api/v1/test", {
      headers: { Authorization: "Bearer sk_live_abc123" },
    });
    expect(extractBearerToken(req)).toBe("sk_live_abc123");
  });

  it("returns null when header is missing", () => {
    const req = new NextRequest("http://localhost/api/v1/test");
    expect(extractBearerToken(req)).toBeNull();
  });

  it("returns null when scheme is not Bearer", () => {
    const req = new NextRequest("http://localhost/api/v1/test", {
      headers: { Authorization: "Basic abc123" },
    });
    expect(extractBearerToken(req)).toBeNull();
  });
});

describe("validateApiKey", () => {
  it("returns error when no token", async () => {
    const req = new NextRequest("http://localhost/api/v1/test");
    const result = await validateApiKey(req);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("UNAUTHORIZED");
  });

  it("returns error when key not found in DB", async () => {
    vi.mocked(createServiceClient).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: async () => ({ data: null, error: { code: "PGRST116" } }),
            }),
          }),
        }),
      }),
    } as any);

    const req = new NextRequest("http://localhost/api/v1/test", {
      headers: { Authorization: "Bearer invalid-key" },
    });
    const result = await validateApiKey(req);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("UNAUTHORIZED");
  });

  it("returns error when org has not paid licensing fee", async () => {
    vi.mocked(createServiceClient).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  id: "key-1",
                  org_id: "org-1",
                  organisations: { id: "org-1", license_paid_at: null, monthly_quota: 500, plan: "starter" },
                },
                error: null,
              }),
            }),
          }),
        }),
      }),
    } as any);

    const req = new NextRequest("http://localhost/api/v1/test", {
      headers: { Authorization: "Bearer valid-key" },
    });
    const result = await validateApiKey(req);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });

  it("returns ok with org and apiKey when valid", async () => {
    const mockOrg = { id: "org-1", license_paid_at: "2026-01-01", monthly_quota: 500, plan: "starter" };
    vi.mocked(createServiceClient).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: async () => ({
                data: { id: "key-1", org_id: "org-1", organisations: mockOrg },
                error: null,
              }),
            }),
          }),
        }),
      }),
    } as any);

    const req = new NextRequest("http://localhost/api/v1/test", {
      headers: { Authorization: "Bearer valid-key" },
    });
    const result = await validateApiKey(req);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.apiKey.id).toBe("key-1");
      expect(result.org.id).toBe("org-1");
    }
  });
});
