// NSW Strata Hub / StrataSearch public API client
//
// IMPORTANT: Before running at scale, open https://stratasearch.fairtrading.nsw.gov.au
// in Chrome DevTools → Network tab, search for an LGA (e.g. "Newcastle"), and confirm
// the actual JSON endpoint + field names. Update STRATA_HUB_SEARCH_URL and parseScheme()
// below to match what you see. The endpoint pattern below is a best-guess; it will throw
// a descriptive error if the response is not JSON so you know what to fix.

const STRATA_HUB_SEARCH_URL = "https://stratasearch.fairtrading.nsw.gov.au/api/Scheme/Search";

export type StrataPlanRecord = {
  sp_number: string;
  plan_number_int: number | null;
  address: string | null;
  suburb: string | null;
  postcode: string | null;
  lga: string | null;
  lots_count: number | null;
  registration_date: string | null;
  last_agm_date: string | null;
  last_reported_date: string | null;
  strata_manager_name: string | null;
  strata_manager_licence: string | null;
  source_url: string;
  raw_json: Record<string, unknown>;
};

// Adapt field names here once you've seen the actual API response in DevTools.
function parseScheme(raw: Record<string, unknown>, sourceUrl: string): StrataPlanRecord | null {
  const spRaw =
    raw.strataPlanNumber ?? raw.planNumber ?? raw.sp_number ?? raw.schemeNumber ?? raw.number;
  if (!spRaw) return null;

  const sp = String(spRaw).replace(/^SP\s*/i, "").trim();
  const spFormatted = `SP${sp}`;
  const planInt = parseInt(sp, 10) || null;

  return {
    sp_number: spFormatted,
    plan_number_int: planInt,
    address: strOf(raw.address ?? raw.streetAddress ?? raw.principalAddress),
    suburb: strOf(raw.suburb ?? raw.locality ?? raw.town),
    postcode: strOf(raw.postcode ?? raw.postalCode),
    lga: strOf(raw.lga ?? raw.localGovernmentArea ?? raw.council),
    lots_count: numOf(raw.lotsCount ?? raw.numberOfLots ?? raw.lots),
    registration_date: strOf(raw.registrationDate ?? raw.registeredDate ?? raw.dateRegistered),
    last_agm_date: strOf(raw.lastAgmDate ?? raw.lastAGMDate ?? raw.agmDate),
    last_reported_date: strOf(raw.lastReportedDate ?? raw.lastReported),
    strata_manager_name: strOf(raw.strataManagerName ?? raw.managingAgent ?? raw.agentName),
    strata_manager_licence: strOf(raw.strataManagerLicence ?? raw.agentLicence ?? raw.licenceNumber),
    source_url: sourceUrl,
    raw_json: raw,
  };
}

function strOf(v: unknown): string | null {
  return v != null ? String(v) : null;
}

function numOf(v: unknown): number | null {
  const n = Number(v);
  return isNaN(n) ? null : n;
}

export async function fetchStrataPlansForLga(lga: string): Promise<StrataPlanRecord[]> {
  const PAGE_SIZE = 100;
  const records: StrataPlanRecord[] = [];
  let page = 1;
  let total = Infinity;

  while (records.length < total) {
    const url = `${STRATA_HUB_SEARCH_URL}?localGovernmentArea=${encodeURIComponent(lga)}&pageNumber=${page}&pageSize=${PAGE_SIZE}`;

    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; ByLawsIndexBot/1.0; +https://bylawsindex.com)",
      },
    });

    if (!res.ok) {
      throw new Error(
        `Strata Hub returned HTTP ${res.status} for LGA "${lga}" page ${page}.\n` +
        `Endpoint tried: ${url}\n` +
        `Check DevTools on stratasearch.fairtrading.nsw.gov.au and update STRATA_HUB_SEARCH_URL in lib/crawler/strata-hub.ts.`
      );
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("json")) {
      const body = await res.text();
      throw new Error(
        `Strata Hub returned non-JSON (${contentType}).\n` +
        `Body preview: ${body.slice(0, 400)}\n\n` +
        `Check DevTools on stratasearch.fairtrading.nsw.gov.au and update STRATA_HUB_SEARCH_URL in lib/crawler/strata-hub.ts.`
      );
    }

    type ApiResponse = {
      total?: number;
      totalCount?: number;
      count?: number;
      totalRecords?: number;
      items?: Record<string, unknown>[];
      results?: Record<string, unknown>[];
      data?: Record<string, unknown>[];
      schemes?: Record<string, unknown>[];
      records?: Record<string, unknown>[];
    };

    const data = (await res.json()) as ApiResponse;

    const items =
      data.items ?? data.results ?? data.data ?? data.schemes ?? data.records ?? [];
    total =
      (data.total ?? data.totalCount ?? data.count ?? data.totalRecords) ??
      items.length;

    if (items.length === 0) break;

    for (const raw of items) {
      const record = parseScheme(raw, url);
      if (record) records.push(record);
    }

    if (records.length >= total) break;
    page++;
    await new Promise((r) => setTimeout(r, 400));
  }

  return records;
}
