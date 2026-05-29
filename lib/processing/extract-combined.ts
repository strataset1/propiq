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

const AU_SYSTEM_PROMPT = `You are a strata by-law analyst specialising in Australian property law.

Extract ALL of the following from the document in a single pass:

PART 1 — Simple yes/no/maybe attributes (for each: value, detail, legal_summary)
PART 2 — Liability fields (for each: summary, confidence 0-1, responsible_party, source_phrase)

For responsible_party use:
- "lot_owner" when: "owner responsible for", "must maintain", "at the owner's expense", "must indemnify", "liable for", "serving the lot", "occupier must"
- "strata" when: "owners corporation responsible", "common property", "body corporate responsible", "strata must"
- "shared" when responsibility is split
- "not_mentioned" when the topic is absent from the document`;

const US_SYSTEM_PROMPT = `You are a condominium and HOA (Homeowners Association) document analyst specialising in US property law, with a focus on Washington State condominium law (RCW 64.32 and RCW 64.90).

Extract ALL of the following from the document in a single pass:

PART 1 — Simple yes/no/maybe attributes (for each: value, detail, legal_summary)
PART 2 — Liability fields (for each: summary, confidence 0-1, responsible_party, source_phrase)

For responsible_party use:
- "lot_owner" when: "unit owner responsible", "owner's responsibility", "at the owner's expense", "owner shall maintain", "owner must indemnify", "limited common elements serving the unit", "owner is liable"
- "strata" when: "association responsible", "HOA responsible", "board of directors", "common elements", "association shall maintain", "common area", "the association must"
- "shared" when responsibility is split
- "not_mentioned" when the topic is absent from the document`;

// Backwards-compatible alias — AU is the default
const SYSTEM_PROMPT = AU_SYSTEM_PROMPT;

function buildAuPrompt(docType: string, text?: string): string {
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

LIABILITY FIELD GUIDANCE (Australian terminology):
- combustible_cladding: ACP, aluminium composite panel, cladding, fire remediation, fire safety order, fire risk material, external cladding
- building_defect: defect proceedings, water ingress, structural cracking, rectification works, latent defect, building warranty
- str_rules: Airbnb, short-term rental, transient accommodation, holiday letting, minimum lease term, vacation rental, hosted accommodation
- maintenance_responsibility: waterproof membrane, repair and maintain, balcony, windows, pipes, drains, air conditioning, roof, facade, glazing, exclusive use area, common property maintenance
- insurance_excess: insurance excess, originating lot, recoverable excess, indemnify, EV charger, electric vehicle charger, high-risk installation, insurance risk increase
- special_levy: capital works fund, sinking fund, special levy, remediation levy, major works, extraordinary levy, administrative fund
- mixed_use_occupancy: residential purposes only, commercial use, serviced apartment, hotel use, change of use, occupancy restriction, permitted use
- pets: pet approval, companion animal, nuisance animal, restricted breed, pet keeping, animals permitted, no pets
${text ? `\nDocument text:\n${text.slice(0, 10000)}` : "\nExtract from the attached PDF document."}`;
}

function buildUsPrompt(docType: string, text?: string): string {
  return `Document type: ${docType}

Return ONLY a JSON code block with no other text:

\`\`\`json
{
  "address": "full US street address including city, state abbreviation, ZIP code — or null",
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

LIABILITY FIELD GUIDANCE (US/Washington State terminology):
- combustible_cladding: combustible cladding, fire-rated assembly, exterior insulation finishing system, facade fire risk, combustible construction materials, EIFS
- building_defect: construction defect, water intrusion, structural deficiency, defect litigation, warranty claim, latent defect, building warranty, defective construction
- str_rules: Airbnb, VRBO, vacation rental, transient occupancy, short-term rental, minimum lease term, hosted accommodation, home sharing
- maintenance_responsibility: limited common elements, common elements, unit boundaries, repair and replace, balcony, windows, pipes, drains, HVAC, roof deck, glazing, unit owner's responsibility
- insurance_excess: deductible responsibility, insurance deductible, originating unit, loss assessment, EV charger, electric vehicle charging station, high-risk installation, master policy deductible
- special_levy: special assessment, reserve fund contribution, capital improvement assessment, extraordinary assessment, major repair assessment, emergency assessment
- mixed_use_occupancy: residential use only, commercial use prohibited, home occupation, mixed use, change of use, permitted use, occupancy restriction, business use
- pets: pet approval, companion animal, nuisance animal, restricted breed, no pets, emotional support animal, service animal, pet deposit
${text ? `\nDocument text:\n${text.slice(0, 10000)}` : "\nExtract from the attached PDF document."}`;
}

function buildPrompt(docType: string, text?: string): string {
  return buildAuPrompt(docType, text);
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
  const isUs = doc.type === "hoa";
  const systemPrompt = isUs ? US_SYSTEM_PROMPT : AU_SYSTEM_PROMPT;
  const userPromptFn = isUs ? buildUsPrompt : buildAuPrompt;

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
        system: systemPrompt,
        betas: ["pdfs-2024-09-25"],
        messages: [{
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
            { type: "text", text: userPromptFn(doc.type) },
          ],
        }],
      });

      const text = message.content[0].type === "text" ? message.content[0].text : "";
      return parseResponse(text);

    } else if (doc.extracted_text) {
      const message = await client.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userPromptFn(doc.type, doc.extracted_text) }],
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
  const isUs = doc.type === "hoa";
  return {
    custom_id: doc.id,
    params: {
      model: MODEL,
      max_tokens: 4096,
      system: isUs ? US_SYSTEM_PROMPT : AU_SYSTEM_PROMPT,
      messages: [{ role: "user" as const, content: isUs ? buildUsPrompt(doc.type, doc.extracted_text) : buildAuPrompt(doc.type, doc.extracted_text) }],
    },
  };
}

export { parseResponse as parseCombinedResponse };
export { MODEL as COMBINED_MODEL };
export { SYSTEM_PROMPT as COMBINED_SYSTEM_PROMPT };
export { buildPrompt as buildCombinedPrompt };
