// app/api/v1/property/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { normaliseAddress } from "@/lib/utils/address";
import { findPropertyByAddress, findPropertySummary } from "@/lib/db/properties";
import { findDocumentsByProperty } from "@/lib/db/documents";
import { recordUsage } from "@/lib/api/quota";
import { apiError, ApiErrorCode } from "@/lib/api/errors";
import { createServiceClient } from "@/lib/supabase/server";
import { STATE_LAWS, detectState } from "@/lib/state-laws";

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

  // Property not found
  if (!property) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "No documents found for this address. Documents are indexed by suburb — try searching a nearby address, or contact us to request coverage for this area." } },
      { status: 404 }
    );
  }

  // Property found but documents not yet processed
  if (property.status !== "ready") {
    return NextResponse.json(
      { error: { code: "PROCESSING", message: "Documents for this address have been found but are still being processed. Please try again in a few minutes." } },
      { status: 202 }
    );
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
  const state = detectState(property.address_normalised ?? property.address_raw);
  const laws = state ? (STATE_LAWS[state] ?? {}) : {};

  function withStateLaw(value: string | null, detail: string | null, legal: string | null, lawKey: keyof typeof laws) {
    const law = laws[lawKey];
    return {
      value,
      detail,
      legal,
      ...(law ? { state_law: { state: state!.toUpperCase(), overrides_bylaw: law.overridesHardNo, takeaway: law.takeaway, detail: law.detail } } : {}),
    };
  }

  return NextResponse.json({
    property_id: property.id,
    address: property.address_raw,
    last_updated: b?.processed_at ?? property.created_at,
    document_date: b?.document_date ?? null,
    confidence: b?.confidence ?? null,
    attributes: b ? {
      short_term_rental: withStateLaw(b.short_term_rental_value, b.short_term_rental_detail, b.short_term_rental_legal, "short_term_rental"),
      pets_allowed: withStateLaw(b.pets_allowed_value, b.pets_allowed_detail, b.pets_allowed_legal, "pets_allowed"),
      interior_renovations: withStateLaw(b.interior_renovations_value, b.interior_renovations_detail, b.interior_renovations_legal, "interior_renovations"),
      exterior_renovations: withStateLaw(b.exterior_renovations_value, b.exterior_renovations_detail, b.exterior_renovations_legal, "exterior_renovations"),
    } : null,
    documents: documents.map((d) => ({
      id: d.id,
      type: d.type,
      label: d.label,
      pages: d.page_count,
    })),
  });
});
