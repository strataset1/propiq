import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";

export type LiabilityCategory =
  | "combustible_cladding"
  | "building_defect"
  | "str_rules"
  | "maintenance_responsibility"
  | "insurance_excess"
  | "special_levy"
  | "mixed_use_occupancy"
  | "pets";

export type ResponsibleParty = "lot_owner" | "strata" | "shared" | "not_mentioned";

export type LiabilityField = {
  summary: string | null;
  confidence: number;
  responsible_party: ResponsibleParty;
  source_phrase: string | null;
};

export type LiabilityExtraction = Record<LiabilityCategory, LiabilityField>;

const JSON_TEMPLATE = `\`\`\`json
{
  "combustible_cladding":      { "summary": "...", "confidence": 0.0, "responsible_party": "not_mentioned", "source_phrase": null },
  "building_defect":           { "summary": "...", "confidence": 0.0, "responsible_party": "not_mentioned", "source_phrase": null },
  "str_rules":                 { "summary": "...", "confidence": 0.0, "responsible_party": "not_mentioned", "source_phrase": null },
  "maintenance_responsibility":{ "summary": "...", "confidence": 0.0, "responsible_party": "not_mentioned", "source_phrase": null },
  "insurance_excess":          { "summary": "...", "confidence": 0.0, "responsible_party": "not_mentioned", "source_phrase": null },
  "special_levy":              { "summary": "...", "confidence": 0.0, "responsible_party": "not_mentioned", "source_phrase": null },
  "mixed_use_occupancy":       { "summary": "...", "confidence": 0.0, "responsible_party": "not_mentioned", "source_phrase": null },
  "pets":                      { "summary": "...", "confidence": 0.0, "responsible_party": "not_mentioned", "source_phrase": null }
}
\`\`\``;

const AU_SYSTEM_PROMPT = `You are a strata by-law liability extraction system specialising in Australian property law.

For each of the 8 fields below, analyse the document and determine:
- summary: 1–2 sentence plain-English description of what the document says about this topic (null if not mentioned)
- confidence: 0.0–1.0 (how confident you are in the extraction)
- responsible_party: who bears the responsibility — "lot_owner", "strata", "shared", or "not_mentioned"
- source_phrase: the most relevant verbatim quote from the document, or null if not mentioned

To determine responsible_party, look for these signals:
Owner signals: "owner responsible for", "must maintain", "at the owner's expense", "must indemnify", "liable for", "serving the lot", "occupier must"
Strata signals: "owners corporation responsible", "common property", "body corporate responsible", "strata must"

THE 8 FIELDS:

1. combustible_cladding
   Look for: ACP, aluminium composite panel, cladding, fire remediation, fire safety order, fire risk material, external cladding

2. building_defect
   Look for: defect proceedings, water ingress, structural cracking, rectification works, building defect, latent defect, building warranty

3. str_rules
   Look for: Airbnb, short-term rental, transient accommodation, holiday letting, minimum lease term, vacation rental, hosted accommodation, minimum tenancy

4. maintenance_responsibility
   Look for: waterproof membrane, repair and maintain, balcony, windows, pipes, drains, air conditioning, roof, facade, glazing, exclusive use area, common property maintenance
   This is the most important field — capture who is responsible for maintaining key building components

5. insurance_excess
   Look for: insurance excess, originating lot, recoverable excess, indemnify, liable for excess, EV charger, electric vehicle charger, high-risk installation, insurance risk increase
   Capture anything that shifts insurance excess liability or increases insurance risk

6. special_levy
   Look for: capital works fund, sinking fund, special levy, remediation levy, major works, extraordinary levy, administrative fund

7. mixed_use_occupancy
   Look for: residential purposes only, commercial use, serviced apartment, hotel use, mixed use, change of use, occupancy restriction, permitted use

8. pets
   Look for: pet approval, companion animal, nuisance animal, restricted breed, pet keeping, animals permitted, no pets

Return ONLY a JSON code block with no other text:
${JSON_TEMPLATE}`;

