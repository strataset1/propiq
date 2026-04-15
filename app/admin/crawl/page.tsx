import { createServiceClient } from "@/lib/supabase/server";
import { CrawlPanel } from "@/components/admin/crawl-panel";

async function crawlSuburb(suburb: string): Promise<{
  skipped?: boolean;
  reason?: string;
  docsFound?: number;
  ingested?: { url: string; address: string }[];
  skippedUrls?: { url: string; reason: string }[];
  error?: string;
}> {
  "use server";

  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/crawl`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-secret": process.env.ADMIN_SECRET!,
    },
    body: JSON.stringify({ suburb }),
  });

  return res.json();
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
