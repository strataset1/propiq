import { createServiceClient } from "@/lib/supabase/server";
import { CrawlPanel } from "@/components/admin/crawl-panel";
import { searchSuburbForPdfs } from "@/lib/crawler/search";
import { ingestPdfFromUrl } from "@/lib/crawler/ingest";

async function crawlSuburb(suburb: string): Promise<{
  skipped?: boolean;
  reason?: string;
  docsFound?: number;
  error?: string;
}> {
  "use server";

  const supabase = createServiceClient();

  // Check if already crawled
  const { data: existing } = await supabase
    .from("suburb_crawls")
    .select("id")
    .eq("suburb", suburb)
    .single();

  if (existing) return { skipped: true, reason: "Already crawled" };

  // Search and ingest
  const results = await searchSuburbForPdfs(suburb);
  let docsFound = 0;

  for (const result of results) {
    const outcome = await ingestPdfFromUrl(result.url, suburb, supabase);
    if (outcome.ok) docsFound++;
  }

  await supabase.from("suburb_crawls").insert({ suburb, docs_found: docsFound });

  return { docsFound };
}

export default async function CrawlPage() {
  const supabase = createServiceClient();

  const { data: crawled } = await supabase
    .from("suburb_crawls")
    .select("suburb");

  const crawledSuburbs = crawled?.map((r) => r.suburb) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Crawler</h1>
        <p className="text-slate-400 text-sm mt-1">
          Searches the web for strata by-law PDFs by suburb and ingests them automatically.
        </p>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <CrawlPanel crawledSuburbs={crawledSuburbs} crawlAction={crawlSuburb} />
      </div>
    </div>
  );
}