const US_SYSTEM_PROMPT = `You are a condominium and HOA document liability extraction system specialising in US property law, with a focus on Washington State (RCW 64.32 and RCW 64.90).

For each of the 8 fields below, analyse the document and determine:
- summary: 1–2 sentence plain-English description of what the document says about this topic (null if not mentioned)
- confidence: 0.0–1.0 (how confident you are in the extraction)
- responsible_party: who bears the responsibility — "lot_owner" (unit owner), "strata" (HOA/association), "shared", or "not_mentioned"
- source_phrase: the most relevant verbatim quote from the document, or null if not mentioned

To determine responsible_party, look for these signals:
Owner signals: "unit owner responsible", "owner's responsibility", "at the owner's expense", "owner shall maintain", "owner must indemnify", "limited common elements serving the unit", "owner is liable"
Association signals: "association responsible", "HOA responsible", "board of directors", "common elements", "association shall maintain", "common area", "the association must"

THE 8 FIELDS:

1. combustible_cladding
   Look for: combustible cladding, fire-rated assembly, exterior insulation finishing system (EIFS), facade fire risk, combustible construction materials

2. building_defect
   Look for: construction defect, water intrusion, structural deficiency, defect litigation, warranty claim, latent defect, building warranty, defective construction

3. str_rules
   Look for: Airbnb, VRBO, vacation rental, transient occupancy, short-term rental, minimum lease term, hosted accommodation, home sharing

4. maintenance_responsibility
   Look for: limited common elements, common elements, unit boundaries, repair and replace, balcony, windows, pipes, drains, HVAC, roof deck, glazing, unit owner's responsibility
   This is the most important field — capture who is responsible for maintaining key building components

5. insurance_excess
   Look for: deductible responsibility, insurance deductible, originating unit, loss assessment, EV charger, electric vehicle charging station, high-risk installation, master policy deductible
   Capture anything that shifts insurance deductible liability or increases insurance risk

6. special_levy
   Look for: special assessment, reserve fund contribution, capital improvement assessment, extraordinary assessment, major repair assessment, emergency assessment

7. mixed_use_occupancy
   Look for: residential use only, commercial use prohibited, home occupation, mixed use, change of use, permitted use, occupancy restriction, business use

8. pets
   Look for: pet approval, companion animal, nuisance animal, restricted breed, no pets, emotional support animal, service animal, pet deposit

Return ONLY a JSON code block with no other text:
${JSON_TEMPLATE}`;

const SYSTEM_PROMPT = AU_SYSTEM_PROMPT;

function buildUserPrompt(docType: string, text?: string): string {
  return `Document type: ${docType}

Extract all 8 liability fields from this strata document.
${text ? `\nDocument text:\n${text.slice(0, 12000)}` : ""}`;
}

function parseResponse(text: string): LiabilityExtraction | null {
  try {
    const match = text.match(/```json\s*([\s\S]*?)```/);
    const raw = match ? match[1] : text.match(/\{[\s\S]*\}/)?.[0];
    if (!raw) return null;
    return JSON.parse(raw) as LiabilityExtraction;
  } catch {
    return null;
  }
}

export async function extractLiability(
  doc: { id: string; type: string; extracted_text?: string | null; storage_path?: string | null },
  supabase: SupabaseClient
): Promise<LiabilityExtraction | null> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const systemPrompt = doc.type === "hoa" ? US_SYSTEM_PROMPT : AU_SYSTEM_PROMPT;

  try {
    if (doc.storage_path) {
      const { data: fileData } = await supabase.storage
        .from("property-documents")
        .download(doc.storage_path);

      if (!fileData) return null;

      const buffer = Buffer.from(await fileData.arrayBuffer());
      const base64 = buffer.toString("base64");

      const message = await (client.beta.messages.create as any)({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: systemPrompt,
        betas: ["pdfs-2024-09-25"],
        messages: [{
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
            { type: "text", text: buildUserPrompt(doc.type) },
          ],
        }],
      });

      const text = message.content[0].type === "text" ? message.content[0].text : "";
      return parseResponse(text);

    } else if (doc.extracted_text) {
      const message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: buildUserPrompt(doc.type, doc.extracted_text) }],
      });

      const text = message.content[0].type === "text" ? message.content[0].text : "";
      return parseResponse(text);
    }
  } catch (e) {
    console.error("[extract-liability]", e instanceof Error ? e.message : e);
  }

  return null;
}
