import OpenAI from "openai";

const NOISE_FILENAME_PATTERNS = [
  "handbook", "guide", "overview", "factsheet", "fact-sheet", "fact_sheet",
  "template", "sample", "example", "information", "newsletter",
  "annual-report", "annual_report", "brochure", "presentation", "slideshow",
];

const NOISE_DOMAINS = [
  "parliament.nsw.gov.au", "nsw.gov.au", "legislation.nsw.gov.au",
  "austlii.edu.au", "planning.nsw.gov.au", "vic.gov.au",
  "legislation.vic.gov.au", "abs.gov.au", "fairtrading.nsw.gov.au",
  "consumer.vic.gov.au",
];

function isNoisy(url: string): boolean {
  if (NOISE_DOMAINS.some((d) => url.includes(d))) return true;
  const filename = url.split("/").pop()?.toLowerCase() ?? "";
  return NOISE_FILENAME_PATTERNS.some((p) => filename.includes(p));
}

function isPdfUrl(url: string): boolean {
  return url.toLowerCase().endsWith(".pdf");
}

export type SearchResult = {
  url: string;
  title: string;
};

export async function searchSuburbForPdfs(suburb: string): Promise<SearchResult[]> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.responses.create({
    model: "gpt-4o",
    tools: [{ type: "web_search_preview" }],
    input: `Search the web for strata by-law PDF documents for properties in ${suburb}, Australia.

Look for:
- Strata by-laws or consolidated by-laws for specific strata plans or buildings in ${suburb}
- Documents from strata management companies (BCS Strata, Strata Plus, PICA, Strata Choice, Netstrata, etc.)
- Building-specific websites with by-law documents
- Property management portals with downloadable PDFs

Search using queries like:
- "${suburb} strata by-laws PDF"
- "${suburb} consolidated by-laws filetype:pdf"
- site:bcsstrata.com.au OR site:strataplus.com.au "${suburb}" bylaws

Return a JSON array of all PDF URLs you find. Include any that look like genuine strata by-law documents even if you're not 100% certain. Format:
[{"url": "https://...", "title": "..."}]

If you find no PDF URLs at all, return: []`,
  });

  // Extract text from response
  const text = response.output
    .filter((block): block is Extract<typeof block, { type: "message" }> => block.type === "message")
    .flatMap((block) => block.content)
    .filter((c): c is Extract<typeof c, { type: "output_text" }> => c.type === "output_text")
    .map((c) => c.text)
    .join("");

  // Extract all PDF URLs mentioned anywhere in the response as fallback
  const urlsFromText = [...text.matchAll(/https?:\/\/[^\s"')]+\.pdf/gi)]
    .map((m) => ({ url: m[0], title: "" }));

  // Try to parse the JSON array first
  try {
    const match = text.match(/\[[\s\S]*?\]/);
    if (match) {
      const parsed = JSON.parse(match[0]) as { url: string; title: string }[];
      if (parsed.length > 0) {
        return parsed.filter((r) => isPdfUrl(r.url) && !isNoisy(r.url));
      }
    }
  } catch {
    // fall through to regex extraction
  }

  // Fallback: extract PDF URLs directly from the response text
  return urlsFromText.filter((r) => isPdfUrl(r.url) && !isNoisy(r.url));
}
