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

  const prompt = `Search the web and find all publicly accessible strata by-law PDF documents for ${fullLocation} Australia.

Search using all of these approaches:
1. "${fullLocation}" "strata by-laws" filetype:pdf
2. "${fullLocation}" "consolidated by-laws" strata plan pdf
3. site:aro-au-prod-storage.s3-ap-southeast-2.amazonaws.com "${postcode ?? city}" by-laws
4. "${fullLocation}" "registered by-laws" strata pdf
5. Building-specific websites for ${fullLocation} that publish by-laws

Return ONLY a plain list of direct .pdf URLs, one per line, no explanations, no numbering, nothing else.`;

  const seen = new Set<string>();
  const results: SearchResult[] = [];

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-search-preview",
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.choices?.[0]?.message?.content ?? "";
    console.log(`[search] ${suburb} OpenAI response length: ${text.length}`);

    for (const url of extractPdfUrls(text)) {
      if (!isNoisy(url) && !isGenericCdn(url) && !seen.has(url)) {
        seen.add(url);
        results.push({ url, title: url.split("/").pop() ?? url, source: "openai" });
      }
    }
  } catch (e) {
    console.error(`[search] OpenAI error for ${suburb}:`, e instanceof Error ? e.message : e);
  }

  console.log(`[search] ${suburb} (${fullLocation}): ${results.length} PDFs`);
  return results.slice(0, 30);
}
