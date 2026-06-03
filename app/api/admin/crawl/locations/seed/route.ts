import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { NSW_SUBURBS } from "@/lib/crawler/suburbs-nsw";
import { VIC_SUBURBS } from "@/lib/crawler/suburbs-vic";
import { QLD_SUBURBS } from "@/lib/crawler/suburbs-qld";
import { WA_SUBURBS } from "@/lib/crawler/suburbs-wa";
import { SA_SUBURBS } from "@/lib/crawler/suburbs-sa";
import { TAS_SUBURBS } from "@/lib/crawler/suburbs-tas";
import { SEATTLE_NEIGHBORHOODS } from "@/lib/crawler/suburbs-seattle";
import { POSTCODE_MAP } from "@/lib/crawler/postcodes";

function isAuthed(req: NextRequest) {
  const cookie = req.cookies.get("admin_token")?.value;
  return cookie === process.env.ADMIN_SECRET;
}

type LocationSeed = {
  name: string;
  display_name: string;
  state: string;
  region: "au" | "us";
  postcode: string | null;
  enabled: boolean;
};

function makeAuLocation(name: string, state: string): LocationSeed {
  const display_name = name.replace(/\s+(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)$/i, "").trim();
  const postcode = (POSTCODE_MAP as Record<string, string>)[name] ?? null;
  return { name, display_name, state, region: "au", postcode, enabled: true };
}

function makeUsLocation(name: string): LocationSeed {
  const display_name = name.replace(/ Seattle$/, "").replace(/ WA$/, "").trim();
  const postcode = (POSTCODE_MAP as Record<string, string>)[name] ?? null;
  return { name, display_name, state: "WA", region: "us", postcode, enabled: true };
}

export const AU_STATE_LISTS: Record<string, string[]> = {
  NSW: NSW_SUBURBS,
  VIC: VIC_SUBURBS,
  QLD: QLD_SUBURBS,
  WA:  WA_SUBURBS,
  SA:  SA_SUBURBS,
  TAS: TAS_SUBURBS,
};

export const US_STATE_LISTS: Record<string, string[]> = {
  "WA (Seattle)": SEATTLE_NEIGHBORHOODS,
};

// POST /api/admin/crawl/locations/seed
// Body: { state?: string } — omit to seed all
export async function POST(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { state?: string };
  const filterState = body.state; // e.g. "QLD" or "WA (Seattle)"

  const locations: LocationSeed[] = [];

  for (const [state, suburbs] of Object.entries(AU_STATE_LISTS)) {
    if (filterState && filterState !== state) continue;
    locations.push(...suburbs.map((s) => makeAuLocation(s, state)));
  }

  for (const [, suburbs] of Object.entries(US_STATE_LISTS)) {
    if (filterState && filterState !== "WA (Seattle)") continue;
    locations.push(...suburbs.map((s) => makeUsLocation(s)));
  }

  const unique = Array.from(new Map(locations.map((l) => [l.name, l])).values());
  if (unique.length === 0) return NextResponse.json({ error: "No locations matched" }, { status: 400 });

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("crawl_locations")
    .upsert(unique, { onConflict: "name", ignoreDuplicates: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, total: unique.length, state: filterState ?? "all" });
}
