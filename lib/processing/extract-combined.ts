import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AttributeResult = {
  value: "yes" | "no" | "maybe";
  detail: string | null;
  legal_summary: string | null;
};

export type LiabilityField = {
  summary: string | null;
  confidence: number;
  responsible_party: "lot_owner" | "strata" | "shared" | "not_mentioned";
  source_phrase: string | null;
};

export type CombinedExtraction = {
  address: string | null;
  document_date: string | null;
  confidence: number;

  // B2C yes/no/maybe fields
  short_term_rental: AttributeResult;
  pets_allowed: AttributeResult;
  interior_renovations: AttributeResult;
  exterior_renovations: AttributeResult;

  // 8 liability fields
  combustible_cladding: LiabilityField;
  building_defect: LiabilityField;
  str_rules: LiabilityField;
  maintenance_responsibility: LiabilityField;
  insurance_excess: LiabilityField;
  special_levy: LiabilityField;
  mixed_use_occupancy: LiabilityField;
  pets: LiabilityField;
};

const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are a strata by-law analyst specialising in Australian property law.

Extract ALL of the following from the document in a single pass:

PART 1 — Simple yes/no/maybe attributes (for each: value, detail, legal_summary)
PART 2 — Liability fields (for each: summary, confidence 0-1, responsible_party, source_phrase)

For responsible_party use:
- "lot_owner" when: "owner responsible for", "must maintain", "at the owner's expense", "must indemnify", "liable for", "serving the lot"
- "strata" when: "owners corporation responsible", "common property", "body corporate responsible"
- "shared" when responsibility is split
- "not_mentioned" when the topic is absent from the document`;

function buildPrompt(docType: string, text?: string): string {
  return `Document type: ${docType}

Return ONLY a JSON code block with no other text:

\`\`\`json
{
  "address": "full street address including suburb, state, postcode — or null",
  "document_date": "YYYY-MM-DD or null",
  "confidence": 0.0,

  "short_term_rental":   { "value": "yes|no|maybe", "detail": "...", "legal_summary": "..." },
  "pets_allowed":        { "value": "yes|no|maybe", "detail": "...", "legal_summary": "..." },
  "interior_renovations":{ "value": "yes|no|maybe", "detail": "...", "legal_summary": "..." },
  "exterior_renovations":{ "value": "yes|no|maybe", "detail": "...", "legal_summary": "..." },

  "combustible_cladding":      { "summary": null, "confidence": 0.0, "responsible_party": "not_mentioned", "source_phrase": null },
  "building_defect":           { "summary": null, "confidence": 0.0, "responsible_party": "not_mentioned", "source_phrase": null },
  "str_rules":                 { "summary": null, "confidence": 0.0, "responsible_party": "not_mentioned", "source_phrase": null },
  "maintenance_responsibility":{ "summary": null, "confidence": 0.0, "responsible_party": "not_mentioned", "source_phrase": null },
  "insurance_excess":          { "summary": null, "confidence": 0.0, "responsible_party": "not_mentioned", "source_phrase": null },
  "special_levy":              { "summary": null, "confidence": 0.0, "responsible_party": "not_mentioned", "source_phrase": null },
  "mixed_use_occupancy":       { "summary": null, "confidence": 0.0, "responsible_party": "not_mentioned", "source_phrase": null },
  "pets":                      { "summary": null, "confidence": 0.0, "responsible_party": "not_mentioned", "source_phrase": null }
}
\`\`\`

LIABILITY FIELD GUIDANCE:
- combustible_cladding: ACP, aluminium composite panel, cladding, fire remediation, fire safety order
- building_defect: defect proceedings, water ingress, structural cracking, rectification works
- str_rules: Airbnb, short-term rental, transient accommodation, holiday letting, minimum lease term
- maintenance_responsibility: waterproof membrane, repair and maintain, balcony, windows, pipes, drains, roof, facade
- insurance_excess: insurance excess, originating lot, recoverable excess, EV charger, electric vehicle, high-risk installation
- special_levy: capital works fund, sinking fund, special levy, remediation levy, major works
- mixed_use_occupancy: residential purposes only, commercial use, serviced apartment, hotel use, change of use
- pets: pet approval, companion animal, nuisance animal, restricted breed
${text ? `\nDocument text:\n${text.slice(0, 10000)}` : "\nExtract from the attached PDF document."}`;
}

function parseResponse(text: string): CombinedExtraction | null {
  try {
    const match = text.match(/```json\s*([\s\S]*?)```/);
    const raw = match ? match[1] : text.match(/\{[\s\S]*\}/)?.[0];
    if (!raw) return null;
    return JSON.parse(raw) as CombinedExtraction;
  } catch {
    return null;
  }
}

export async function extractCombined(
  doc: { id: string; type: string; extracted_text?: string | null; storage_path?: string | null },
  supabase: SupabaseClient
): Promise<CombinedExtraction | null> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    if (doc.storage_path) {
      const { data: fileData } = await supabase.storage
        .from("property-documents")
        .download(doc.storage_path);

      if (!fileData) return null;

      const buffer = Buffer.from(await fileData.arrayBuffer());
      const base64 = buffer.toString("base64");

      const message = await (client.beta.messages.create as any)({
        model: MODEL,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        betas: ["pdfs-2024-09-25"],
        messages: [{
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
            { type: "text", text: buildPrompt(doc.type) },
          ],
        }],
      });

      const text = message.content[0].type === "text" ? message.content[0].text : "";
      return parseResponse(text);

    } else if (doc.extracted_text) {
      const message = await client.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildPrompt(doc.type, doc.extracted_text) }],
      });

      const text = message.content[0].type === "text" ? message.content[0].text : "";
      return parseResponse(text);
    }
  } catch (e) {
    console.error("[extract-combined]", e instanceof Error ? e.message : e);
  }

  return null;
}

// For batch API (text-only path)
export function buildCombinedBatchRequest(doc: { id: string; type: string; extracted_text: string }) {
  return {
    custom_id: doc.id,
    params: {
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user" as const, content: buildPrompt(doc.type, doc.extracted_text) }],
    },
  };
}

export { parseResponse as parseCombinedResponse };
export { MODEL as COMBINED_MODEL };
export { SYSTEM_PROMPT as COMBINED_SYSTEM_PROMPT };
export { buildPrompt as buildCombinedPrompt };
