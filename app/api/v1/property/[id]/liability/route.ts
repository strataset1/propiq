import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { apiError, ApiErrorCode } from "@/lib/api/errors";
import { createServiceClient } from "@/lib/supabase/server";
import { getLiabilityByProperty } from "@/lib/db/liability-extractions";

export const GET = withAuth(async (_req: NextRequest, ctx: any, _auth) => {
  const id = (await ctx.params)?.id as string;
  const supabase = createServiceClient();

  const { data: property } = await supabase
    .from("properties")
    .select("id, address_raw, status")
    .eq("id", id)
    .single();

  if (!property) return apiError(ApiErrorCode.NOT_FOUND, "Property not found");

  const liability = await getLiabilityByProperty(id, supabase);

  return NextResponse.json({
    property_id: id,
    address: property.address_raw,
    liability,
  });
});
