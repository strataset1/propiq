import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { getUsageSummary } from "@/lib/db/usage";
import { createServiceClient } from "@/lib/supabase/server";

export const GET = withAuth(async (_req: NextRequest, _ctx, { org }) => {
  const supabase = createServiceClient();
  const usage = await getUsageSummary(org.id, org.monthly_quota, org.plan, supabase);
  return NextResponse.json(usage);
});
