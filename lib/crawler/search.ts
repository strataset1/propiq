import OpenAI from "openai";
import { getSearchTerms, getRegion } from "./postcodes";

const AU_NOISE_DOMAINS = [
  "parliament.nsw.gov.au", "nsw.gov.au", "legislation.nsw.gov.au",
  "austlii.edu.au", "planning.nsw.gov.au", "vic.gov.au",
  "legislation.vic.gov.au", "abs.gov.au", "fairtrading.nsw.gov.au",
  "consumer.vic.gov.au",
];

const US_NOISE_DOMAINS = [
  "seattle.gov", "kingcounty.gov", "wa.gov", "leg.wa.gov",
  "commerce.wa.gov", "courts.wa.gov",
];

function isNoisy(url: string, region: "au" | "us"): boolean {
  const domains = region === "us" ? US_NOISE_DOMAINS : AU_NOISE_DOMAINS;
  return domains.some((d) => url.includes(d));
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

function buildAuPrompt(city: string, postcode: string | null): string {
  const fullLocation = postcode ? `${city} ${postcode}` : city;
  return `Search the web and find all publicly accessible strata by-law PDF documents for ${fullLocation} Australia.

Search using all of these approaches:
1. "${fullLocation}" "strata by-laws" filetype:pdf
2. "${fullLocation}" "consolidated by-laws" strata plan pdf
3. site:aro-au-prod-storage.s3-ap-southeast-2.amazonaws.com "${postcode ?? city}" by-laws
4. "${fullLocation}" "registered by-laws" strata pdf
5. Building-specific websites for ${fullLocation} that publish by-laws

Return ONLY a plain list of direct .pdf URLs, one per line, no explanations, no numbering, nothing else.`;
}

function buildUsPrompt(city: string, zip: string | null): string {
  const fullLocation = zip ? `${city} ${zip}` : `${city}, Seattle, WA`;
  return `Search the web and find all publicly accessible HOA bylaws, CC&Rs, and condominium declaration PDF documents for ${fullLocation}, Washington State, USA.

Search using all of these approaches:
1. "${fullLocation}" "HOA bylaws" filetype:pdf
2. "${fullLocation}" "CC&Rs" OR "covenants conditions restrictions" filetype:pdf
3. "${fullLocation}" "declaration of condominium" filetype:pdf
4. "${fullLocation}" "condo association bylaws" filetype:pdf
5. "${fullLocation}" "homeowners association" rules regulations pdf

Return ONLY a plain list of direct .pdf URLs, one per line, no explanations, no numbering, nothing else.`;
}

export async function searchSuburbForPdfs(suburb: string): Promise<SearchResult[]> {
  const { city, postcode } = getSearchTerms(suburb);
  const region = getRegion(suburb);

  if (!process.env.OPENAI_API_KEY) {
    console.warn("[search] OPENAI_API_KEY not set");
    return [];
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const prompt = region === "us"
    ? buildUsPrompt(city, postcode)
    : buildAuPrompt(city, postcode);

  const seen = new Set<string>();
  const results: SearchResult[] = [];

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-search-preview",
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.choices?.[0]?.message?.content ?? "";
    console.log(`[search] ${suburb} (${region}) OpenAI response length: ${text.length}`);

    for (const url of extractPdfUrls(text)) {
      if (!isNoisy(url, region) && !isGenericCdn(url) && !seen.has(url)) {
        seen.add(url);
        results.push({ url, title: url.split("/").pop() ?? url, source: "openai" });
      }
    }
  } catch (e) {
    console.error(`[search] OpenAI error for ${suburb}:`, e instanceof Error ? e.message : e);
  }

  console.log(`[search] ${suburb}: ${results.length} PDFs`);
  return results.slice(0, 30);
}
