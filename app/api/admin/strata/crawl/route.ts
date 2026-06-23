import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { searchByLawsForSp } from "@/lib/crawler/strata-bylaws";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { sp_number } = (await req.json()) as { sp_number?: string };
    if (!sp_number) return NextResponse.json({ error: "sp_number required" }, { status: 400 });

    const supabase = createServiceClient();

    const { data: plan, error: planErr } = await supabase
      .from("strata_plans")
      .select("sp_number, address, suburb")
      .eq("sp_number", sp_number)
      .single();

    if (planErr || !plan) {
      return NextResponse.json({ error: "SP not found in strata_plans" }, { status: 404 });
    }

    const results = await searchByLawsForSp(plan.sp_number, plan.address, plan.suburb);

    let inserted = 0;
    const queriesSeen = new Set<string>();

    for (const r of results) {
      let domain = "";
      try {
        domain = new URL(r.url).hostname;
      } catch {
        domain = r.url.split("/")[2] ?? "";
      }

      const { error } = await supabase.from("strata_documents").upsert(
        {
          sp_number: plan.sp_number,
          url: r.url,
          source_domain: domain,
          document_title: r.title,
        },
        { onConflict: "sp_number,url", ignoreDuplicates: true },
      );
      if (!error) inserted++;

      // Log each unique query once
      if (!queriesSeen.has(r.query)) {
        queriesSeen.add(r.query);
        await supabase.from("strata_doc_searches").insert({
          sp_number: plan.sp_number,
          query: r.query,
          search_provider: "serper",
          raw_results: results.filter((x) => x.query === r.query),
        });
      }
    }

    return NextResponse.json({
      ok: true,
      sp_number,
      found: results.length,
      inserted,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[strata/crawl]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
