import FirecrawlApp from "@mendable/firecrawl-js";
import OpenAI from "openai";
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

const STRATA_DOC_SIGNALS = [
  "by-law", "bylaw", "by_law", "bylaws", "by-laws", "by_laws",
  "strata-plan", "strataplan", "strata_plan", "consolidated",
  "schedule-a", "schedule_a", "/sp-", "/sp/",
];

function looksLikeStrataDoc(url: string): boolean {
  const lower = decodeURIComponent(url).toLowerCase();
  return STRATA_DOC_SIGNALS.some((s) => lower.includes(s));
}

// Generic CDN URLs have no location context — filter unless it's the known strata bucket
const GENERIC_CDN_HOSTS = ["squarespace.com/static/", "cloudfront.net/", "amazonaws.com/s3/"];

function isGenericCdn(url: string): boolean {
  if (url.includes("aro-au-prod-storage")) return false;
  return GENERIC_CDN_HOSTS.some((h) => url.includes(h));
}

// Extract all https:// URLs ending in .pdf from a block of text
function extractPdfUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s"')>]+\.pdf/gi) ?? [];
  return [...new Set(matches)];
}

export type SearchResult = {
  url: string;
  title: string;
  source: "openai" | "tavily" | "firecrawl";
};

async function searchOpenAI(
  fullLocation: string,
  seen: Set<string>,
  out: SearchResult[]
): Promise<void> {
  if (!process.env.OPENAI_API_KEY) return;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const postcodeMatch = fullLocation.match(/\d{4}$/);
  const postcode = postcodeMatch?.[0];

  // Run multiple search angles in parallel — ChatGPT's advantage is it searches several times
  const prompts = [
    `Find all publicly accessible strata by-law PDF documents for ${fullLocation} Australia.
Search the aro-au-prod-storage.s3-ap-southeast-2.amazonaws.com bucket specifically — it hosts by-laws for many Sydney buildings.
Also search strata management company websites and individual building websites.
Return ONLY a plain list of direct .pdf URLs, one per line, nothing else.`,

    `Search for strata scheme by-law PDFs for buildings in ${fullLocation}${postcode ? ` postcode ${postcode}` : ""} Australia.
Look for consolidated by-laws, strata plan documents, and schedule of by-laws.
Check sites like millenniumtowers.com.au and other individual building websites.
Return ONLY a plain list of direct .pdf URLs, one per line, nothing else.`,

    ...(postcode ? [
      `Site search: site:aro-au-prod-storage.s3-ap-southeast-2.amazonaws.com "${postcode}"
Find all strata by-law PDF files in this S3 bucket for postcode ${postcode}.
Return ONLY a plain list of direct .pdf URLs, one per line, nothing else.`,
    ] : []),
  ];

  const responses = await Promise.allSettled(
    prompts.map((input) =>
      (openai as any).responses.create({
        model: "gpt-4o-search-preview",
        tools: [{ type: "web_search_preview" }],
        input,
      })
    )
  );

  for (const res of responses) {
    if (res.status !== "fulfilled") continue;
    const text = (res.value.output ?? [])
      .flatMap((item: any) => {
        if (item.type === "message") {
          return (item.content ?? [])
            .filter((c: any) => c.type === "output_text")
            .map((c: any) => c.text ?? "");
        }
        return [];
      })
      .join("\n");

    for (const url of extractPdfUrls(text)) {
      // Trust OpenAI's judgement on what's a strata doc — skip the filename filter
      if (!isNoisy(url) && !isGenericCdn(url) && !seen.has(url)) {
        seen.add(url);
        out.push({ url, title: url.split("/").pop() ?? url, source: "openai" });
      }
    }
  }
}

