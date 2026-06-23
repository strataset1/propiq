import OpenAI from "openai";
import { getSearchTerms, getRegion } from "./postcodes";

// Must stay in sync with AU_HTML_DOMAINS in ingest-light.ts
const AU_HTML_DOMAINS = [
  "acsl.net.au",
  "bccm.qld.gov.au",
  "ncat.nsw.gov.au",
  "vcat.vic.gov.au",
  "sacat.sa.gov.au",
];

const AU_NOISE_DOMAINS = [
  // NSW
  "parliament.nsw.gov.au", "nsw.gov.au", "legislation.nsw.gov.au",
  "planning.nsw.gov.au", "fairtrading.nsw.gov.au",
  // VIC
  "vic.gov.au", "legislation.vic.gov.au", "consumer.vic.gov.au",
  // QLD
  "legislation.qld.gov.au", "housing.qld.gov.au", "qld.gov.au",
  // WA
  "legislation.wa.gov.au", "commerce.wa.gov.au",
  // SA
  "sa.gov.au", "landservices.com.au", "lawhandbook.sa.gov.au",
  // ACT
  "legislation.act.gov.au", "act.gov.au",
  // TAS
  "legislation.tas.gov.au", "nre.tas.gov.au",
  // NT
  "legislation.nt.gov.au", "nt.gov.au",
  // National
  "austlii.edu.au", "abs.gov.au",
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
  source: "openai" | "serper";
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

const AU_STRATA_KEYWORDS = [
  "by-law", "bylaw", "bylaws", "strata-plan", "strata_plan",
  "owners-corp", "owners_corp", "oc-rules", "oc_rules",
  "body-corporate", "body_corporate", "community-management",
  "community-title", "unit-title", "strata", "scheme-by-law",
];

// These domains are known hosts for AU strata by-law PDFs or contract packs.
// Results from them are accepted regardless of URL keyword match.
const AU_PRIORITY_DOMAINS = [
  "ren.com.au",
  "fnebooks.com",
  "hashtaghub.com.au",
  "zenu",
  "eagleagent",
  "propertydocs.com.au",
  "agentboxcdn.com.au",
  "vaultre.com.au",
  "campaigntrack.com",
  "aro-au-prod-storage",
  // Tribunal sites — HTML decisions that quote by-law content (scraped as text, not PDFs)
  "acsl.net.au",       // WA: WASAT decisions
  "bccm.qld.gov.au",  // QLD: Body Corporate Commissioner orders
  "ncat.nsw.gov.au",  // NSW: NCAT strata decisions
  "vcat.vic.gov.au",  // VIC: VCAT owners corporation decisions
  "sacat.sa.gov.au",  // SA: SACAT strata decisions
];

function isRelevantAuResult(url: string, title: string): boolean {
  const urlLower = url.toLowerCase();
  if (AU_PRIORITY_DOMAINS.some((d) => urlLower.includes(d))) return true;
  if (isNoisy(url, "au")) return false;
  const titleLower = title.toLowerCase();
  const urlMatch = AU_STRATA_KEYWORDS.some((kw) => urlLower.includes(kw));
  const titleMatch = [
    "by-law", "bylaw", "strata", "owners corporation", "body corporate",
    "community management", "unit title", "oc rules",
  ].some((kw) => titleLower.includes(kw));
  return urlMatch || titleMatch;
}

// Extract a NSW strata plan number from a URL or document title.
// Returns the integer plan number (e.g. 75234 for SP75234), or null if not found.
export function extractSpFromUrl(url: string, title: string): number | null {
  const combined = `${decodeURIComponent(url)} ${title}`;
  const spMatch = combined.match(/\bSP[\s\-]?(\d{3,6})\b/i);
  if (spMatch) {
    const n = parseInt(spMatch[1], 10);
    return n > 0 ? n : null;
  }
  const planMatch = combined.match(/strata\s+plan\s+(?:no\.?\s*)?(\d{3,6})\b/i);
  if (planMatch) {
    const n = parseInt(planMatch[1], 10);
    return n > 0 ? n : null;
  }
  return null;
}

async function searchAuWithSerper(suburb: string, city: string, postcode: string | null, state: string | null): Promise<SearchResult[]> {
  const loc = postcode ? `${city} ${postcode}` : state ? `${city} ${state}` : city;

  let queries: string[];

  if (state === "VIC") {
    // VIC uses "owners corporation rules" — NEVER "by-laws". Plans are PS (Plan of Subdivision).
    queries = [
      `"${loc}" "owners corporation rules" filetype:pdf`,
      `"${loc}" "OC rules" filetype:pdf`,
      `"${city} VIC" "owners corporation rules" filetype:pdf`,
      `"${city} Victoria" "owners corporation rules" filetype:pdf`,
      `"${loc}" "Plan of Subdivision" "owners corporation rules" filetype:pdf`,
      `site:aro-au-prod-storage.s3-ap-southeast-2.amazonaws.com "${postcode ?? city}" owners corporation`,
      `site:propertydocs.com.au "${city}" "owners corporation"`,
      `site:vaultre.com.au "${city}" "owners corporation rules"`,
      `site:agentboxcdn.com.au "${city}" "owners corporation"`,
      `site:campaigntrack.com "${city}" "owners corporation rules"`,
      `site:fnebooks.com "${city}" "owners corporation"`,
      `site:vcat.vic.gov.au "${city}" "owners corporation"`,
    ];
  } else if (state === "QLD") {
    // QLD key document is "community management statement" (CMS) — by-laws are a section within it.
    // Legacy schemes use BUP (Building Unit Plan) or GTP (Group Titles Plan).
    queries = [
      `"${loc}" "community management statement" filetype:pdf`,
      `"${loc}" "body corporate by-laws" filetype:pdf`,
      `"${city} QLD" "community management statement" filetype:pdf`,
      `"${city} Queensland" "community management statement" filetype:pdf`,
      `"${loc}" "community titles scheme" by-laws filetype:pdf`,
      `"${loc}" "body corporate" by-laws filetype:pdf`,
      `site:aro-au-prod-storage.s3-ap-southeast-2.amazonaws.com "${postcode ?? city}" community management`,
      `site:propertydocs.com.au "${city}" "body corporate"`,
      `site:vaultre.com.au "${city}" "community management statement"`,
      `site:agentboxcdn.com.au "${city}" "body corporate"`,
      `site:campaigntrack.com "${city}" "body corporate"`,
      `site:fnebooks.com "${city}" "body corporate"`,
      // BCCM adjudication orders (HTML pages that quote by-laws verbatim)
      `site:bccm.qld.gov.au "${city}" "body corporate"`,
    ];
  } else if (state === "WA") {
    // WA by-laws live in Landgate management statements (paid). Public web sources are thin:
    // best sources are WASAT tribunal decisions (acsl.net.au) which quote by-law content,
    // and contract pack PDFs from real estate agents.
    queries = [
      // Broader searches — catches WASAT decisions and council agendas
      `"${city} WA" strata "by-laws" filetype:pdf`,
      `"${city}" "Strata Plan" "by-laws" filetype:pdf`,
      `"${city} Western Australia" strata "by-laws" filetype:pdf`,
      // WASAT tribunal decisions — HTML pages, scraped for by-law content
      `site:acsl.net.au "${city}" strata`,
      `site:acsl.net.au "${city} WA" "scheme by-laws"`,
      // Specific WA terminology
      `"${loc}" "scheme by-laws" filetype:pdf`,
      `"${loc}" "strata company" by-laws filetype:pdf`,
      `"${loc}" "community rules" "community titles" filetype:pdf`,
      `"${loc}" "survey-strata" by-laws filetype:pdf`,
      // Contract pack / real estate sources
      `site:aro-au-prod-storage.s3-ap-southeast-2.amazonaws.com "${postcode ?? city}" strata`,
      `site:propertydocs.com.au "${city}" strata`,
      `site:vaultre.com.au "${city}" strata`,
      `site:agentboxcdn.com.au "${city}" strata`,
      `site:campaigntrack.com "${city}" strata`,
    ];
  } else if (state === "SA") {
    // SA has TWO distinct regimes with different terminology:
    // - Strata Titles Act 1988: uses "articles" (not by-laws!) with plan prefix "S" (e.g. S12345)
    // - Community Titles Act 1996: uses "by-laws" with plan prefix "C" (e.g. C12345)
    queries = [
      // Community title (by-laws)
      `"${loc}" "community title" by-laws filetype:pdf`,
      `"${loc}" "community corporation" by-laws filetype:pdf`,
      `"${city} SA" "community title" by-laws filetype:pdf`,
      // Strata (articles — the correct SA strata term)
      `"${loc}" "strata corporation" articles filetype:pdf`,
      `"${loc}" strata articles "Strata Titles Act" filetype:pdf`,
      `"${city} SA" "strata corporation" articles filetype:pdf`,
      // Broader fallbacks
      `"${loc}" "strata by-laws" filetype:pdf`,
      `site:aro-au-prod-storage.s3-ap-southeast-2.amazonaws.com "${postcode ?? city}" strata`,
      `site:propertydocs.com.au "${city}" strata`,
      `site:vaultre.com.au "${city}" strata`,
      `site:agentboxcdn.com.au "${city}" strata`,
    ];
  } else if (state === "ACT") {
    // ACT uses "owners corporation rules" (not by-laws). Plans are UP (Units Plan).
    queries = [
      `"${loc}" "owners corporation rules" filetype:pdf`,
      `"${loc}" "unit plan" "owners corporation rules" filetype:pdf`,
      `"${loc}" "unit title" rules filetype:pdf`,
      `"${city} ACT" "owners corporation rules" filetype:pdf`,
      `"${city} Canberra" "owners corporation rules" filetype:pdf`,
      `site:aro-au-prod-storage.s3-ap-southeast-2.amazonaws.com "${postcode ?? city}" owners corporation`,
      `site:propertydocs.com.au "${city}" "unit title"`,
      `site:vaultre.com.au "${city}" "owners corporation"`,
      `site:agentboxcdn.com.au "${city}" "owners corporation"`,
    ];
  } else if (state === "TAS") {
    // TAS uses "by-laws" / "body corporate" under Strata Titles Act 1998.
    // Custom by-laws must be lodged with Recorder of Titles within 3 months.
    queries = [
      `"${loc}" "strata by-laws" filetype:pdf`,
      `"${loc}" "body corporate" by-laws filetype:pdf`,
      `"${loc}" strata plan by-laws filetype:pdf`,
      `"${city} TAS" "strata by-laws" filetype:pdf`,
      `"${city} Tasmania" "strata by-laws" filetype:pdf`,
      `site:aro-au-prod-storage.s3-ap-southeast-2.amazonaws.com "${postcode ?? city}" strata`,
      `site:propertydocs.com.au "${city}" strata`,
      `site:vaultre.com.au "${city}" strata`,
      `site:agentboxcdn.com.au "${city}" strata`,
      // SACAT strata/community title decisions — HTML pages with by-law content
      `site:sacat.sa.gov.au "${city}" strata`,
    ];
  } else if (state === "NT") {
    // NT uses "by-laws" under Unit Title Schemes Act 2009. Governing body is Body Corporate.
    // Very small market — Darwin is the primary target.
    queries = [
      `"${loc}" "unit title" by-laws filetype:pdf`,
      `"${loc}" "unit plan" rules filetype:pdf`,
      `"${loc}" "unit title scheme" filetype:pdf`,
      `"${city} NT" "unit title" by-laws filetype:pdf`,
      `"${city} Darwin" "unit title scheme" by-laws filetype:pdf`,
      `"${loc}" "body corporate" by-laws filetype:pdf`,
      `site:aro-au-prod-storage.s3-ap-southeast-2.amazonaws.com "${postcode ?? city}" unit title`,
      `site:propertydocs.com.au "${city}" strata`,
      `site:vaultre.com.au "${city}" strata`,
    ];
  } else {
    // NSW default — also catches unknown states.
    // Plans are SP (Strata Plan). By-laws registered against common property title.
    // ren.com.au is a Newcastle-specific agency — only useful for NSW.
    queries = [
      // Direct by-law document searches
      `"${loc}" "strata by-laws" filetype:pdf`,
      `"${loc}" "consolidated by-laws" strata filetype:pdf`,
      `"${loc}" "registered by-laws" strata filetype:pdf`,
      `"Strata Plan By-laws" "${city}" filetype:pdf`,
      `"${city} NSW" "Strata Plan By-laws" filetype:pdf`,
      `"THE OWNERS - STRATA PLAN NO" "${city}" "CHANGE OF BY-LAWS"`,
      // Priority domain searches — contract packs include by-law schedules
      `site:aro-au-prod-storage.s3-ap-southeast-2.amazonaws.com "${postcode ?? city}" by-laws`,
      `site:ren.com.au/PDF "${city}" strata`,
      `site:propertydocs.com.au "${city}" strata`,
      `site:vaultre.com.au "${city}" "strata by-laws"`,
      `site:agentboxcdn.com.au "${city}" strata`,
      `site:campaigntrack.com "${city}" "strata by-laws"`,
      `site:fnebooks.com "${city}" strata`,
      // NCAT strata decisions — HTML pages that quote by-law content
      `site:ncat.nsw.gov.au "${city}" strata`,
    ];
  }

  const runQuery = async (q: string): Promise<{ url: string; title: string }[]> => {
    try {
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "X-API-KEY": process.env.SERPER_API_KEY!, "Content-Type": "application/json" },
        body: JSON.stringify({ q, num: 10, gl: "au", hl: "en" }),
      });
      if (!res.ok) return [];
      const data = await res.json() as { organic?: { title?: string; link?: string }[] };
      return (data.organic ?? []).map((item) => ({ url: item.link ?? "", title: item.title ?? "" }));
    } catch {
      return [];
    }
  };

  const allItems = (await Promise.all(queries.map(runQuery))).flat();

  const seen = new Set<string>();
  const results: SearchResult[] = [];
  for (const { url, title } of allItems) {
    const urlLower = url.toLowerCase();
    const isPdf = urlLower.endsWith(".pdf");
    const isHtml = AU_HTML_DOMAINS.some((d) => urlLower.includes(d));
    if (!isPdf && !isHtml) continue;
    if (isGenericCdn(url) || seen.has(url)) continue;
    if (!isRelevantAuResult(url, title)) continue;
    seen.add(url);
    results.push({ url, title: title || (url.split("/").pop() ?? url), source: "serper" });
  }

  console.log(`[search] ${suburb} (serper au): ${results.length} results`);
  return results.slice(0, 30);
}

