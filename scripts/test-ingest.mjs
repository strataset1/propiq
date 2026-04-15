// Tests a single PDF URL end-to-end to find where ingest is failing
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { PDFParse } from "pdf-parse";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const TEST_URL = "https://aro-au-prod-storage.s3-ap-southeast-2.amazonaws.com/greencliff/medias/Forms/bylaws/99-115_Flinders_St_Surry_Hills-_BY_LAWS-66f256ad71021.pdf";

console.log("1. Downloading PDF...");
const res = await fetch(TEST_URL);
console.log(`   Status: ${res.status} ${res.statusText}`);
if (!res.ok) process.exit(1);

const buffer = Buffer.from(await res.arrayBuffer());
console.log(`   Size: ${(buffer.length / 1024).toFixed(1)} KB`);

console.log("2. Extracting text...");
const parser = new PDFParse({ data: buffer });
const parsed = await parser.getText();
console.log(`   Pages: ${parsed.totalPages}`);
console.log(`   Text length: ${parsed.text.trim().length} chars`);
console.log(`   Preview: ${parsed.text.trim().slice(0, 200)}`);

console.log("3. Checking dedup...");
const fileHash = createHash("sha256").update(buffer.toString("base64")).digest("hex");
const { data: existing, error: dedupErr } = await supabase.from("documents").select("id").eq("file_hash", fileHash).single();
console.log(`   Existing: ${existing ? existing.id : "none"}`);
if (dedupErr && dedupErr.code !== "PGRST116") console.log(`   Dedup error: ${JSON.stringify(dedupErr)}`);

if (existing) { console.log("   Already in DB — done"); process.exit(0); }

console.log("4. Upserting property...");
const addressRaw = "99-115 Flinders Street Surry Hills";
const { data: property, error: propErr } = await supabase
  .from("properties")
  .upsert({ address_raw: addressRaw, address_normalised: addressRaw.toLowerCase(), status: "processing" }, { onConflict: "address_normalised" })
  .select().single();
console.log(`   Property: ${property?.id ?? "FAILED"}`);
if (propErr) console.log(`   Error: ${JSON.stringify(propErr)}`);
if (!property) process.exit(1);

console.log("5. Uploading to storage...");
const storagePath = `${property.id}/${Date.now()}-test.pdf`;
const { error: uploadErr } = await supabase.storage.from("property-documents").upload(storagePath, buffer, { contentType: "application/pdf" });
console.log(`   Upload: ${uploadErr ? "FAILED — " + JSON.stringify(uploadErr) : "OK"}`);
if (uploadErr) process.exit(1);

console.log("6. Inserting document record...");
const { data: doc, error: docErr } = await supabase.from("documents").insert({
  property_id: property.id,
  type: "strata",
  label: "Strata By-Laws — Surry Hills",
  source_url: TEST_URL,
  storage_path: storagePath,
  file_hash: fileHash,
  page_count: parsed.numpages,
  extracted_text: parsed.text.trim(),
  ingested_via: "crawler",
}).select().single();
console.log(`   Document: ${doc?.id ?? "FAILED"}`);
if (docErr) console.log(`   Error: ${JSON.stringify(docErr)}`);

console.log("\nDone.");
