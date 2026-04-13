import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { findPropertyById, findPropertySummary } from "@/lib/db/properties";
import { findDocumentsByProperty } from "@/lib/db/documents";
import { apiError, ApiErrorCode } from "@/lib/api/errors";
import { createServiceClient } from "@/lib/supabase/server";

export const GET = withAuth(async (_req: NextRequest, ctx: any, _auth) => {
  const id = ctx.params?.id as string;
  const supabase = createServiceClient();

  const property = await findPropertyById(id, supabase);
  if (!property) return apiError(ApiErrorCode.NOT_FOUND, "Property not found");

  const [summary, documents] = await Promise.all([
    findPropertySummary(property.id, supabase),
    findDocumentsByProperty(property.id, supabase),
  ]);

  return NextResponse.json({
    property_id: property.id,
    address: property.address_normalised ?? property.address_raw,
    status: property.status,
    last_updated: summary?.generated_at ?? property.created_at,
    summary: summary?.summary ?? null,
    checklist: summary?.checklist ?? {},
    documents: documents.map((d) => ({ id: d.id, type: d.type, label: d.label, pages: d.page_count })),
    confidence: summary?.confidence ?? null,
  });
});
