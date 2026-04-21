import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { findPropertyById } from "@/lib/db/properties";
import { apiError, ApiErrorCode } from "@/lib/api/errors";
import { createServiceClient } from "@/lib/supabase/server";

// job_id format: "job_{property_id}"
function propertyIdFromJobId(jobId: string): string {
  return jobId.replace(/^job_/, "");
}

export const GET = withAuth(async (_req: NextRequest, ctx: any, _auth) => {
  const jobId = (await ctx.params)?.id as string;
  const propertyId = propertyIdFromJobId(jobId);
  const supabase = createServiceClient();

  const property = await findPropertyById(propertyId, supabase);
  if (!property) return apiError(ApiErrorCode.NOT_FOUND, "Job not found");

  if (property.status === "ready") {
    return NextResponse.json({ status: "ready", property_id: property.id });
  }

  if (property.status === "failed") {
    return NextResponse.json({ status: "failed", reason: "Document discovery found no usable documents" });
  }

  return NextResponse.json({ status: "processing" });
});
