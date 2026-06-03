export const dynamic = "force-dynamic";

import { createServiceClient } from "@/lib/supabase/server";
import { getAllCrawlLocations } from "@/lib/crawler/suburbs-db";
import { SuburbList } from "./suburb-list";

type CrawledRow = { suburb: string; docs_found: number; searched_at: string };
type DocRow = { id: string; label: string; source_url: string | null; processed_at: string | null; crawl_suburb: string | null };

async function fetchAllCrawled(supabase: ReturnType<typeof createServiceClient>): Promise<CrawledRow[]> {
  const PAGE = 1000;
  const all: CrawledRow[] = [];
  let from = 0;
  while (true) {
    const { data } = await supabase.from("suburb_crawls").select("suburb, docs_found, searched_at").order("searched_at", { ascending: false }).range(from, from + PAGE - 1);
    if (!data || data.length === 0) break;
    all.push(...(data as CrawledRow[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

async function fetchAllCrawlerDocs(supabase: ReturnType<typeof createServiceClient>): Promise<DocRow[]> {
  const PAGE = 1000;
  const all: DocRow[] = [];
  let from = 0;
  while (true) {
    const { data } = await supabase.from("documents").select("id, label, source_url, processed_at, crawl_suburb").eq("ingested_via", "crawler").not("crawl_suburb", "is", null).order("created_at", { ascending: false }).range(from, from + PAGE - 1);
    if (!data || data.length === 0) break;
    all.push(...(data as DocRow[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

export default async function CrawlPage() {
  const supabase = createServiceClient();

  const [locations, crawledRows, crawlerDocs] = await Promise.all([
    getAllCrawlLocations(supabase),
    fetchAllCrawled(supabase),
    fetchAllCrawlerDocs(supabase),
  ]);

  const crawledMap = Object.fromEntries(crawledRows.map((r) => [r.suburb, r]));

  const docsBySuburb: Record<string, DocRow[]> = {};
  for (const doc of crawlerDocs) {
    const s = doc.crawl_suburb!;
    if (!docsBySuburb[s]) docsBySuburb[s] = [];
    docsBySuburb[s]!.push(doc);
  }

  const totalCrawled = locations.filter((l) => crawledMap[l.name]).length;
  const totalDocs = crawledRows.reduce((sum, r) => sum + (r.docs_found ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Crawler</h1>
        <p className="text-slate-400 text-sm mt-1">
          Add locations, enable/disable them, and crawl for PDFs — no code deploy needed.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Locations tracked", value: locations.length },
          { label: "Locations crawled",  value: totalCrawled    },
          { label: "Documents found",    value: totalDocs        },
        ].map(({ label, value }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-mono font-semibold text-white">{value}</p>
            <p className="text-slate-500 text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>

      <SuburbList
        locations={locations}
        crawledMap={crawledMap}
        docsBySuburb={docsBySuburb}
      />
    </div>
  );
}
