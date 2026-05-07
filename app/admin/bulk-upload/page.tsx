import { BulkUploadForm } from "@/components/admin/bulk-upload-form";

async function uploadDocument(formData: FormData): Promise<
  | { ok: true; documentId: string }
  | { ok: true; duplicate: true; documentId: string }
  | { ok: false; error: string }
> {
  "use server";

  const { createServiceClient } = await import("@/lib/supabase/server");
  const { sha256 } = await import("@/lib/utils/hash");
  const { normaliseAddress } = await import("@/lib/utils/address");

  const file = formData.get("file") as File | null;
  const addressRaw = (formData.get("address") as string | null)?.trim() || null;
  const type = formData.get("type") as string | null;
  const label = formData.get("label") as string | null;
  const extractedText = formData.get("extracted_text") as string | null;
  const pageCount = formData.get("page_count") ? parseInt(formData.get("page_count") as string) : null;

  if (!file || !type || !label) {
    return { ok: false, error: "Missing required fields" };
  }

  const supabase = createServiceClient();

  let property: { id: string } | null = null;

  if (addressRaw) {
    const addressNormalised = await normaliseAddress(addressRaw);
    const { data, error } = await supabase
      .from("properties")
      .upsert(
        { address_raw: addressRaw, address_normalised: addressNormalised, status: "processing" },
        { onConflict: "address_normalised" }
      )
      .select()
      .single();
    if (error || !data) return { ok: false, error: "Failed to create property" };
    property = data;
  } else {
    const { data, error } = await supabase
      .from("properties")
      .insert({ address_raw: label, address_normalised: null, status: "processing" })
      .select()
      .single();
    if (error || !data) return { ok: false, error: "Failed to create property" };
    property = data;
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const fileHash = sha256(buffer.toString("base64"));

  const { data: existing } = await supabase
    .from("documents")
    .select("id")
    .eq("file_hash", fileHash)
    .single();

  if (existing) return { ok: true, duplicate: true, documentId: existing.id };

  const storagePath = `${property.id}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("property-documents")
    .upload(storagePath, buffer, { contentType: "application/pdf" });

  if (uploadError) return { ok: false, error: "Storage upload failed" };

  const { data: doc, error: docError } = await supabase
    .from("documents")
    .insert({
      property_id: property.id,
      type: type as "strata" | "building_inspection" | "contract" | "lease" | "council" | "other",
      label,
      storage_path: storagePath,
      file_hash: fileHash,
      extracted_text: extractedText ?? null,
      page_count: pageCount ?? null,
      ingested_via: "manual",
    })
    .select()
    .single();

  if (docError || !doc) return { ok: false, error: "Failed to save document record" };

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
        <BulkUploadForm uploadAction={uploadDocument} />
      </div>
    </div>
  );
}
