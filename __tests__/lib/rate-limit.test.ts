import { checkRateLimit, _setRedisForTesting } from "@/lib/api/rate-limit";

// Mock Redis instance that simulates INCR + EXPIRE in memory
function makeMockRedis() {
  const store = new Map<string, number>();
  return {
    incr: async (key: string) => {
      const val = (store.get(key) ?? 0) + 1;
      store.set(key, val);
      return val;
    },
    expire: async () => 1,
    _store: store,
    _reset: () => store.clear(),
  };
}

describe("checkRateLimit", () => {
  let mockRedis: ReturnType<typeof makeMockRedis>;

  beforeEach(() => {
    mockRedis = makeMockRedis();
    _setRedisForTesting(mockRedis as any);
  });

  it("allows requests under the limit", async () => {
    const result = await checkRateLimit("key-1");
    expect(result.allowed).toBe(true);
  });

  it("returns remaining count", async () => {
    const result = await checkRateLimit("key-1");
    expect(result.remaining).toBe(99);
  });

  it("tracks different keys independently", async () => {
    await checkRateLimit("key-1");
    await checkRateLimit("key-1");
    const result = await checkRateLimit("key-2");
    expect(result.remaining).toBe(99);
  });

  it("blocks when limit is reached", async () => {
    for (let i = 0; i < 100; i++) await checkRateLimit("key-1");
    const result = await checkRateLimit("key-1");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });
});
