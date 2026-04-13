// __tests__/supabase-client.test.ts
import { createClient } from "@/lib/supabase/client";

describe("Supabase browser client", () => {
  it("initialises with env vars", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";

    const client = createClient();

    expect(client).toBeDefined();
  });
});
