export const dynamic = "force-dynamic";

import { createServiceClient } from "@/lib/supabase/server";
import { NSW_SUBURBS } from "@/lib/crawler/suburbs-nsw";
import { VIC_SUBURBS } from "@/lib/crawler/suburbs-vic";
import { SEATTLE_NEIGHBORHOODS } from "@/lib/crawler/suburbs-seattle";
import { SuburbList } from "./suburb-list";

export default async function CrawlPage() {
  const supabase = createServiceClient();

  const { data: crawled } = await supabase
    .from("suburb_crawls")
    .select("suburb, docs_found, searched_at")
    .order("searched_at", { ascending: false });

  const { data: crawlerDocs } = await supabase
    .from("documents")
    .select("id, label, source_url, processed_at, crawl_suburb")
    .eq("ingested_via", "crawler")
    .not("crawl_suburb", "is", null)
    .order("created_at", { ascending: false });

  const crawledMap = Object.fromEntries(
    (crawled ?? []).map((r) => [r.suburb, r])
  );

  const docsBySuburb: Record<string, typeof crawlerDocs> = {};
  for (const doc of crawlerDocs ?? []) {
    const s = doc.crawl_suburb!;
    if (!docsBySuburb[s]) docsBySuburb[s] = [];
    docsBySuburb[s]!.push(doc);
  }

  const allSuburbs = [...NSW_SUBURBS, ...VIC_SUBURBS, ...SEATTLE_NEIGHBORHOODS];
  const totalCrawled = allSuburbs.filter((s) => crawledMap[s]).length;
  const totalDocs = (crawled ?? []).reduce((sum, r) => sum + (r.docs_found ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Crawler</h1>
        <p className="text-slate-400 text-sm mt-1">
          Click a suburb to expand documents, or hit Crawl to search for PDFs.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Suburbs crawled", value: totalCrawled },
          { label: "Suburbs remaining", value: allSuburbs.length - totalCrawled },
          { label: "Documents found", value: totalDocs },
        ].map(({ label, value }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-mono font-semibold text-white">{value}</p>
            <p className="text-slate-500 text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>

      <SuburbList
        nswSuburbs={NSW_SUBURBS}
        vicSuburbs={VIC_SUBURBS}
        seattleNeighborhoods={SEATTLE_NEIGHBORHOODS}
        crawledMap={crawledMap}
        docsBySuburb={docsBySuburb as Record<string, { id: string; label: string; source_url: string | null; processed_at: string | null; crawl_suburb: string | null }[]>}
      />
    </div>
  );
}
