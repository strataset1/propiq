import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normaliseAddress } from "@/lib/utils/address";
import { extractLiability } from "@/lib/processing/extract-liability";
import { saveLiabilityExtractions } from "@/lib/db/liability-extractions";

const MODEL = "claude-sonnet-4-6";

type DocInput = {
  id: string;
  type: string;
  extracted_text: string | null;
};

type AttributeResult = {
  value: "yes" | "no" | "maybe";
  detail: string | null;
  legal_summary: string | null;
};

type ParsedExtraction = {
  address: string | null;
  short_term_rental: AttributeResult;
  pets_allowed: AttributeResult;
  interior_renovations: AttributeResult;
  exterior_renovations: AttributeResult;
  confidence: number;
};

const SYSTEM_PROMPT = `You are a property document analyst specialising in Australian strata by-laws and property reports.
Extract the following attributes from the document. For each attribute respond with:
- value: "yes", "no", or "maybe"
- detail: brief plain-English note (1-2 sentences, or null if not mentioned)
- legal_summary: the exact by-law clause or legal language verbatim, or null if not present

Also extract the full property address if present in the document (e.g. from the title page, header, or strata plan reference). Return it as a complete street address including suburb and state if available. Return null if not found.`;

function buildPrompt(doc: DocInput): string {
  return `Document type: ${doc.type}

Extract these attributes and return ONLY a JSON code block with no other text:

\`\`\`json
{
  "address": "full street address including suburb and state, or null",
  "short_term_rental": { "value": "yes|no|maybe", "detail": "...", "legal_summary": "..." },
  "pets_allowed": { "value": "yes|no|maybe", "detail": "...", "legal_summary": "..." },
  "interior_renovations": { "value": "yes|no|maybe", "detail": "...", "legal_summary": "..." },
  "exterior_renovations": { "value": "yes|no|maybe", "detail": "...", "legal_summary": "..." },
  "confidence": 0.0
}
\`\`\`

Document text:
${doc.extracted_text ?? "(no text extracted — document may be scanned)"}`;
}

export function buildBatchRequests(docs: DocInput[]) {
  return docs.map((doc) => ({
    custom_id: doc.id,
    params: {
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user" as const, content: buildPrompt(doc) }],
    },
  }));
}

export function parseBatchResult(responseText: string): ParsedExtraction | null {
  try {
    const match = responseText.match(/```json\s*([\s\S]*?)```/);
    if (!match) {
      const bareMatch = responseText.match(/\{[\s\S]*\}/);
      if (!bareMatch) return null;
      return JSON.parse(bareMatch[0]) as ParsedExtraction;
    }
    return JSON.parse(match[1]) as ParsedExtraction;
  } catch {
    return null;
  }
}

export async function createBatch(docs: DocInput[]): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const requests = buildBatchRequests(docs);
  const batch = await client.messages.batches.create({ requests });
  return batch.id;
}

export async function pollAndWriteResults(
  batchId: string,
  supabase: SupabaseClient
): Promise<{ processed: number; failed: number }> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let processed = 0;
  let failed = 0;

  for await (const result of await client.messages.batches.results(batchId)) {
    if (result.result.type !== "succeeded") {
      failed++;
      continue;
    }

    const content = result.result.message.content[0];
    const text = content.type === "text" ? content.text : null;
    if (!text) { failed++; continue; }

    const extraction = parseBatchResult(text);
    if (!extraction) { failed++; continue; }

    const docId = result.custom_id;

    const { data: doc } = await supabase
      .from("documents")
      .select("property_id")
      .eq("id", docId)
      .single();

    if (!doc) { failed++; continue; }

    // Update property address if Claude extracted one
    if (extraction.address) {
      const { data: property } = await supabase
        .from("properties")
        .select("address_normalised")
        .eq("id", doc.property_id)
        .single();

      // Only update if address is missing or was set from filename (not a real address)
      if (!property?.address_normalised) {
        const normalised = await normaliseAddress(extraction.address);
        await supabase
          .from("properties")
          .update({ address_raw: extraction.address, address_normalised: normalised, status: "ready" })
          .eq("id", doc.property_id);
      }
    }

    await supabase.from("strata_bylaws").upsert({
      document_id: docId,
      property_id: doc.property_id,
      short_term_rental_value: extraction.short_term_rental.value,
      short_term_rental_detail: extraction.short_term_rental.detail,
      short_term_rental_legal: extraction.short_term_rental.legal_summary,
      pets_allowed_value: extraction.pets_allowed.value,
      pets_allowed_detail: extraction.pets_allowed.detail,
      pets_allowed_legal: extraction.pets_allowed.legal_summary,
      interior_renovations_value: extraction.interior_renovations.value,
      interior_renovations_detail: extraction.interior_renovations.detail,
      interior_renovations_legal: extraction.interior_renovations.legal_summary,
      exterior_renovations_value: extraction.exterior_renovations.value,
      exterior_renovations_detail: extraction.exterior_renovations.detail,
      exterior_renovations_legal: extraction.exterior_renovations.legal_summary,
      confidence: extraction.confidence,
      model_version: MODEL,
      processed_at: new Date().toISOString(),
    });

    await supabase
      .from("documents")
      .update({ processed_at: new Date().toISOString() })
      .eq("id", docId);

    // Run liability extraction as a second pass (non-fatal)
    try {
      const { data: docFull } = await supabase
        .from("documents")
        .select("id, type, extracted_text, storage_path")
        .eq("id", docId)
        .single();

      if (docFull) {
        const extraction = await extractLiability(docFull, supabase);
        if (extraction) await saveLiabilityExtractions(doc.property_id, docId, extraction, supabase);
      }
    } catch (e) {
      console.error("[liability batch]", e instanceof Error ? e.message : e);
    }

    processed++;
  }

  return { processed, failed };
}
