import { normaliseAddress } from "@/lib/utils/address";

describe("normaliseAddress", () => {
  it("lowercases and trims whitespace", async () => {
    const result = await normaliseAddress("  12 Smith St  ");
    expect(result).toBe("12 smith st");
  });

  it("collapses multiple spaces", async () => {
    const result = await normaliseAddress("12  Smith   Street");
    expect(result).toBe("12 smith street");
  });

  it("removes trailing comma", async () => {
    const result = await normaliseAddress("12 Smith St, Sydney NSW 2000,");
    expect(result).toBe("12 smith st sydney nsw 2000");
  });

  it("handles already-clean input", async () => {
    const result = await normaliseAddress("12 smith st sydney nsw 2000");
    expect(result).toBe("12 smith st sydney nsw 2000");
  });
});
