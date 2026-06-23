import OpenAI from "openai";
import { getSearchTerms, getRegion } from "./postcodes";

const AU_NOISE_DOMAINS = [
  "parliament.nsw.gov.au", "nsw.gov.au", "legislation.nsw.gov.au",
  "austlii.edu.au", "planning.nsw.gov.au", "vic.gov.au",
  "legislation.vic.gov.au", "abs.gov.au", "fairtrading.nsw.gov.au",
  "consumer.vic.gov.au", "sa.gov.au", "landservices.com.au",
];

const US_NOISE_DOMAINS = [
  "seattle.gov", "kingcounty.gov", "wa.gov", "leg.wa.gov",
  "commerce.wa.gov", "courts.wa.gov",
];

const US_STATE_NAMES: Record<string, string> = {
  CA: "California", FL: "Florida", NY: "New York", TX: "Texas",
  AZ: "Arizona", CO: "Colorado", IL: "Illinois", GA: "Georgia",
  NC: "North Carolina", VA: "Virginia", OR: "Oregon", NV: "Nevada",
  MA: "Massachusetts", MD: "Maryland", MI: "Michigan", OH: "Ohio",
  MN: "Minnesota", PA: "Pennsylvania", TN: "Tennessee",
  AL: "Alabama", AK: "Alaska", AR: "Arkansas", CT: "Connecticut",
  DE: "Delaware", HI: "Hawaii", ID: "Idaho", IN: "Indiana",
  IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MS: "Mississippi", MO: "Missouri", MT: "Montana",
  NE: "Nebraska", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico",
  ND: "North Dakota", OK: "Oklahoma", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", UT: "Utah", VT: "Vermont", WV: "West Virginia",
  WI: "Wisconsin", WY: "Wyoming", WA: "Washington",
};

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

function buildAuPrompt(city: string, postcode: string | null, state: string | null): string {
  const loc = postcode ? `${city} ${postcode}` : state ? `${city} ${state}` : city;

  if (state === "VIC") {
    return `Search the web and find all publicly accessible owners corporation rules PDF documents for ${loc} Victoria, Australia.

Search using all of these approaches:
1. "${loc}" "owners corporation rules" filetype:pdf
2. "${loc}" "OC rules" owners corporation pdf
3. site:aro-au-prod-storage.s3-ap-southeast-2.amazonaws.com "${postcode ?? city}" by-laws
4. "${loc}" "body corporate rules" OR "strata by-laws" pdf
5. Building websites for ${loc} that publish owners corporation rules

Return ONLY a plain list of direct .pdf URLs, one per line, no explanations, no numbering, nothing else.`;
  }

  if (state === "QLD") {
    return `Search the web and find all publicly accessible body corporate by-law PDF documents for ${loc} Queensland, Australia.

Search using all of these approaches:
1. "${loc}" "body corporate by-laws" filetype:pdf
2. "${loc}" "community management statement" pdf
3. "${loc}" "body corporate" by-laws filetype:pdf
4. "${loc}" "community titles scheme" by-laws pdf
5. Building websites for ${loc} that publish body corporate by-laws

Return ONLY a plain list of direct .pdf URLs, one per line, no explanations, no numbering, nothing else.`;
  }

  if (state === "WA") {
    return `Search the web and find all publicly accessible strata by-law PDF documents for ${loc} Western Australia.

Search using all of these approaches:
1. "${loc}" "strata by-laws" filetype:pdf
2. "${loc}" "scheme by-laws" strata company pdf
3. "${loc}" "strata company" by-laws filetype:pdf
4. "${loc}" "community title scheme" by-laws pdf
5. Building websites for ${loc} that publish strata by-laws

Return ONLY a plain list of direct .pdf URLs, one per line, no explanations, no numbering, nothing else.`;
  }

  if (state === "SA") {
    return `Search the web and find all publicly accessible strata and community title by-law PDF documents for ${loc} South Australia.

Search using all of these approaches:
1. "${loc}" "strata by-laws" filetype:pdf
2. "${loc}" "community rules" OR "community corporation" pdf
3. "${loc}" "community title" by-laws filetype:pdf
4. "${loc}" "strata corporation" rules pdf
5. "${loc}" strata community title bylaws site:.com.au pdf

Return ONLY a plain list of direct .pdf URLs, one per line, no explanations, no numbering, nothing else.`;
  }

  if (state === "ACT") {
    return `Search the web and find all publicly accessible owners corporation rules PDF documents for ${loc} ACT, Australia.

Search using all of these approaches:
1. "${loc}" "owners corporation rules" filetype:pdf
2. "${loc}" "unit plan" owners corporation rules pdf
3. "${loc}" "unit title" rules OR by-laws filetype:pdf
4. "${loc}" "body corporate rules" pdf
5. Building websites for ${loc} that publish owners corporation rules

Return ONLY a plain list of direct .pdf URLs, one per line, no explanations, no numbering, nothing else.`;
  }

  if (state === "TAS") {
    return `Search the web and find all publicly accessible strata by-law PDF documents for ${loc} Tasmania, Australia.

Search using all of these approaches:
1. "${loc}" "strata by-laws" filetype:pdf
2. "${loc}" "body corporate" by-laws OR rules pdf
3. "${loc}" "strata plan" by-laws filetype:pdf
4. "${loc}" "strata corporation" rules pdf
5. Building websites for ${loc} that publish strata by-laws

Return ONLY a plain list of direct .pdf URLs, one per line, no explanations, no numbering, nothing else.`;
  }

  if (state === "NT") {
    return `Search the web and find all publicly accessible unit title and strata by-law PDF documents for ${loc} Northern Territory, Australia.

Search using all of these approaches:
1. "${loc}" "unit title" by-laws OR rules filetype:pdf
2. "${loc}" "body corporate" by-laws pdf
3. "${loc}" "unit plan" rules filetype:pdf
4. "${loc}" "unit title scheme" by-laws pdf
5. Building websites for ${loc} that publish unit title by-laws or rules

Return ONLY a plain list of direct .pdf URLs, one per line, no explanations, no numbering, nothing else.`;
  }

  // NSW (default) — most AU prompts historically calibrated to NSW
  return `Search the web and find all publicly accessible strata by-law PDF documents for ${loc} Australia.

Search using all of these approaches:
1. "${loc}" "strata by-laws" filetype:pdf
2. "${loc}" "consolidated by-laws" strata plan pdf
3. site:aro-au-prod-storage.s3-ap-southeast-2.amazonaws.com "${postcode ?? city}" by-laws
4. "${loc}" "registered by-laws" strata pdf
5. Building-specific websites for ${loc} that publish by-laws

Return ONLY a plain list of direct .pdf URLs, one per line, no explanations, no numbering, nothing else.`;
}

