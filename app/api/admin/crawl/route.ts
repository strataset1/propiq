import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { searchSuburbForPdfs } from "@/lib/crawler/search";
import { ingestPdfFromUrl } from "@/lib/crawler/ingest";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  const isCron = req.headers.get("x-vercel-cron") === "1";

  if (!isCron && secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { suburb } = await req.json() as { suburb: string };
  if (!suburb) {
    return NextResponse.json({ error: "suburb is required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Check if already crawled
  const { data: existing } = await supabase
    .from("suburb_crawls")
    .select("id")
    .eq("suburb", suburb)
    .single();

  if (existing) {
    return NextResponse.json({ skipped: true, reason: "Already crawled" });
  }

  // Search for PDFs
  const results = await searchSuburbForPdfs(suburb);
  let docsFound = 0;
  const ingested: { url: string; address: string }[] = [];
  const skipped: { url: string; reason: string }[] = [];

  for (const result of results) {
    const outcome = await ingestPdfFromUrl(result.url, suburb, supabase);
    if (outcome.ok) {
      docsFound++;
      ingested.push({ url: result.url, address: outcome.address });
    } else {
      skipped.push({ url: result.url, reason: outcome.reason });
    }
  }

  // Record crawl
  await supabase.from("suburb_crawls").insert({ suburb, docs_found: docsFound });

  return NextResponse.json({ suburb, docsFound, ingested, skipped });
}
