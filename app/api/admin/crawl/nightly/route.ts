// Called nightly by Vercel cron at 6am AEST
// Crawls the next 20 uncrawled suburbs automatically
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { SYDNEY_SUBURBS } from "@/lib/crawler/suburbs";
import { searchSuburbForPdfs } from "@/lib/crawler/search";
import { ingestPdfFromUrl } from "@/lib/crawler/ingest";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  // Vercel cron requests include this header
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Find already-crawled suburbs
  const { data: crawled } = await supabase.from("suburb_crawls").select("suburb");
  const crawledSet = new Set(crawled?.map((r) => r.suburb) ?? []);

  // Pick next 20 uncrawled
  const toProcess = SYDNEY_SUBURBS.filter((s) => !crawledSet.has(s)).slice(0, 20);

  if (toProcess.length === 0) {
    return NextResponse.json({ message: "All suburbs crawled", processed: 0 });
  }

  let totalDocs = 0;

  for (const suburb of toProcess) {
    const results = await searchSuburbForPdfs(suburb);
    let docsFound = 0;

    for (const result of results) {
      const outcome = await ingestPdfFromUrl(result.url, suburb, supabase);
      if (outcome.ok) docsFound++;
    }

    await supabase.from("suburb_crawls").insert({ suburb, docs_found: docsFound });
    totalDocs += docsFound;
  }

  return NextResponse.json({ processed: toProcess.length, totalDocs });
}
