import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sha256 } from "@/lib/utils/hash";
import { normaliseAddress } from "@/lib/utils/address";

export async function POST(req: NextRequest) {
  // Simple admin auth — check secret header
  const secret = req.headers.get("x-admin-secret");
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const addressRaw = formData.get("address") as string | null;
  const docType = formData.get("type") as string | null;
  const label = formData.get("label") as string | null;
  const extractedText = formData.get("extracted_text") as string | null;
  const pageCount = formData.get("page_count") ? parseInt(formData.get("page_count") as string) : null;

  if (!file || !addressRaw || !docType || !label) {
    return NextResponse.json({ error: "Missing required fields: file, address, type, label" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const addressNormalised = await normaliseAddress(addressRaw);

  // Upsert property
  const { data: property, error: propError } = await supabase
    .from("properties")
    .upsert(
      { address_raw: addressRaw, address_normalised: addressNormalised, status: "processing" },
      { onConflict: "address_normalised" }
    )
    .select()
    .single();

  if (propError || !property) {
    return NextResponse.json({ error: "Failed to upsert property" }, { status: 500 });
  }

  // Read file and hash for deduplication
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const fileHash = sha256(buffer.toString("base64"));

  // Check for duplicate
  const { data: existing } = await supabase
    .from("documents")
    .select("id")
    .eq("file_hash", fileHash)
    .single();

  if (existing) {
    return NextResponse.json({ message: "Document already exists", document_id: existing.id });
  }

  // Upload to Storage
  const storagePath = `${property.id}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("property-documents")
    .upload(storagePath, buffer, { contentType: "application/pdf" });

  if (uploadError) {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  // Insert document record
  const { data: doc, error: docError } = await supabase
    .from("documents")
    .insert({
      property_id: property.id,
      type: docType as "strata" | "building_inspection" | "contract" | "lease" | "council" | "other",
      label,
      storage_path: storagePath,
      file_hash: fileHash,
      extracted_text: extractedText ?? null,
      page_count: pageCount ?? null,
      ingested_via: "manual",
    })
    .select()
    .single();

  if (docError || !doc) {
    return NextResponse.json({ error: "Failed to insert document record" }, { status: 500 });
  }

  return NextResponse.json({ document_id: doc.id, property_id: property.id });
}
