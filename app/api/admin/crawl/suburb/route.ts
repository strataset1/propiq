import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { searchSuburbForPdfs } from "@/lib/crawler/search";
import { ingestPdfLight } from "@/lib/crawler/ingest";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { suburb } = await req.json() as { suburb?: string };
  if (!suburb) return NextResponse.json({ error: "suburb required" }, { status: 400 });

  const supabase = createServiceClient();
  const results = await searchSuburbForPdfs(suburb);

  let docsFound = 0;
  const errors: string[] = [];

  for (const result of results) {
    const outcome = await ingestPdfLight(result.url, suburb, supabase);
    if (outcome.ok) {
      docsFound++;
    } else if (outcome.reason !== "Duplicate") {
      errors.push(`${result.url}: ${outcome.reason}`);
    }
  }

  await supabase
    .from("suburb_crawls")
    .upsert({ suburb, docs_found: docsFound, searched_at: new Date().toISOString() }, { onConflict: "suburb" });

  return NextResponse.json({ ok: true, suburb, docsFound, searched: results.length, errors });
}
