import type { SupabaseClient } from "@supabase/supabase-js";
import { sha256 } from "@/lib/utils/hash";
import { normaliseAddress } from "@/lib/utils/address";
import { extractText } from "@/lib/processing/extract-text";

const STREET_TYPES = "Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Lane|Ln|Place|Pl|Court|Ct|Crescent|Cres|Boulevard|Blvd|Way|Close|Cl|Parade|Pde|Terrace|Tce|Circuit|Cct";
const ADDRESS_REGEX = new RegExp(
  `\\d+(?:[–\\-]\\d+)?\\s+[A-Z][A-Za-z]+(?:\\s+[A-Z][A-Za-z]+)*\\s+(?:${STREET_TYPES})\\b`,
  "i"
);

function extractAddressFromUrl(url: string, region: "au" | "us"): string | null {
  const clean = region === "au"
    ? (s: string) => s.replace(/SP\s*\d+/gi, "").replace(/strata\s*plan\s*\d+/gi, "").replace(/by\s*laws?/gi, "")
    : (s: string) => s.replace(/cc&?rs?/gi, "").replace(/bylaws?/gi, "").replace(/declaration/gi, "").replace(/hoa/gi, "");

  const filename = clean(
    decodeURIComponent(url.split("/").pop() ?? "")
      .replace(/\.pdf$/i, "")
      .replace(/[_-]/g, " ")
  ).replace(/\s+/g, " ").trim();

  return filename.match(ADDRESS_REGEX)?.[0] ?? null;
}

function extractAddressFromText(text: string): string | null {
  return text.slice(0, 2000).match(ADDRESS_REGEX)?.[0] ?? null;
}

export type IngestResult =
  | { ok: true; documentId: string; address: string }
  | { ok: false; reason: string };

// Full ingest with text extraction — used when you want extracted_text stored immediately.
// Scanned PDFs (text.length < 200) are still queued as storage-only docs for Claude vision.
export async function ingestPdfFromUrl(
  url: string,
  suburb: string,
  supabase: SupabaseClient,
  regionOverride?: "au" | "us"
): Promise<IngestResult> {
  const region = regionOverride ?? "au";

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
    .maybeSingle();
  if (existing) return { ok: false, reason: "Duplicate" };

  // Extract text — scanned PDFs won't have it but we still ingest them for Claude vision
  let text = "";
  let pageCount = 1;
  try {
    const extracted = await extractText(buffer);
    text = extracted.text;
    pageCount = extracted.pageCount;
  } catch {
    // Continue without text — Claude vision will handle it
  }

  const addressRaw =
    extractAddressFromUrl(url, region) ??
    (text ? extractAddressFromText(text) : null) ??
    suburb;

  const addressNormalised = await normaliseAddress(addressRaw, region);

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

  const docType = region === "us" ? "hoa" : "strata";
  const defaultLabel = region === "us"
    ? `HOA/Condo Bylaws — ${suburb}`
    : `Strata By-Laws — ${suburb}`;

  const { data: doc, error: docError } = await supabase
    .from("documents")
    .insert({
      property_id: property.id,
      type: docType,
      label: addressRaw !== suburb ? addressRaw : defaultLabel,
      source_url: url,
      storage_path: storagePath,
      file_hash: fileHash,
      page_count: pageCount || null,
      extracted_text: text || null,
      crawl_suburb: suburb,
      ingested_via: "crawler",
    })
    .select()
    .single();

  if (docError || !doc) return { ok: false, reason: "Failed to insert document" };

  return { ok: true, documentId: doc.id, address: addressRaw };
}
