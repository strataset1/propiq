import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { findDocumentById } from "@/lib/db/documents";
import { apiError, ApiErrorCode } from "@/lib/api/errors";
import { createServiceClient } from "@/lib/supabase/server";

export const GET = withAuth(async (_req: NextRequest, ctx: any, _auth) => {
  const id = (await ctx.params)?.id as string;
  const supabase = createServiceClient();

  const doc = await findDocumentById(id, supabase);
  if (!doc) return apiError(ApiErrorCode.NOT_FOUND, "Document not found");
  if (!doc.storage_path) return apiError(ApiErrorCode.NOT_FOUND, "Document file not available");

  const { data, error } = await supabase.storage
    .from("property-documents")
    .createSignedUrl(doc.storage_path, 60 * 15);

  if (error || !data) {
    return apiError(ApiErrorCode.INTERNAL, "Failed to generate download URL");
  }

  return NextResponse.json({
    url: data.signedUrl,
    expires_in: "15 minutes",
  });
});
