import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchStrataPlansForLga } from "@/lib/crawler/strata-hub";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { lga } = (await req.json()) as { lga?: string };
    if (!lga) return NextResponse.json({ error: "lga required" }, { status: 400 });

    const plans = await fetchStrataPlansForLga(lga);

    if (plans.length === 0) {
      return NextResponse.json({ ok: true, found: 0, upserted: 0 });
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("strata_plans")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert(plans as any[], { onConflict: "sp_number" });

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, found: plans.length, upserted: plans.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[strata/discover]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
