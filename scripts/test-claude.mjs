// Tests Claude extraction on a single document — prints result, saves nothing
// Usage: node scripts/test-claude.mjs <document-id>

import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const DOC_ID = process.argv[2];
if (!DOC_ID) {
  console.error("Usage: node scripts/test-claude.mjs <document-id>");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

console.log(`Fetching document ${DOC_ID}...`);
const { data: doc, error } = await supabase
  .from("documents")
  .select("id, type, extracted_text, label, properties(address_raw)")
  .eq("id", DOC_ID)
  .single();

if (error || !doc) {
  console.error("Document not found:", error);
  process.exit(1);
}

console.log(`Label: ${doc.label}`);
console.log(`Address: ${doc.properties?.address_raw}`);
console.log(`Text length: ${doc.extracted_text?.length ?? 0} chars`);

if (!doc.extracted_text || doc.extracted_text.length < 100) {
  console.error("Document has no extracted text — likely a scanned PDF");
  process.exit(1);
}

console.log("\nSending to Claude...\n");

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

Extract these attributes and return ONLY a JSON code block with no other text:

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
${doc.extracted_text.slice(0, 8000)}`
  }]
});

const text = message.content[0].type === "text" ? message.content[0].text : "";
console.log("Claude response:\n");
console.log(text);
