// Called nightly by Vercel cron at 6am AEST
// Crawls the next 20 uncrawled enabled locations from the DB
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getCrawlLocations } from "@/lib/crawler/suburbs-db";
import { searchSuburbForPdfs } from "@/lib/crawler/search";
import { ingestPdfLight } from "@/lib/crawler/ingest-light";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const [locations, crawledResult] = await Promise.all([
    getCrawlLocations(supabase),
    supabase.from("suburb_crawls").select("suburb"),
  ]);

  const crawledSet = new Set(crawledResult.data?.map((r) => r.suburb) ?? []);
  const toProcess  = locations.filter((l) => !crawledSet.has(l.name)).slice(0, 20);

  if (toProcess.length === 0) {
    return NextResponse.json({ message: "All locations crawled", processed: 0 });
  }

  let totalDocs = 0;

  for (const loc of toProcess) {
    const region = loc.region;
    const results = await searchSuburbForPdfs(loc.name, region);
    let docsFound = 0;

    for (const result of results) {
      const outcome = await ingestPdfLight(result.url, loc.name, supabase, region);
      if (outcome.ok) docsFound++;
    }

    await supabase.from("suburb_crawls").upsert(
      { suburb: loc.name, docs_found: docsFound, searched_at: new Date().toISOString() },
      { onConflict: "suburb" }
    );
    totalDocs += docsFound;
  }

  return NextResponse.json({ processed: toProcess.length, totalDocs });
}
