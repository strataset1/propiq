import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { searchSuburbForPdfs, extractSpFromUrl } from "@/lib/crawler/search";
import { ingestPdfLight, ingestHtmlPage, isHtmlDomain } from "@/lib/crawler/ingest-light";

export const maxDuration = 300;

const INGEST_CONCURRENCY = 6;

async function ingestResult(
  url: string,
  title: string,
  suburb: string,
  region: "au" | "us",
  supabase: ReturnType<typeof createServiceClient>
): Promise<{ ok: boolean; reason?: string }> {
  let outcome = await ingestPdfLight(url, suburb, supabase, region);
  if (!outcome.ok && outcome.reason === "Not a PDF" && region === "au" && isHtmlDomain(url)) {
    outcome = await ingestHtmlPage(url, suburb, supabase, region);
  }
  return outcome;
}

export async function POST(req: NextRequest) {
  try {
    const { suburb, region = "au" } = await req.json() as { suburb?: string; region?: "au" | "us" };
    if (!suburb) return NextResponse.json({ error: "suburb required" }, { status: 400 });

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not set on this server" }, { status: 500 });
    }

    const supabase = createServiceClient();
    const results = await searchSuburbForPdfs(suburb, region);

    let docsFound = 0;
    const errors: string[] = [];

    // Ingest in parallel batches to avoid sequential download bottleneck
    for (let i = 0; i < results.length; i += INGEST_CONCURRENCY) {
      const batch = results.slice(i, i + INGEST_CONCURRENCY);
      const outcomes = await Promise.all(
        batch.map((r) => ingestResult(r.url, r.title, suburb, region, supabase))
      );
      for (const outcome of outcomes) {
        if (outcome.ok) {
          docsFound++;
        } else if (outcome.reason !== "Duplicate") {
          errors.push(outcome.reason ?? "Unknown");
        }
      }
    }

    // For AU suburbs, extract SP numbers from discovered URLs and populate strata_plans.
    if (region === "au") {
      const discovered = new Map<number, string>();
      for (const r of results) {
        const sp = extractSpFromUrl(r.url, r.title);
        if (sp && !discovered.has(sp)) discovered.set(sp, r.url);
      }
      if (discovered.size > 0) {
        const suburbBase = suburb.replace(/\s+\w{2,3}$/, "").replace(/\s+\d{4}$/, "").trim();
        const records = Array.from(discovered.entries()).map(([n, url]) => ({
          sp_number: `SP${n}`,
          plan_number_int: n,
          suburb: suburbBase,
          source_url: url,
        }));
        await supabase.from("strata_plans").upsert(records as any[], {
          onConflict: "sp_number",
          ignoreDuplicates: true,
        });
        console.log(`[crawl/suburb] ${suburb} — auto-discovered ${discovered.size} SP numbers`);
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
