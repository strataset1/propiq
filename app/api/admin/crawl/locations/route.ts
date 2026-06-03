import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { addCrawlLocation, toggleCrawlLocation } from "@/lib/crawler/suburbs-db";

function isAuthed(req: NextRequest) {
  const cookie = req.cookies.get("admin_token")?.value;
  return cookie === process.env.ADMIN_SECRET;
}

export async function POST(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    display_name?: string;
    state?: string;
    region?: "au" | "us";
    postcode?: string;
  };

  const { display_name, state, region, postcode } = body;
  if (!display_name || !state || !region) {
    return NextResponse.json({ error: "display_name, state, and region are required" }, { status: 400 });
  }

  const name = `${display_name} ${state}`;
  const supabase = createServiceClient();
  const result = await addCrawlLocation(supabase, { name, display_name, state, region, postcode: postcode ?? null });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, name });
}

export async function PATCH(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, enabled } = await req.json() as { id?: string; enabled?: boolean };
  if (!id || enabled === undefined) {
    return NextResponse.json({ error: "id and enabled required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  await toggleCrawlLocation(supabase, id, enabled);
  return NextResponse.json({ ok: true });
}