async function searchTavily(
  fullLocation: string,
  seen: Set<string>,
  out: SearchResult[]
): Promise<void> {
  if (!process.env.TAVILY_API_KEY) return;

  const postcodeMatch = fullLocation.match(/\d{4}$/);
  const postcode = postcodeMatch?.[0];

  const queries = [
    `strata by-laws "${fullLocation}" filetype:pdf`,
    `consolidated by-laws "${fullLocation}" strata plan pdf`,
    ...(postcode ? [`site:aro-au-prod-storage.s3-ap-southeast-2.amazonaws.com "${postcode}" by-laws pdf`] : []),
  ];

  for (const query of queries) {
    try {
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
      if (!res.ok) continue;
      const data = await res.json() as { results: { url: string; title: string }[] };
      for (const r of data.results ?? []) {
        if (isPdfUrl(r.url) && looksLikeStrataDoc(r.url) && !isNoisy(r.url) && !isGenericCdn(r.url) && !seen.has(r.url)) {
          seen.add(r.url);
          out.push({ url: r.url, title: r.title, source: "tavily" });
        }
      }
    } catch {
      // Non-fatal
    }
  }
}

async function searchFirecrawl(
  fullLocation: string,
  seen: Set<string>,
  out: SearchResult[]
): Promise<void> {
  if (!process.env.FIRECRAWL_API_KEY) return;

  const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

  const postcodeMatch = fullLocation.match(/\d{4}$/);
  const postcode = postcodeMatch?.[0];

  const queries = [
    `strata by-laws ${fullLocation} site:.com.au filetype:pdf`,
    ...(postcode ? [`site:aro-au-prod-storage.s3-ap-southeast-2.amazonaws.com "${postcode}" by-laws`] : []),
  ];

  for (const query of queries) {
    try {
      const result = await (app as any).search(query, { limit: 10 });
      const hits: { url: string; title?: string }[] = result?.data ?? result?.results ?? [];
      for (const r of hits) {
        if (!r.url) continue;
        if (isPdfUrl(r.url) && looksLikeStrataDoc(r.url) && !isNoisy(r.url) && !isGenericCdn(r.url) && !seen.has(r.url)) {
          seen.add(r.url);
          out.push({ url: r.url, title: r.title ?? r.url, source: "firecrawl" });
        }
      }
    } catch {
      // Non-fatal
    }
  }
}

const STRATA_SITES = [
  "https://www.stratachoice.com.au",
  "https://www.cspgroup.com.au",
  "https://www.lannockstrata.com.au",
  "https://www.bmstrata.com.au",
];

async function crawlStrataSites(
  fullLocation: string,
  seen: Set<string>,
  out: SearchResult[]
): Promise<void> {
  if (!process.env.FIRECRAWL_API_KEY) return;

  const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

  await Promise.allSettled(
    STRATA_SITES.map(async (site) => {
      try {
        const result = await (app as any).mapUrl(site, {
          search: `strata by-laws ${fullLocation} pdf`,
        });
        const links: string[] = result?.links ?? [];
        for (const url of links) {
          if (isPdfUrl(url) && looksLikeStrataDoc(url) && !isNoisy(url) && !seen.has(url)) {
            seen.add(url);
            out.push({ url, title: url.split("/").pop() ?? url, source: "firecrawl" });
          }
        }
      } catch {
        // Site unavailable — skip
      }
    })
  );
}

export async function searchSuburbForPdfs(suburb: string): Promise<SearchResult[]> {
  const { city, postcode } = getSearchTerms(suburb);
  const fullLocation = postcode ? `${city} ${postcode}` : city;

  const seen = new Set<string>();
  const results: SearchResult[] = [];

  await Promise.allSettled([
    searchOpenAI(fullLocation, seen, results),
    searchTavily(fullLocation, seen, results),
    searchFirecrawl(fullLocation, seen, results),
    crawlStrataSites(fullLocation, seen, results),
  ]);

  console.log(`[search] ${suburb} (${fullLocation}): ${results.length} PDFs (openai + tavily + firecrawl)`);
  return results.slice(0, 30);
}
