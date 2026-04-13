// app/api/admin/trigger/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { normaliseAddress } from "@/lib/utils/address";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { address } = await req.json();
  if (!address || typeof address !== "string") {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const addressNormalised = await normaliseAddress(address);

  // Upsert property to trigger the discovery job
  const { data: property, error } = await supabase
    .from("properties")
    .upsert(
      { address_raw: address, address_normalised: addressNormalised, status: "processing" },
      { onConflict: "address_normalised" }
    )
    .select()
    .single();

  if (error || !property) {
    return NextResponse.json({ error: "Failed to create property" }, { status: 500 });
  }

  return NextResponse.json({ job_id: `job_${property.id}`, property_id: property.id });
}
