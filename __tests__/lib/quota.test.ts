import { checkQuota, recordUsage } from "@/lib/api/quota";

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn(),
}));

import { createServiceClient } from "@/lib/supabase/server";

describe("checkQuota", () => {
  it("allows when usage is under quota", async () => {
    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            gte: async () => ({ count: 50, error: null }),
          }),
        }),
      }),
    } as any;

    const result = await checkQuota("org-1", 500, mockSupabase);
    expect(result.allowed).toBe(true);
    expect(result.used).toBe(50);
    expect(result.remaining).toBe(450);
  });

  it("blocks when quota is exhausted", async () => {
    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            gte: async () => ({ count: 500, error: null }),
          }),
        }),
      }),
    } as any;

    const result = await checkQuota("org-1", 500, mockSupabase);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });
});
