// app/api/v1/property/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { normaliseAddress } from "@/lib/utils/address";
import { findPropertyByAddress, findPropertySummary, createProperty } from "@/lib/db/properties";
import { findDocumentsByProperty } from "@/lib/db/documents";
import { recordUsage } from "@/lib/api/quota";
import { apiError, ApiErrorCode } from "@/lib/api/errors";
import { createServiceClient } from "@/lib/supabase/server";

export const GET = withAuth(async (req: NextRequest, _ctx, { org, apiKey }) => {
  const address = req.nextUrl.searchParams.get("address");
  if (!address?.trim()) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "address query parameter is required" } },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const normalised = await normaliseAddress(address);
  const property = await findPropertyByAddress(normalised, supabase);

  // Property not found — create a record and trigger discovery
  if (!property) {
    const created = await createProperty(address, normalised, supabase);
    // TODO (crawler integration): trigger discovery job for created.id
    const jobId = `job_${created.id}`;
    await recordUsage(org.id, apiKey.id, "/v1/property/search", created.id, supabase);
    return NextResponse.json({ job_id: jobId, message: "Discovery triggered" }, { status: 202 });
  }

  // Property found but not ready yet
  if (property.status !== "ready") {
    const jobId = `job_${property.id}`;
    return NextResponse.json({ job_id: jobId, message: "Property is being processed" }, { status: 202 });
  }

  // Property ready — return full result
  const [summary, documents] = await Promise.all([
    findPropertySummary(property.id, supabase),
    findDocumentsByProperty(property.id, supabase),
  ]);

  await recordUsage(org.id, apiKey.id, "/v1/property/search", property.id, supabase);

  return NextResponse.json({
    property_id: property.id,
    address: property.address_normalised ?? property.address_raw,
    last_updated: summary?.generated_at ?? property.created_at,
    summary: summary?.summary ?? null,
    checklist: summary?.checklist ?? {},
    documents: documents.map((d) => ({
      id: d.id,
      type: d.type,
      label: d.label,
      pages: d.page_count,
    })),
    confidence: summary?.confidence ?? null,
  });
});
