import { sha256 } from "@/lib/utils/hash";
import { createHash } from "crypto";

describe("sha256", () => {
  it("returns a 64-character hex string", () => {
    const result = sha256("hello");
    expect(result).toHaveLength(64);
    expect(result).toMatch(/^[0-9a-f]+$/);
  });

  it("is deterministic", () => {
    expect(sha256("test-key")).toBe(sha256("test-key"));
  });

  it("produces different hashes for different inputs", () => {
    expect(sha256("key-a")).not.toBe(sha256("key-b"));
  });

  it("matches Node crypto output", () => {
    const input = "propiq-test-key-123";
    const expected = createHash("sha256").update(input).digest("hex");
    expect(sha256(input)).toBe(expected);
  });
});
