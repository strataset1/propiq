// Domains that return legislation, samples, or non-property documents
const NOISE_DOMAINS = [
  "parliament.nsw.gov.au",
  "nsw.gov.au",
  "legislation.nsw.gov.au",
  "austlii.edu.au",
  "rg-guidelines.nswlrs.com.au",
  "planning.nsw.gov.au",
  "vic.gov.au",
  "legislation.vic.gov.au",
  "abs.gov.au",
  "accc.gov.au",
  "fairtrading.nsw.gov.au",
  "consumer.vic.gov.au",
  "slv.vic.gov.au",
];

// Filename patterns that indicate a generic/handbook document rather than a property-specific by-law
const NOISE_FILENAME_PATTERNS = [
  "handbook",
  "guide",
  "overview",
  "factsheet",
  "fact-sheet",
  "fact_sheet",
  "template",
  "sample",
  "example",
  "community",
  "communities",
  "information",
  "newsletter",
  "annual-report",
  "annual_report",
  "policy",
  "policies",
  "brochure",
  "presentation",
  "slideshow",
];

function isNoisyUrl(url: string): boolean {
  if (NOISE_DOMAINS.some((domain) => url.includes(domain))) return true;
  const filename = url.split("/").pop()?.toLowerCase() ?? "";
  return NOISE_FILENAME_PATTERNS.some((pattern) => filename.includes(pattern));
}

function isPdfUrl(url: string): boolean {
  return url.toLowerCase().endsWith(".pdf");
}

export type SearchResult = {
  url: string;
  title: string;
};

export async function searchSuburbForPdfs(suburb: string): Promise<SearchResult[]> {
  // More specific query — target actual registered by-law documents
  const query = `"${suburb}" strata by-laws registered filetype:pdf`;

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
    throw new Error(`Tavily search failed: ${res.status}`);
  }

  const data = await res.json() as { results: { url: string; title: string }[] };

  return (data.results ?? [])
    .filter((r) => isPdfUrl(r.url) && !isNoisyUrl(r.url))
    .map((r) => ({ url: r.url, title: r.title }));
}
