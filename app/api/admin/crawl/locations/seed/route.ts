import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { NSW_SUBURBS } from "@/lib/crawler/suburbs-nsw";
import { VIC_SUBURBS } from "@/lib/crawler/suburbs-vic";
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
  const isWA = name.endsWith(" WA");
  const display_name = name.replace(/ Seattle$/, "").replace(/ WA$/, "").trim();
  const postcode = (POSTCODE_MAP as Record<string, string>)[name] ?? null;
  return { name, display_name, state: "WA", region: "us", postcode, enabled: true };
}

export async function POST(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();

  const locations: LocationSeed[] = [
    ...NSW_SUBURBS.map((s) => makeAuLocation(s, "NSW")),
    ...VIC_SUBURBS.map((s) => makeAuLocation(s, "VIC")),
    ...SEATTLE_NEIGHBORHOODS.map((s) => makeUsLocation(s)),
  ];

  // Deduplicate by name
  const unique = Array.from(new Map(locations.map((l) => [l.name, l])).values());

  // Upsert — skip existing, add new
  const { error } = await supabase
    .from("crawl_locations")
    .upsert(unique, { onConflict: "name", ignoreDuplicates: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, total: unique.length });
}
