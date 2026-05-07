export const dynamic = "force-dynamic";

import { BulkUploadForm } from "@/components/admin/bulk-upload-form";

// Step 1: check duplicate + create property + return signed upload URL
async function prepareUpload(input: {
  filename: string;
  type: string;
  label: string;
  address: string;
  pageCount: number | null;
  fileHash: string;
}): Promise<
  | { ok: true; signedUrl: string; token: string; storagePath: string; propertyId: string }
  | { ok: true; duplicate: true; documentId: string }
  | { ok: false; error: string }
> {
  "use server";

  const { createServiceClient } = await import("@/lib/supabase/server");
  const { normaliseAddress } = await import("@/lib/utils/address");

  const supabase = createServiceClient();

  // Check duplicate
  const { data: existing } = await supabase
    .from("documents")
    .select("id")
    .eq("file_hash", input.fileHash)
    .maybeSingle();

  if (existing) return { ok: true, duplicate: true, documentId: existing.id };

  // Create/upsert property
  let property: { id: string } | null = null;

  if (input.address?.trim()) {
    const addressNormalised = await normaliseAddress(input.address.trim());
    const { data, error } = await supabase
      .from("properties")
      .upsert(
        { address_raw: input.address.trim(), address_normalised: addressNormalised, status: "processing" },
        { onConflict: "address_normalised" }
      )
      .select()
      .single();
    if (error || !data) return { ok: false, error: "Failed to create property" };
    property = data;
  } else {
    const { data, error } = await supabase
      .from("properties")
      .insert({ address_raw: input.label, address_normalised: null, status: "processing" })
      .select()
      .single();
    if (error || !data) return { ok: false, error: "Failed to create property" };
    property = data;
  }

  // Generate signed upload URL (browser will upload directly to Supabase)
  const storagePath = `${property.id}/${Date.now()}-${input.filename}`;
  const { data: signed, error: signedError } = await supabase.storage
    .from("property-documents")
    .createSignedUploadUrl(storagePath);

  if (signedError || !signed) return { ok: false, error: "Failed to create upload URL" };

  return {
    ok: true,
    signedUrl: signed.signedUrl,
    token: signed.token,
    storagePath,
    propertyId: property.id,
  };
}

// Step 2: save document record after browser has uploaded the file
async function finalizeUpload(input: {
  propertyId: string;
  storagePath: string;
  fileHash: string;
  type: string;
  label: string;
  extractedText: string | null;
  pageCount: number | null;
}): Promise<{ ok: true; documentId: string } | { ok: false; error: string }> {
  "use server";

  const { createServiceClient } = await import("@/lib/supabase/server");
  const supabase = createServiceClient();

  const { data: doc, error } = await supabase
    .from("documents")
    .insert({
      property_id: input.propertyId,
      type: input.type as "strata" | "building_inspection" | "contract" | "lease" | "council" | "other",
      label: input.label,
      storage_path: input.storagePath,
      file_hash: input.fileHash,
      extracted_text: input.extractedText ?? null,
      page_count: input.pageCount ?? null,
      ingested_via: "manual",
    })
    .select()
    .single();

  if (error || !doc) return { ok: false, error: error?.message ?? "Failed to save document" };

  return { ok: true, documentId: doc.id };
}

export default function BulkUploadPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Bulk Upload</h1>
        <p className="text-slate-400 text-sm mt-1">
          Select multiple PDFs, fill in the address for each, then upload all at once. Duplicates are detected automatically.
        </p>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <BulkUploadForm prepareUpload={prepareUpload} finalizeUpload={finalizeUpload} />
      </div>
    </div>
  );
}
