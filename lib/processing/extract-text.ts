// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdf = require("pdf-parse") as (buffer: Buffer) => Promise<{ text: string; numpages: number }>;

export type ExtractResult = {
  text: string;
  pageCount: number;
  likelyScanned: boolean;
};

const MIN_CHARS_PER_PAGE = 50;

export function isLikelyScanned(text: string, pageCount: number): boolean {
  if (pageCount <= 1) return false;
  const charsPerPage = text.length / pageCount;
  return charsPerPage < MIN_CHARS_PER_PAGE;
}

export async function extractText(pdfBuffer: Buffer): Promise<ExtractResult> {
  const parsed = await pdf(pdfBuffer);
  const text = parsed.text.trim();
  const pageCount = parsed.numpages;
  const likelyScanned = isLikelyScanned(text, pageCount);

  return { text, pageCount, likelyScanned };
}
