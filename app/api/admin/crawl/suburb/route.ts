import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { searchSuburbForPdfs } from "@/lib/crawler/search";
import { ingestPdfLight } from "@/lib/crawler/ingest-light";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { suburb } = await req.json() as { suburb?: string };
    if (!suburb) return NextResponse.json({ error: "suburb required" }, { status: 400 });

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not set on this server" }, { status: 500 });
    }

    const supabase = createServiceClient();
    const results = await searchSuburbForPdfs(suburb);

    let docsFound = 0;
    const errors: string[] = [];

    for (const result of results) {
      const outcome = await ingestPdfLight(result.url, suburb, supabase);
      if (outcome.ok) {
        docsFound++;
      } else if (outcome.reason !== "Duplicate") {
        errors.push(outcome.reason);
      }
    }

    await supabase
      .from("suburb_crawls")
      .upsert({ suburb, docs_found: docsFound, searched_at: new Date().toISOString() }, { onConflict: "suburb" });

    return NextResponse.json({ ok: true, suburb, docsFound, searched: results.length, errors });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[crawl/suburb]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
