import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const lga = req.nextUrl.searchParams.get("lga") ?? "";
  const supabase = createServiceClient();

  const query = supabase
    .from("strata_plans")
    .select("sp_number, address, suburb, lots_count, strata_manager_name, crawled_at")
    .order("plan_number_int", { ascending: true });

  if (lga) query.ilike("lga", `%${lga}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ plans: data ?? [] });
}
