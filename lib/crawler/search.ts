import { getSearchTerms } from "./postcodes";

const NOISE_FILENAME_PATTERNS = [
  "handbook", "guide", "overview", "factsheet", "fact-sheet", "fact_sheet",
  "template", "sample", "example", "information", "newsletter",
  "annual-report", "annual_report", "brochure", "presentation", "slideshow",
  "agenda", "notice", "meeting", "community", "communities",
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
  const { city, postcode } = getSearchTerms(suburb);

  // Use postcode if known — strata docs contain postcodes, not suburb names like "Sydney CBD NSW"
  const locationTerm = postcode ?? city;

  // Run two targeted queries to maximise coverage
  const queries = [
    `strata by-laws ${locationTerm} filetype:pdf`,
    `consolidated by-laws ${locationTerm} strata plan pdf`,
  ];

  const seen = new Set<string>();
  const results: SearchResult[] = [];

  for (const query of queries) {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        search_depth: "basic",
        max_results: 10,
      }),
    });

    if (!res.ok) {
      console.error(`[search] Tavily failed for "${query}": ${res.status}`);
      continue;
    }

    const data = await res.json() as { results: { url: string; title: string }[] };
    for (const r of data.results ?? []) {
      if (isPdfUrl(r.url) && !isNoisy(r.url) && !seen.has(r.url)) {
        seen.add(r.url);
        results.push({ url: r.url, title: r.title });
      }
    }
  }

  console.log(`[search] ${suburb} (${locationTerm}): ${results.length} PDFs from Tavily`);
  return results.slice(0, 10);
}
