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
  const [bylaws, documents] = await Promise.all([
    supabase
      .from("strata_bylaws")
      .select("*")
      .eq("property_id", property.id)
      .order("processed_at", { ascending: false })
      .limit(1)
      .single(),
    findDocumentsByProperty(property.id, supabase),
  ]);

  await recordUsage(org.id, apiKey.id, "/v1/property/search", property.id, supabase);

  const b = bylaws.data;

  return NextResponse.json({
    property_id: property.id,
    address: property.address_raw,
    last_updated: b?.processed_at ?? property.created_at,
    document_date: b?.document_date ?? null,
    confidence: b?.confidence ?? null,
    attributes: b ? {
      short_term_rental: { value: b.short_term_rental_value, detail: b.short_term_rental_detail, legal: b.short_term_rental_legal },
      pets_allowed: { value: b.pets_allowed_value, detail: b.pets_allowed_detail, legal: b.pets_allowed_legal },
      interior_renovations: { value: b.interior_renovations_value, detail: b.interior_renovations_detail, legal: b.interior_renovations_legal },
      exterior_renovations: { value: b.exterior_renovations_value, detail: b.exterior_renovations_detail, legal: b.exterior_renovations_legal },
    } : null,
    documents: documents.map((d) => ({
      id: d.id,
      type: d.type,
      label: d.label,
      pages: d.page_count,
    })),
  });
});