async function searchUsWithSerper(suburb: string, city: string, postcode: string | null, auState?: string | null): Promise<SearchResult[]> {
  // auState === "WA" means Washington state (AU parser strips it from suburb name)
  const isWashington = auState === "WA";
  const loc = postcode ? `${city} ${postcode}` : `${city}, Washington`;

  let queries: string[];

  if (isWashington) {
    const county = WA_COUNTY_BY_CITY[city.replace(" ", "_")] ?? null;
    queries = [
      `"${city} Washington" "declaration of condominium" filetype:pdf`,
      `"${city} WA" HOA bylaws filetype:pdf`,
      `"${city} Washington" condominium declaration filetype:pdf`,
      `"${city} WA" "CC&Rs" condominium filetype:pdf`,
      ...(county ? [`site:${county.toLowerCase()}county.gov "${city}" condominium declaration pdf`] : []),
    ];
  } else {
    const stateMatch = city.match(/\s+([A-Z]{2})$/);
    const stateCode = stateMatch?.[1] ?? null;
    const stateName = stateCode ? (US_STATE_NAMES[stateCode] ?? stateCode) : "USA";
    const cleanCity = stateCode ? city.replace(/\s+[A-Z]{2}$/, "").trim() : city;
    const fullLoc = postcode ? `${cleanCity} ${postcode}` : `${cleanCity}, ${stateName}`;
    queries = [
      `"${fullLoc}" "declaration of condominium" filetype:pdf`,
      `"${fullLoc}" "condominium declaration" filetype:pdf`,
      `"${fullLoc}" HOA bylaws filetype:pdf`,
      `"${fullLoc}" "CC&Rs" filetype:pdf`,
    ];
  }

  const runQuery = async (q: string): Promise<{ url: string; title: string }[]> => {
    try {
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "X-API-KEY": process.env.SERPER_API_KEY!, "Content-Type": "application/json" },
        body: JSON.stringify({ q, num: 10, gl: "us", hl: "en" }),
      });
      if (!res.ok) return [];
      const data = await res.json() as { organic?: { title?: string; link?: string }[] };
      return (data.organic ?? []).map((item) => ({ url: item.link ?? "", title: item.title ?? "" }));
    } catch {
      return [];
    }
  };

  const allItems = (await Promise.all(queries.map(runQuery))).flat();

  const seen = new Set<string>();
  const results: SearchResult[] = [];
  for (const { url, title } of allItems) {
    if (!url.toLowerCase().endsWith(".pdf")) continue;
    if (isNoisy(url, "us") || isGenericCdn(url) || seen.has(url)) continue;
    if (!isRelevantUsResult(url, title)) continue;
    seen.add(url);
    results.push({ url, title: title || (url.split("/").pop() ?? url), source: "serper" });
  }

  console.log(`[search] ${suburb} (serper): ${results.length} PDFs`);
  return results.slice(0, 30);
}

export async function searchSuburbForPdfs(suburb: string, regionOverride?: "au" | "us"): Promise<SearchResult[]> {
  const { city, postcode, state } = getSearchTerms(suburb);
  const region = regionOverride ?? getRegion(suburb);

  if (region === "us" && process.env.SERPER_API_KEY) {
    return searchUsWithSerper(suburb, city, postcode, state);
  }

  if (region === "au" && process.env.SERPER_API_KEY) {
    return searchAuWithSerper(suburb, city, postcode, state);
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
