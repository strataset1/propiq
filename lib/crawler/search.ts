import OpenAI from "openai";
import { getSearchTerms } from "./postcodes";

const NOISE_FILENAME_PATTERNS = [
  "handbook", "guide", "overview", "factsheet", "fact-sheet", "fact_fact",
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
  const locationTerm = postcode ? `${city} ${postcode}` : city;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-search-preview",
    messages: [
      {
        role: "user",
        content: `Search for direct PDF links to registered strata by-laws for residential buildings in ${locationTerm} Australia. Look on strata management company websites like bcsstrata.com.au, netstrata.com.au, strataplus.com.au, stratachoice.com.au. Find actual .pdf file links for specific strata plans or buildings in ${locationTerm}.`,
      },
    ],
  });

  const message = completion.choices[0]?.message;
  const text = message?.content ?? "";

  console.log(`[search] ${suburb} raw text:`, text.slice(0, 300));
  console.log(`[search] ${suburb} annotations:`, JSON.stringify(message?.annotations?.slice(0, 5)));

  const results: SearchResult[] = [];
  const seen = new Set<string>();

  // Primary: extract PDF URLs from annotations (where gpt-4o-search-preview puts cited URLs)
  for (const annotation of message?.annotations ?? []) {
    if (annotation.type === "url_citation") {
      const { url, title } = annotation.url_citation;
      if (isPdfUrl(url) && !isNoisy(url) && !seen.has(url)) {
        seen.add(url);
        results.push({ url, title: title ?? "" });
      }
    }
  }

  // Fallback: extract any PDF URLs from response text
  for (const match of text.matchAll(/https?:\/\/[^\s"')\]]+\.pdf/gi)) {
    const url = match[0].replace(/[,.\]"]+$/, "");
    if (!isNoisy(url) && !seen.has(url)) {
      seen.add(url);
      results.push({ url, title: "" });
    }
  }

  console.log(`[search] ${suburb} found ${results.length} PDF URLs`);
  return results.slice(0, 10);
}
