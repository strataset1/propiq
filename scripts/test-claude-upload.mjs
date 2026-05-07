// Tests Claude extraction on a manually uploaded document (no extracted_text yet)
// Downloads from storage, extracts text, sends to Claude — saves nothing

import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { PDFParse } from "pdf-parse";

const DOC_ID = "5c7c2ebf-61bc-4444-9012-cf42c73e7b7d";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

console.log("Fetching document record...");
const { data: doc, error } = await supabase
  .from("documents")
  .select("id, type, label, storage_path, properties(address_raw)")
  .eq("id", DOC_ID)
  .single();

if (error || !doc) { console.error("Not found:", error); process.exit(1); }
console.log(`Label: ${doc.label}`);
console.log(`Address: ${doc.properties?.address_raw}`);
console.log(`Storage path: ${doc.storage_path}`);

console.log("\nDownloading from storage...");
const { data: fileData, error: dlError } = await supabase.storage
  .from("property-documents")
  .download(doc.storage_path);

if (dlError || !fileData) { console.error("Download failed:", dlError); process.exit(1); }

const buffer = Buffer.from(await fileData.arrayBuffer());
console.log(`Downloaded: ${(buffer.length / 1024).toFixed(1)} KB`);

console.log("\nExtracting text...");
const parsed = await new PDFParse({ data: buffer }).getText();
const text = parsed.text.trim();
console.log(`Extracted: ${text.length} chars`);
console.log(`Preview: ${text.slice(0, 300)}\n`);

if (text.length < 100) {
  console.error("Too little text — this is likely a scanned PDF. OCR would be needed.");
  process.exit(1);
}

console.log("Sending to Claude...\n");

const message = await anthropic.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  system: `You are a property document analyst specialising in Australian strata by-laws and property reports.
Extract the following attributes from the document. For each attribute respond with:
- value: "yes", "no", or "maybe"
- detail: brief plain-English note (1-2 sentences, or null if not mentioned)
- legal_summary: the exact by-law clause or legal language verbatim, or null if not present`,
  messages: [{
    role: "user",
    content: `Document type: ${doc.type}

Extract these attributes and return ONLY a JSON code block:

\`\`\`json
{
  "short_term_rental": { "value": "yes|no|maybe", "detail": "...", "legal_summary": "..." },
  "pets_allowed": { "value": "yes|no|maybe", "detail": "...", "legal_summary": "..." },
  "interior_renovations": { "value": "yes|no|maybe", "detail": "...", "legal_summary": "..." },
  "exterior_renovations": { "value": "yes|no|maybe", "detail": "...", "legal_summary": "..." },
  "confidence": 0.0
}
\`\`\`

Document text:
${text.slice(0, 8000)}`
  }]
});

const responseText = message.content[0].type === "text" ? message.content[0].text : "";
console.log("Claude response:\n");
console.log(responseText);
