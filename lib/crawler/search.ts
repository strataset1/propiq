import OpenAI from "openai";
import { getSearchTerms } from "./postcodes";

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
  const { city, postcode } = getSearchTerms(suburb);

  // Use postcode if known — strata docs always have postcode, rarely suburb name
  const locationTerm = postcode ? `${city} ${postcode}` : city;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-search-preview",
    messages: [
      {
        role: "user",
        content: `Search the web for strata by-law PDF documents for residential buildings in ${locationTerm}, Australia.

Search for:
- "${locationTerm}" strata by-laws filetype:pdf
- "${locationTerm}" consolidated by-laws filetype:pdf
- strata plan by-laws "${postcode ?? city}" filetype:pdf
- site:bcsstrata.com.au "${locationTerm}" by-laws
- site:netstrata.com.au "${locationTerm}" by-laws

Return ONLY a raw JSON array of direct PDF URLs you find, no markdown, no explanation:
[{"url":"https://...","title":"..."}]

If none found, return: []`,
      },
    ],
  });

  const text = completion.choices[0]?.message?.content ?? "";
  console.log(`[search] ${suburb} → model output:`, text.slice(0, 500));

  // Extract PDF URLs directly from response text
  const urlMatches = [...text.matchAll(/https?:\/\/[^\s"')\]]+\.pdf/gi)]
    .map((m) => ({ url: m[0].replace(/[,.\]"]+$/, ""), title: "" }));

  // Try JSON array first
  try {
    const match = text.match(/\[[\s\S]*?\]/);
    if (match) {
      const parsed = JSON.parse(match[0]) as { url: string; title: string }[];
      if (parsed.length > 0) {
        const seen = new Set<string>();
        const combined = [...parsed, ...urlMatches];
        return combined
          .filter((r) => isPdfUrl(r.url) && !isNoisy(r.url) && !seen.has(r.url) && seen.add(r.url))
          .slice(0, 10);
      }
    }
  } catch {
    // fall through to regex results
  }

  const seen = new Set<string>();
  return urlMatches
    .filter((r) => isPdfUrl(r.url) && !isNoisy(r.url) && !seen.has(r.url) && seen.add(r.url))
    .slice(0, 10);
}
