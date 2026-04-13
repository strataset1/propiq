import { checkRateLimit, _resetForTesting } from "@/lib/api/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => _resetForTesting());

  it("allows requests under the limit", () => {
    const result = checkRateLimit("key-1");
    expect(result.allowed).toBe(true);
  });

  it("returns remaining count", () => {
    const result = checkRateLimit("key-1");
    expect(result.remaining).toBe(99);
  });

  it("tracks different keys independently", () => {
    checkRateLimit("key-1");
    checkRateLimit("key-1");
    const result = checkRateLimit("key-2");
    expect(result.remaining).toBe(99);
  });

  it("blocks when limit is reached", () => {
    for (let i = 0; i < 100; i++) checkRateLimit("key-1");
    const result = checkRateLimit("key-1");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });
});
