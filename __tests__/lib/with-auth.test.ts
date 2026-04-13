import { withAuth } from "@/lib/api/with-auth";
import { NextRequest } from "next/server";

vi.mock("@/lib/api/auth", () => ({
  validateApiKey: vi.fn(),
}));
vi.mock("@/lib/api/rate-limit", () => ({
  checkRateLimit: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn(() => ({})),
}));
vi.mock("@/lib/api/quota", () => ({
  checkQuota: vi.fn(),
}));

import { validateApiKey } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { checkQuota } from "@/lib/api/quota";

const mockOrg = { id: "org-1", license_paid_at: "2026-01-01", monthly_quota: 500, plan: "starter" };
const mockKey = { id: "key-1", org_id: "org-1" };

describe("withAuth", () => {
  beforeEach(() => {
    vi.mocked(validateApiKey).mockResolvedValue({ ok: true, org: mockOrg, apiKey: mockKey });
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, remaining: 99 });
    vi.mocked(checkQuota).mockResolvedValue({ allowed: true, used: 10, remaining: 490 });
  });

  it("calls handler with org and apiKey when all checks pass", async () => {
    const handler = vi.fn().mockResolvedValue(new Response("ok"));
    const wrappedHandler = withAuth(handler);
    const req = new NextRequest("http://localhost/api/v1/test");

    await wrappedHandler(req, {});

    expect(handler).toHaveBeenCalledWith(
      req,
      {},
      expect.objectContaining({ org: mockOrg, apiKey: mockKey })
    );
  });

  it("returns 401 when auth fails", async () => {
    vi.mocked(validateApiKey).mockResolvedValue({ ok: false, code: "UNAUTHORIZED" as any });
    const handler = vi.fn();
    const wrappedHandler = withAuth(handler);
    const req = new NextRequest("http://localhost/api/v1/test");

    const res = await wrappedHandler(req, {});

    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: false, remaining: 0 });
    const handler = vi.fn();
    const wrappedHandler = withAuth(handler);
    const req = new NextRequest("http://localhost/api/v1/test");

    const res = await wrappedHandler(req, {});
    expect(res.status).toBe(429);
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns 429 when quota exceeded", async () => {
    vi.mocked(checkQuota).mockResolvedValue({ allowed: false, used: 500, remaining: 0 });
    const handler = vi.fn();
    const wrappedHandler = withAuth(handler);
    const req = new NextRequest("http://localhost/api/v1/test");

    const res = await wrappedHandler(req, {});
    expect(res.status).toBe(429);
    expect(handler).not.toHaveBeenCalled();
  });
});
