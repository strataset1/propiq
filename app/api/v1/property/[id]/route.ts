import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { findPropertyById, findPropertySummary } from "@/lib/db/properties";
import { findDocumentsByProperty } from "@/lib/db/documents";
import { apiError, ApiErrorCode } from "@/lib/api/errors";
import { createServiceClient } from "@/lib/supabase/server";

export const GET = withAuth(async (_req: NextRequest, ctx: any, _auth) => {
  const id = (await ctx.params)?.id as string;
  const supabase = createServiceClient();

  const property = await findPropertyById(id, supabase);
  if (!property) return apiError(ApiErrorCode.NOT_FOUND, "Property not found");

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
    documents: documents.map((d) => ({ id: d.id, type: d.type, label: d.label, pages: d.page_count })),
  });
});
