// SP-number-based by-law document search and classifier.
// Job 2: crawl_public_bylaw_documents — input is strata_plans.sp_number.

const PRIORITY_DOMAINS = [
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
];

const BYLAW_TEXT_SIGNALS = [
  "strata by-laws",
  "by-laws",
  "change of by-laws",
  "the owners - strata plan no",
  "strata schemes management act",
  "common property rights by-law",
  "special by-law",
  "exclusive use by-law",
  "model by-laws",
];

const BYLAW_CLAUSE_SIGNALS = [
  "obstruction of common property",
  "damage to lawns",
  "damage to common property",
  "behaviour of owners",
  "approved form 15ch",
  "behaviour of owners and occupiers",
  "parking on common property",
  "keeping of animals",
];

export type ByLawClassification = {
  is_actual_bylaws: boolean;
  is_contract_pack: boolean;
  contains_bylaws: boolean;
  confidence: number;
};

export function classifyByLawContent(text: string): ByLawClassification {
  const lower = text.toLowerCase();
  const signalHits = BYLAW_TEXT_SIGNALS.filter((s) => lower.includes(s)).length;
  const clauseHits = BYLAW_CLAUSE_SIGNALS.filter((s) => lower.includes(s)).length;
  const isContractPack =
    lower.includes("contract of sale") || lower.includes("marketing contract");

  const containsBylaws = signalHits >= 2 || clauseHits >= 1;
  const isActualBylaws = signalHits >= 3 || clauseHits >= 2;
  const confidence = Math.min(1, signalHits * 0.12 + clauseHits * 0.25);

  return {
    is_actual_bylaws: isActualBylaws && !isContractPack,
    is_contract_pack: isContractPack,
    contains_bylaws: containsBylaws,
    confidence: Math.round(confidence * 100) / 100,
  };
}

type SerperItem = { title?: string; link?: string };

async function serperSearch(query: string): Promise<{ url: string; title: string }[]> {
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": process.env.SERPER_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query, num: 10, gl: "au", hl: "en" }),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { organic?: SerperItem[] };
  return (data.organic ?? [])
    .map((r) => ({ url: r.link ?? "", title: r.title ?? "" }))
    .filter((r) => r.url);
}

function isPriorityDomain(url: string): boolean {
  const u = url.toLowerCase();
  return PRIORITY_DOMAINS.some((d) => u.includes(d));
}

function isLikelyDocUrl(url: string): boolean {
  const u = url.toLowerCase();
  return (
    u.endsWith(".pdf") ||
    u.includes("by-law") ||
    u.includes("bylaw") ||
    u.includes("strata") ||
    u.includes("contract")
  );
}

export type SpSearchResult = {
  url: string;
  title: string;
  query: string;
  is_priority: boolean;
};

export async function searchByLawsForSp(
  spNumber: string,
  address: string | null,
  suburb: string | null,
): Promise<SpSearchResult[]> {
  const num = spNumber.replace(/^SP\s*/i, "");
  const addr = address ?? suburb ?? "";

  const queries: string[] = [
    `"SP${num}" "by-laws" filetype:pdf`,
    `"SP ${num}" "by-laws" filetype:pdf`,
    `"Strata Plan ${num}" "by-laws" filetype:pdf`,
    `"Strata Plan No ${num}" "by-laws" filetype:pdf`,
    `"THE OWNERS - STRATA PLAN NO. ${num}" filetype:pdf`,
    `"THE OWNERS - STRATA PLAN NO ${num}" "CHANGE OF BY-LAWS"`,
    `"SP${num}" "change of by-laws"`,
    `"SP ${num}" "strata by-laws"`,
    `"SP${num}" "contract of sale" filetype:pdf`,
    `"SP${num}" "marketing contract" filetype:pdf`,
    `"SP${num}" "common property" "by-laws"`,
  ];

  if (suburb) {
    queries.push(`"${suburb}" "Strata Plan ${num}" filetype:pdf`);
  }

  if (addr) {
    queries.push(
      `"${addr}" "strata by-laws" filetype:pdf`,
      `"${addr}" "contract of sale" filetype:pdf`,
      `"${addr}" "marketing contract" filetype:pdf`,
      `"${addr}" "SP${num}" filetype:pdf`,
    );
  }

  const seen = new Set<string>();
  const results: SpSearchResult[] = [];

  for (const query of queries) {
    try {
      const hits = await serperSearch(query);
      for (const hit of hits) {
        if (!hit.url || seen.has(hit.url)) continue;
        if (!isLikelyDocUrl(hit.url)) continue;
        seen.add(hit.url);
        results.push({
          url: hit.url,
          title: hit.title,
          query,
          is_priority: isPriorityDomain(hit.url),
        });
      }
    } catch {
      // skip failed query
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  // Priority domains first
  results.sort((a, b) => (b.is_priority ? 1 : 0) - (a.is_priority ? 1 : 0));
  return results;
}