const WA_COUNTY_BY_CITY: Record<string, string> = {
  Seattle: "King", Bellevue: "King", Redmond: "King", Kirkland: "King",
  Renton: "King", Kent: "King", Shoreline: "King", Burien: "King",
  Kenmore: "King", Bothell: "King", Auburn: "King", Covington: "King",
  Tacoma: "Pierce", Lakewood: "Pierce", Puyallup: "Pierce", Gig_Harbor: "Pierce",
  Spokane: "Spokane", Spokane_Valley: "Spokane",
  Everett: "Snohomish", Marysville: "Snohomish", Edmonds: "Snohomish", Lynnwood: "Snohomish",
  Vancouver: "Clark", Bellevue_WA: "Clark",
  Olympia: "Thurston", Lacey: "Thurston", Tumwater: "Thurston",
};

function buildWaPrompt(cleanCity: string, zip: string | null): string {
  const county = WA_COUNTY_BY_CITY[cleanCity.replace(" ", "_")] ?? "King";
  const loc = zip ? `${cleanCity} ${zip}` : `${cleanCity}, Washington`;

  return `Search the web for publicly accessible condominium declaration and HOA document PDF files for ${loc}, Washington State, USA.

Washington condos file declarations with the county auditor (recorder). Try these searches:
1. "${loc}" "declaration of condominium" filetype:pdf
2. "${loc}" "condominium declaration" Washington filetype:pdf
3. "${loc}" "CC&Rs" OR "covenants conditions restrictions" filetype:pdf
4. site:${county.toLowerCase()}county.gov "${cleanCity}" condominium declaration pdf
5. "${cleanCity} Washington" condo association bylaws filetype:pdf
6. "${cleanCity} WA" HOA documents bylaws filetype:pdf
7. "${loc}" "condominium act" rules regulations pdf

Also search condo management company sites that operate in Washington (PREM Group, CWD, Windermere Property Management, Associa, FirstService) for ${cleanCity} condo documents.

Return ONLY a plain list of direct .pdf URLs you find, one per line. No explanations.`;
}

function buildUsPrompt(city: string, zip: string | null): string {
  const stateMatch = city.match(/\s+([A-Z]{2})$/);
  const stateCode = stateMatch ? stateMatch[1] : null;
  const stateName = stateCode ? (US_STATE_NAMES[stateCode] ?? stateCode) : "Washington";
  const cleanCity = stateCode ? city.replace(/\s+[A-Z]{2}$/, "").trim() : city;

  if (stateCode === "WA") return buildWaPrompt(cleanCity, zip);

  const fullLocation = zip ? `${cleanCity} ${zip}` : `${cleanCity}, ${stateName}`;

  return `Search the web and find all publicly accessible HOA bylaws, CC&Rs, and condominium declaration PDF documents for ${fullLocation}, USA.

Search using all of these approaches:
1. "${fullLocation}" "HOA bylaws" filetype:pdf
2. "${fullLocation}" "CC&Rs" OR "covenants conditions restrictions" filetype:pdf
3. "${fullLocation}" "declaration of condominium" filetype:pdf
4. "${fullLocation}" "condo association bylaws" filetype:pdf
5. "${fullLocation}" "homeowners association" rules regulations pdf

Return ONLY a plain list of direct .pdf URLs, one per line, no explanations, no numbering, nothing else.`;
}

