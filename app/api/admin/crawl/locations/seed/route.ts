import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { NSW_SUBURBS } from "@/lib/crawler/suburbs-nsw";
import { VIC_SUBURBS } from "@/lib/crawler/suburbs-vic";
import { QLD_SUBURBS } from "@/lib/crawler/suburbs-qld";
import { WA_SUBURBS } from "@/lib/crawler/suburbs-wa";
import { SA_SUBURBS } from "@/lib/crawler/suburbs-sa";
import { TAS_SUBURBS } from "@/lib/crawler/suburbs-tas";
import { ACT_SUBURBS } from "@/lib/crawler/suburbs-act";
import { NT_SUBURBS } from "@/lib/crawler/suburbs-nt";
import { SEATTLE_NEIGHBORHOODS } from "@/lib/crawler/suburbs-seattle";
import { CA_SUBURBS } from "@/lib/crawler/suburbs-us-ca";
import { FL_SUBURBS } from "@/lib/crawler/suburbs-us-fl";
import { NY_SUBURBS } from "@/lib/crawler/suburbs-us-ny";
import { TX_SUBURBS } from "@/lib/crawler/suburbs-us-tx";
import {
  AZ_SUBURBS, CO_SUBURBS, IL_SUBURBS, GA_SUBURBS,
  NC_SUBURBS, VA_SUBURBS, OR_SUBURBS, NV_SUBURBS,
  MA_SUBURBS, MD_SUBURBS, MI_SUBURBS, OH_SUBURBS,
  MN_SUBURBS, PA_SUBURBS, TN_SUBURBS,
} from "@/lib/crawler/suburbs-us-other";
import { POSTCODE_MAP } from "@/lib/crawler/postcodes";

function isAuthed(req: NextRequest) {
  const cookie = req.cookies.get("admin_token")?.value;
  return cookie === process.env.ADMIN_SECRET;
}

type LocationSeed = {
  name: string; display_name: string; state: string;
  region: "au" | "us"; postcode: string | null; enabled: boolean;
};

function makeAuLocation(name: string, state: string): LocationSeed {
  const display_name = name.replace(/\s+(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)$/i, "").trim();
  const postcode = (POSTCODE_MAP as Record<string, string>)[name] ?? null;
  return { name, display_name, state, region: "au", postcode, enabled: true };
}

function makeUsLocation(name: string, state: string): LocationSeed {
  const display_name = name
    .replace(/ Seattle$/, "").replace(/ WA$/, "").replace(/ CA$/, "")
    .replace(/ FL$/, "").replace(/ NY$/, "").replace(/ TX$/, "")
    .replace(/ AZ$/, "").replace(/ CO$/, "").replace(/ IL$/, "")
    .replace(/ GA$/, "").replace(/ NC$/, "").replace(/ VA$/, "")
    .replace(/ OR$/, "").replace(/ NV$/, "").replace(/ MA$/, "")
    .replace(/ MD$/, "").replace(/ MI$/, "").replace(/ OH$/, "")
    .replace(/ MN$/, "").replace(/ PA$/, "").replace(/ TN$/, "")
    .trim();
  const postcode = (POSTCODE_MAP as Record<string, string>)[name] ?? null;
  return { name, display_name, state, region: "us", postcode, enabled: true };
}

export const AU_STATE_LISTS: Record<string, string[]> = {
  NSW: NSW_SUBURBS,
  VIC: VIC_SUBURBS,
  QLD: QLD_SUBURBS,
  WA:  WA_SUBURBS,
  SA:  SA_SUBURBS,
  TAS: TAS_SUBURBS,
  ACT: ACT_SUBURBS,
  NT:  NT_SUBURBS,
};

export const US_STATE_LISTS: Record<string, { suburbs: string[]; stateCode: string }> = {
  "WA (Seattle)": { suburbs: SEATTLE_NEIGHBORHOODS, stateCode: "WA" },
  CA: { suburbs: CA_SUBURBS,  stateCode: "CA" },
  FL: { suburbs: FL_SUBURBS,  stateCode: "FL" },
  NY: { suburbs: NY_SUBURBS,  stateCode: "NY" },
  TX: { suburbs: TX_SUBURBS,  stateCode: "TX" },
  AZ: { suburbs: AZ_SUBURBS,  stateCode: "AZ" },
  CO: { suburbs: CO_SUBURBS,  stateCode: "CO" },
  IL: { suburbs: IL_SUBURBS,  stateCode: "IL" },
  GA: { suburbs: GA_SUBURBS,  stateCode: "GA" },
  NC: { suburbs: NC_SUBURBS,  stateCode: "NC" },
  VA: { suburbs: VA_SUBURBS,  stateCode: "VA" },
  OR: { suburbs: OR_SUBURBS,  stateCode: "OR" },
  NV: { suburbs: NV_SUBURBS,  stateCode: "NV" },
  MA: { suburbs: MA_SUBURBS,  stateCode: "MA" },
  MD: { suburbs: MD_SUBURBS,  stateCode: "MD" },
  MI: { suburbs: MI_SUBURBS,  stateCode: "MI" },
  OH: { suburbs: OH_SUBURBS,  stateCode: "OH" },
  MN: { suburbs: MN_SUBURBS,  stateCode: "MN" },
  PA: { suburbs: PA_SUBURBS,  stateCode: "PA" },
  TN: { suburbs: TN_SUBURBS,  stateCode: "TN" },
};

export async function POST(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { state?: string };
  const filterState = body.state;

  const locations: LocationSeed[] = [];

  for (const [state, suburbs] of Object.entries(AU_STATE_LISTS)) {
    if (filterState && filterState !== state) continue;
    locations.push(...suburbs.map((s) => makeAuLocation(s, state)));
  }

  for (const [key, { suburbs, stateCode }] of Object.entries(US_STATE_LISTS)) {
    if (filterState && filterState !== key) continue;
    locations.push(...suburbs.map((s) => makeUsLocation(s, stateCode)));
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
