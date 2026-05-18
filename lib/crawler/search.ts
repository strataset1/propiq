import OpenAI from "openai";
import { getSearchTerms } from "./postcodes";

const NOISE_DOMAINS = [
  "parliament.nsw.gov.au", "nsw.gov.au", "legislation.nsw.gov.au",
  "austlii.edu.au", "planning.nsw.gov.au", "vic.gov.au",
  "legislation.vic.gov.au", "abs.gov.au", "fairtrading.nsw.gov.au",
  "consumer.vic.gov.au",
];

function isNoisy(url: string): boolean {
  return NOISE_DOMAINS.some((d) => url.includes(d));
}

function isGenericCdn(url: string): boolean {
  if (url.includes("aro-au-prod-storage")) return false;
  return ["squarespace.com/static/", "cloudfront.net/"].some((h) => url.includes(h));
}

function extractPdfUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s"')>\]]+\.pdf/gi) ?? [];
  return [...new Set(matches)];
}

function getTextFromResponse(response: any): string {
  return (response.output ?? [])
    .flatMap((item: any) => {
      if (item.type === "message") {
        return (item.content ?? [])
          .filter((c: any) => c.type === "output_text")
          .map((c: any) => c.text ?? "");
      }
      return [];
    })
    .join("\n");
}

export type SearchResult = {
  url: string;
  title: string;
  source: "openai";
};

export async function searchSuburbForPdfs(suburb: string): Promise<SearchResult[]> {
  const { city, postcode } = getSearchTerms(suburb);
  const fullLocation = postcode ? `${city} ${postcode}` : city;

  if (!process.env.OPENAI_API_KEY) {
    console.warn("[search] OPENAI_API_KEY not set");
    return [];
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompts = [
    `Find all publicly accessible strata by-law PDF documents for ${fullLocation} Australia.
Search the web including the aro-au-prod-storage.s3-ap-southeast-2.amazonaws.com S3 bucket, strata management company websites, and individual building websites.
Return ONLY a plain list of direct .pdf URLs, one per line, nothing else.`,

    `Search for strata scheme by-law PDFs for residential buildings in ${fullLocation}${postcode ? ` (postcode ${postcode})` : ""} Australia.
Look for consolidated by-laws, strata plan schedule of by-laws, and registered by-law instruments.
Search building websites, body corporate portals, and document repositories.
Return ONLY a plain list of direct .pdf URLs, one per line, nothing else.`,

    ...(postcode ? [`Search specifically for: site:aro-au-prod-storage.s3-ap-southeast-2.amazonaws.com ${postcode} strata by-laws
This S3 bucket hosts by-law PDFs for many Australian strata buildings. Find as many as possible for postcode ${postcode}.
Return ONLY a plain list of direct .pdf URLs, one per line, nothing else.`] : []),
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

  const seen = new Set<string>();
  const results: SearchResult[] = [];

  for (const res of responses) {
    if (res.status !== "fulfilled") continue;
    for (const url of extractPdfUrls(getTextFromResponse(res.value))) {
      if (!isNoisy(url) && !isGenericCdn(url) && !seen.has(url)) {
        seen.add(url);
        results.push({ url, title: url.split("/").pop() ?? url, source: "openai" });
      }
    }
  }

  console.log(`[search] ${suburb} (${fullLocation}): ${results.length} PDFs`);
  return results.slice(0, 30);
}
