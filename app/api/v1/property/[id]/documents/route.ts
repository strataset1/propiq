import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { findPropertyById } from "@/lib/db/properties";
import { findDocumentsByProperty } from "@/lib/db/documents";
import { apiError, ApiErrorCode } from "@/lib/api/errors";
import { createServiceClient } from "@/lib/supabase/server";

const SIGNED_URL_EXPIRY_SECONDS = 60 * 15; // 15 minutes

export const GET = withAuth(async (_req: NextRequest, ctx: any, _auth) => {
  const id = (await ctx.params)?.id as string;
  const supabase = createServiceClient();

  const property = await findPropertyById(id, supabase);
  if (!property) return apiError(ApiErrorCode.NOT_FOUND, "Property not found");

  const documents = await findDocumentsByProperty(id, supabase);

  const docsWithUrls = await Promise.all(
    documents.map(async (doc) => {
      let downloadUrl: string | null = null;

      if (doc.storage_path) {
        const { data } = await supabase.storage
          .from("property-documents")
          .createSignedUrl(doc.storage_path, SIGNED_URL_EXPIRY_SECONDS);
        downloadUrl = data?.signedUrl ?? null;
      }

      return {
        id: doc.id,
        type: doc.type,
        label: doc.label,
        pages: doc.page_count,
        download_url: downloadUrl,
        download_url_expires_in: downloadUrl ? "15 minutes" : null,
      };
    })
  );

  return NextResponse.json({ documents: docsWithUrls });
});
