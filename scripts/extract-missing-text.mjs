// Finds all documents with no extracted_text, downloads from storage, extracts and saves.
// Run after any manual/bulk upload session.
// Usage: node scripts/extract-missing-text.mjs

import { createClient } from "@supabase/supabase-js";
import { PDFParse } from "pdf-parse";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log("Finding documents with no extracted text...");

const { data: docs, error } = await supabase
  .from("documents")
  .select("id, label, storage_path, properties(address_raw)")
  .is("extracted_text", null)
  .not("storage_path", "is", null)
  .order("created_at", { ascending: false });

if (error) { console.error("Failed to fetch documents:", error); process.exit(1); }
if (!docs || docs.length === 0) { console.log("No documents missing text — all good."); process.exit(0); }

console.log(`Found ${docs.length} document${docs.length === 1 ? "" : "s"} to process.\n`);

let success = 0;
let failed = 0;

for (const doc of docs) {
  process.stdout.write(`${doc.label} (${doc.properties?.address_raw})... `);

  // Download from storage
  const { data: fileData, error: dlError } = await supabase.storage
    .from("property-documents")
    .download(doc.storage_path);

  if (dlError || !fileData) {
    console.log("FAILED (download error)");
    failed++;
    continue;
  }

  // Extract text
  try {
    const buffer = Buffer.from(await fileData.arrayBuffer());
    const parsed = await new PDFParse({ data: buffer }).getText();
    const text = parsed.text.trim();
    const pageCount = parsed.totalPages;

    if (text.length < 100) {
      console.log(`SKIPPED (only ${text.length} chars — likely scanned)`);
      failed++;
      continue;
    }

    // Save back to database
    await supabase
      .from("documents")
      .update({ extracted_text: text, page_count: pageCount })
      .eq("id", doc.id);

    console.log(`OK (${text.length} chars, ${pageCount} pages)`);
    success++;
  } catch (e) {
    console.log(`FAILED (${e.message})`);
    failed++;
  }
}

console.log(`\nDone. ${success} extracted, ${failed} failed/skipped.`);
console.log("Documents are now ready to process in the admin queue.");