const US_HOA_KEYWORDS = [
  "bylaw", "bylaws", "by-law", "ccr", "cc-r", "covenant", "hoa", "condo", "condominium",
  "homeowner", "homeowners", "declaration-of-condo", "condo-declaration",
];

const AU_DOMAINS = [".com.au", ".gov.au", ".net.au", ".org.au", ".edu.au", ".asn.au", ".id.au"];

function isRelevantUsResult(url: string, title: string): boolean {
  const urlLower = url.toLowerCase();
  // Reject Australian domains outright
  if (AU_DOMAINS.some((d) => urlLower.includes(d))) return false;
  const titleLower = title.toLowerCase();
  // URL must contain a keyword — title alone is too noisy (law firm docs, magazines, etc.)
  const urlMatch = US_HOA_KEYWORDS.some((kw) => urlLower.includes(kw));
  // Title match only counts if it's strong (multiple keywords)
  const titleMatches = US_HOA_KEYWORDS.filter((kw) => titleLower.includes(kw)).length;
  return urlMatch || titleMatches >= 2;
}

async function searchUsWithSerper(suburb: string, city: string, postcode: string | null): Promise<SearchResult[]> {
  const stateMatch = city.match(/\s+([A-Z]{2})$/);
  const stateCode = stateMatch?.[1] ?? null;
  const stateName = stateCode ? (US_STATE_NAMES[stateCode] ?? stateCode) : "Washington";
  const cleanCity = stateCode ? city.replace(/\s+[A-Z]{2}$/, "").trim() : city;
  const loc = postcode ? `${cleanCity} ${postcode}` : `${cleanCity} ${stateName}`;

  const queries = [
    `"${loc}" "declaration of condominium" filetype:pdf`,
    `"${loc}" "condominium declaration" filetype:pdf`,
    `"${loc}" HOA bylaws filetype:pdf`,
    `"${loc}" "CC&Rs" filetype:pdf`,
  ];

  const seen = new Set<string>();
  const results: SearchResult[] = [];

  for (const q of queries) {
    try {
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "X-API-KEY": process.env.SERPER_API_KEY!, "Content-Type": "application/json" },
        body: JSON.stringify({ q, num: 10, gl: "us", hl: "en" }),
      });
      if (!res.ok) continue;
      const data = await res.json() as { organic?: { title?: string; link?: string }[] };
      for (const item of data.organic ?? []) {
        const url = item.link ?? "";
        const title = item.title ?? "";
        if (!url.toLowerCase().endsWith(".pdf")) continue;
        if (isNoisy(url, "us") || isGenericCdn(url) || seen.has(url)) continue;
        if (!isRelevantUsResult(url, title)) continue;
        seen.add(url);
        results.push({ url, title: title || (url.split("/").pop() ?? url), source: "serper" });
      }
    } catch {
      // skip failed query
    }
  }

  console.log(`[search] ${suburb} (serper): ${results.length} PDFs`);
  return results.slice(0, 30);
}

export async function searchSuburbForPdfs(suburb: string, regionOverride?: "au" | "us"): Promise<SearchResult[]> {
  const { city, postcode, state } = getSearchTerms(suburb);
  const region = regionOverride ?? getRegion(suburb);

  if (region === "us" && process.env.SERPER_API_KEY) {
    return searchUsWithSerper(suburb, city, postcode);
  }

  if (!process.env.OPENAI_API_KEY) {
    console.warn("[search] OPENAI_API_KEY not set");
    return [];
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const prompt = region === "us"
    ? buildUsPrompt(city, postcode)
    : buildAuPrompt(city, postcode, state);

  const seen = new Set<string>();
  const results: SearchResult[] = [];

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-search-preview",
      messages: [{ role: "user", content: prompt }],
    });

    const message = response.choices?.[0]?.message;
    const text = message?.content ?? "";
    console.log(`[search] ${suburb} (${region}) content length: ${text.length}`);

    // Primary: extract from url_citation annotations (SDK v6 / newer model behaviour)
    const annotations: any[] = (message as any)?.annotations ?? [];
    console.log(`[search] ${suburb}: ${annotations.length} annotations`);
    for (const ann of annotations) {
      if (ann.type === "url_citation" && ann.url_citation?.url) {
        const url = ann.url_citation.url as string;
        if (!isNoisy(url, region) && !isGenericCdn(url) && !seen.has(url)) {
          seen.add(url);
          results.push({ url, title: ann.url_citation.title ?? url.split("/").pop() ?? url, source: "openai" });
        }
      }
    }

    // Fallback: regex scan of message text (older model behaviour)
    for (const url of extractPdfUrls(text)) {
      if (!isNoisy(url, region) && !isGenericCdn(url) && !seen.has(url)) {
        seen.add(url);
        results.push({ url, title: url.split("/").pop() ?? url, source: "openai" });
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[search] OpenAI error for ${suburb}:`, msg);
    if (msg.includes("429")) {
      throw new Error("OpenAI quota exceeded — top up credits at platform.openai.com/account/billing");
    }
    throw e;
  }

  console.log(`[search] ${suburb}: ${results.length} PDFs`);
  return results.slice(0, 30);
}
