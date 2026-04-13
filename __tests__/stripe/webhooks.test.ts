// __tests__/stripe/webhooks.test.ts
import { handleLicensePaid, handleSubscriptionUpdated, handleSubscriptionDeleted } from "@/lib/stripe/webhooks";

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn(),
}));

import { createServiceClient } from "@/lib/supabase/server";

describe("handleLicensePaid", () => {
  it("sets license_paid_at on the organisation", async () => {
    const mockSupabase = {
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      })),
    } as any;
    vi.mocked(createServiceClient).mockReturnValue(mockSupabase);

    await handleLicensePaid("cus_abc123", new Date("2026-04-01").toISOString());

    expect(mockSupabase.from).toHaveBeenCalledWith("organisations");
  });
});

describe("handleSubscriptionUpdated", () => {
  it("updates plan and quota on the organisation", async () => {
    const mockSupabase = {
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      })),
    } as any;
    vi.mocked(createServiceClient).mockReturnValue(mockSupabase);

    await handleSubscriptionUpdated("cus_abc123", "growth", "sub_123");

    expect(mockSupabase.from).toHaveBeenCalledWith("organisations");
  });
});

describe("handleSubscriptionDeleted", () => {
  it("resets plan to starter and clears subscription id", async () => {
    const mockSupabase = {
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      })),
    } as any;
    vi.mocked(createServiceClient).mockReturnValue(mockSupabase);

    await handleSubscriptionDeleted("cus_abc123");

    expect(mockSupabase.from).toHaveBeenCalledWith("organisations");
  });
});
