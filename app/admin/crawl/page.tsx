import { createServiceClient } from "@/lib/supabase/server";
import { SYDNEY_SUBURBS } from "@/lib/crawler/suburbs";

export default async function CrawlPage() {
  const supabase = createServiceClient();

  const { data: crawled } = await supabase
    .from("suburb_crawls")
    .select("suburb, docs_found, searched_at")
    .order("searched_at", { ascending: false });

  const crawledMap = new Map(crawled?.map((r) => [r.suburb, r]) ?? []);

  const totalDocs = crawled?.reduce((sum, r) => sum + (r.docs_found ?? 0), 0) ?? 0;
  const crawledCount = crawledMap.size;
  const remaining = SYDNEY_SUBURBS.length - crawledCount;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Crawler Status</h1>
        <p className="text-slate-400 text-sm mt-1">
          Run the crawler from your terminal — it cannot run on Vercel due to PDF processing requirements.
        </p>
      </div>

      <div className="bg-slate-900 border border-amber-800 rounded-xl p-4">
        <p className="text-amber-400 text-sm font-mono">node scripts/crawl.mjs 20</p>
        <p className="text-slate-500 text-xs mt-1">Run from the <code className="text-slate-400">~/propiq</code> directory with env vars exported.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Suburbs crawled", value: crawledCount },
          { label: "Suburbs remaining", value: remaining },
          { label: "Documents found", value: totalDocs },
        ].map(({ label, value }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-mono font-semibold text-white">{value}</p>
            <p className="text-slate-500 text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
        {SYDNEY_SUBURBS.map((suburb) => {
          const result = crawledMap.get(suburb);
          return (
            <div
              key={suburb}
              className={`flex items-center justify-between px-4 py-2.5 rounded-lg text-sm ${
                result ? "bg-slate-900 border border-slate-800" : "bg-slate-900/40 border border-slate-800/40"
              }`}
            >
              <span className={result ? "text-white" : "text-slate-500"}>{suburb}</span>
              <span className="text-xs font-mono shrink-0 ml-4">
                {result ? (
                  <span className="text-emerald-400">{result.docs_found} doc{result.docs_found === 1 ? "" : "s"}</span>
                ) : (
                  <span className="text-slate-700">pending</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
