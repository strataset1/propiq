// No pdf-parse import — safe for Vercel serverless (avoids DOMMatrix crash).
// Documents land in the queue and Claude processes them via vision.
import type { SupabaseClient } from "@supabase/supabase-js";
import { sha256 } from "@/lib/utils/hash";
import { normaliseAddress } from "@/lib/utils/address";

const STREET_TYPES = "Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Lane|Ln|Place|Pl|Court|Ct|Crescent|Cres|Boulevard|Blvd|Way|Close|Cl|Parade|Pde|Terrace|Tce|Circuit|Cct";
const ADDRESS_REGEX = new RegExp(
  `\\d+(?:[–\\-]\\d+)?\\s+[A-Z][A-Za-z]+(?:\\s+[A-Z][A-Za-z]+)*\\s+(?:${STREET_TYPES})\\b`,
  "i"
);

function extractAddressFromUrl(url: string): string | null {
  const filename = decodeURIComponent(url.split("/").pop() ?? "")
    .replace(/\.pdf$/i, "")
    .replace(/[_-]/g, " ")
    .replace(/SP\s*\d+/gi, "")
    .replace(/strata\s*plan\s*\d+/gi, "")
    .replace(/by\s*laws?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const match = filename.match(ADDRESS_REGEX);
  return match ? match[0] : null;
}

export type IngestResult =
  | { ok: true; documentId: string; address: string }
  | { ok: false; reason: string };

export async function ingestPdfLight(
  url: string,
  suburb: string,
  supabase: SupabaseClient
): Promise<IngestResult> {
  let buffer: Buffer;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("pdf") && !url.toLowerCase().endsWith(".pdf")) {
      return { ok: false, reason: "Not a PDF" };
    }
    buffer = Buffer.from(await res.arrayBuffer());
  } catch {
    return { ok: false, reason: "Download failed or timed out" };
  }

  const fileHash = sha256(buffer.toString("base64"));
  const { data: existing } = await supabase
    .from("documents")
    .select("id")
    .eq("file_hash", fileHash)
    .single();
  if (existing) return { ok: false, reason: "Duplicate" };

  const addressRaw = extractAddressFromUrl(url) ?? suburb;
  const addressNormalised = await normaliseAddress(addressRaw);

  const { data: property, error: propError } = await supabase
    .from("properties")
    .upsert(
      { address_raw: addressRaw, address_normalised: addressNormalised, status: "processing" },
      { onConflict: "address_normalised" }
    )
    .select()
    .single();

  if (propError || !property) return { ok: false, reason: "Failed to upsert property" };

  const filename = url.split("/").pop() ?? `${Date.now()}.pdf`;
  const storagePath = `${property.id}/${Date.now()}-${filename}`;
  const { error: uploadError } = await supabase.storage
    .from("property-documents")
    .upload(storagePath, buffer, { contentType: "application/pdf" });

  if (uploadError) return { ok: false, reason: "Storage upload failed" };

  const { data: doc, error: docError } = await supabase
    .from("documents")
    .insert({
      property_id: property.id,
      type: "strata",
      label: addressRaw !== suburb ? addressRaw : `Strata By-Laws — ${suburb}`,
      source_url: url,
      storage_path: storagePath,
      file_hash: fileHash,
      crawl_suburb: suburb,
      ingested_via: "crawler",
    })
    .select()
    .single();

  if (docError || !doc) return { ok: false, reason: "Failed to insert document" };

  return { ok: true, documentId: doc.id, address: addressRaw };
}
