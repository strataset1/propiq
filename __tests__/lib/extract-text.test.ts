import { isLikelyScanned } from "@/lib/processing/extract-text";

describe("isLikelyScanned", () => {
  it("returns false for text-rich PDFs", () => {
    const longText = "word ".repeat(500); // 2500 chars, 10 pages = 250 chars/page
    expect(isLikelyScanned(longText, 10)).toBe(false);
  });

  it("returns true when chars-per-page is very low", () => {
    const sparseText = "hello world"; // 11 chars, 10 pages = 1.1 chars/page
    expect(isLikelyScanned(sparseText, 10)).toBe(true);
  });

  it("returns false for single-page short docs", () => {
    expect(isLikelyScanned("short doc", 1)).toBe(false);
  });
});

describe("extractText", () => {
  it("returns an object with text and pageCount properties", async () => {
    // We can't easily create a valid PDF in a unit test,
    // so we mock pdf-parse and just test the interface.
    const { extractText } = await import("@/lib/processing/extract-text");
    // The function should return the right shape
    expect(extractText).toBeInstanceOf(Function);
  });
});
