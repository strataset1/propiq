// No pdf-parse import — safe for Vercel serverless (avoids DOMMatrix crash).
// Documents land in the queue and Claude processes them via vision.
import type { SupabaseClient } from "@supabase/supabase-js";
import { sha256 } from "@/lib/utils/hash";
import { normaliseAddress } from "@/lib/utils/address";
import { getRegion } from "./postcodes";

// Tribunal / government sites that publish strata decisions as HTML pages.
// These sites are scraped for text content rather than treated as PDFs.
export const AU_HTML_DOMAINS = [
  "acsl.net.au",       // WA: WASAT decisions (Australian Centre for Strata Law)
  "bccm.qld.gov.au",  // QLD: Body Corporate Commissioner adjudication orders
  "ncat.nsw.gov.au",  // NSW: NCAT strata decisions
  "vcat.vic.gov.au",  // VIC: VCAT owners corporation decisions
  "sacat.sa.gov.au",  // SA: SACAT strata/community title decisions
];

export function isHtmlDomain(url: string): boolean {
  const lower = url.toLowerCase();
  return AU_HTML_DOMAINS.some((d) => lower.includes(d));
}

function extractTextFromHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const STREET_TYPES = "Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Lane|Ln|Place|Pl|Court|Ct|Crescent|Cres|Boulevard|Blvd|Way|Close|Cl|Parade|Pde|Terrace|Tce|Circuit|Cct";
const ADDRESS_REGEX = new RegExp(
  `\\d+(?:[–\\-]\\d+)?\\s+[A-Z][A-Za-z]+(?:\\s+[A-Z][A-Za-z]+)*\\s+(?:${STREET_TYPES})\\b`,
  "i"
);

function extractAddressFromUrl(url: string, region: "au" | "us"): string | null {
  const auClean = region === "au"
    ? (s: string) => s.replace(/SP\s*\d+/gi, "").replace(/strata\s*plan\s*\d+/gi, "").replace(/by\s*laws?/gi, "")
    : (s: string) => s.replace(/cc&?rs?/gi, "").replace(/bylaws?/gi, "").replace(/declaration/gi, "").replace(/hoa/gi, "");

  const filename = auClean(
    decodeURIComponent(url.split("/").pop() ?? "")
      .replace(/\.pdf$/i, "")
      .replace(/[_-]/g, " ")
  ).replace(/\s+/g, " ").trim();

  const match = filename.match(ADDRESS_REGEX);
  return match ? match[0] : null;
}

export type IngestResult =
  | { ok: true; documentId: string; address: string }
  | { ok: false; reason: string };

export async function ingestPdfLight(
  url: string,
  suburb: string,
  supabase: SupabaseClient,
  regionOverride?: "au" | "us"
): Promise<IngestResult> {
  const region = regionOverride ?? getRegion(suburb);

  // Pre-check source_url to avoid re-downloading PDFs we've already ingested.
  // A URL pointing to a changed file will still be caught by file_hash below.
  const { data: existingByUrl } = await supabase
    .from("documents")
    .select("id")
    .eq("source_url", url)
    .maybeSingle();
  if (existingByUrl) return { ok: false, reason: "Duplicate" };

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
    if (buffer.length < 15000) return { ok: false, reason: "Too small (likely cover page or blank)" };
  } catch {
    return { ok: false, reason: "Download failed or timed out" };
  }

  // File-level dedup — catches same content at a different URL
  const fileHash = sha256(buffer.toString("base64"));
  const { data: existingByHash } = await supabase
    .from("documents")
    .select("id")
    .eq("file_hash", fileHash)
    .maybeSingle();
  if (existingByHash) return { ok: false, reason: "Duplicate" };

  const addressRaw = extractAddressFromUrl(url, region) ?? suburb;
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
      crawl_suburb: suburb,
      ingested_via: "crawler",
    })
    .select()
    .single();

  if (docError || !doc) return { ok: false, reason: "Failed to insert document" };

  return { ok: true, documentId: doc.id, address: addressRaw };
}

export async function ingestHtmlPage(
  url: string,
  suburb: string,
  supabase: SupabaseClient,
  regionOverride?: "au" | "us"
): Promise<IngestResult> {
  const region = regionOverride ?? getRegion(suburb);

  const { data: existingByUrl } = await supabase
    .from("documents")
    .select("id")
    .eq("source_url", url)
    .maybeSingle();
  if (existingByUrl) return { ok: false, reason: "Duplicate" };

  let extractedText: string;
  let pageTitle: string | null = null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; bylawsindex-crawler/1.0)" },
    });
    clearTimeout(timeout);
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) pageTitle = titleMatch[1].replace(/\s+/g, " ").trim();
    extractedText = extractTextFromHtml(html);
    if (extractedText.length < 200) return { ok: false, reason: "Too short" };
  } catch {
    return { ok: false, reason: "Download failed or timed out" };
  }

  const addressRaw = suburb;
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

  const docType = region === "us" ? "other" : "strata";
  const label = pageTitle ?? (region === "us" ? `HOA Decision — ${suburb}` : `Strata Tribunal Decision — ${suburb}`);

  const { data: doc, error: docError } = await supabase
    .from("documents")
    .insert({
      property_id: property.id,
      type: docType,
      label,
      source_url: url,
      storage_path: null,
      extracted_text: extractedText.slice(0, 50000),
      crawl_suburb: suburb,
      ingested_via: "crawler",
    })
    .select()
    .single();

  if (docError || !doc) return { ok: false, reason: "Failed to insert document" };

  return { ok: true, documentId: doc.id, address: addressRaw };
}
