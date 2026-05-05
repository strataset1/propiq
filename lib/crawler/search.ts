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

  const completion = await client.chat.completions.create({
    model: "gpt-4o-search-preview",
    messages: [
      {
        role: "user",
        content: `Search the web for strata by-law PDF documents for properties in ${suburb}, Australia.

Look for direct .pdf links from:
- Strata management companies (BCS Strata, PICA, Strata Plus, Netstrata, Strata Choice, Bright & Duggan)
- Building or strata plan specific websites
- Property management portals

Try searches like:
- "${suburb}" strata by-laws filetype:pdf
- "${suburb}" consolidated by-laws SP filetype:pdf
- site:bcsstrata.com.au "${suburb}" by-laws

Return ONLY a raw JSON array with no markdown, no explanation:
[{"url":"https://...","title":"..."}]

If none found, return: []`,
      },
    ],
  });

  const text = completion.choices[0]?.message?.content ?? "";

  // Extract PDF URLs directly from the response text as primary method
  const urlMatches = [...text.matchAll(/https?:\/\/[^\s"')\]]+\.pdf/gi)]
    .map((m) => ({ url: m[0].replace(/[,.]$/, ""), title: "" }));

  // Also try parsing a JSON array if present
  try {
    const match = text.match(/\[[\s\S]*?\]/);
    if (match) {
      const parsed = JSON.parse(match[0]) as { url: string; title: string }[];
      if (parsed.length > 0) {
        const combined = [...parsed, ...urlMatches];
        const seen = new Set<string>();
        return combined
          .filter((r) => isPdfUrl(r.url) && !isNoisy(r.url) && !seen.has(r.url) && seen.add(r.url))
          .slice(0, 10);
      }
    }
  } catch {
    // fall through
  }

  const seen = new Set<string>();
  return urlMatches
    .filter((r) => isPdfUrl(r.url) && !isNoisy(r.url) && !seen.has(r.url) && seen.add(r.url))
    .slice(0, 10);
}
