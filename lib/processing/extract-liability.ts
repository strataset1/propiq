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

export type ResponsibleParty = "lot_owner" | "strata" | "shared" | "unclear";

export type LiabilityTriplet = {
  asset: string;
  responsible_party: ResponsibleParty;
  obligation: string;
  source_phrase: string;
  confidence: number;
  category: LiabilityCategory;
};

const SYSTEM_PROMPT = `You are a strata by-law liability extraction system specialising in Australian property law.

Your job: find every clause that allocates responsibility between a LOT OWNER or STRATA entity.

LOT OWNER entities: owner, lot owner, occupier, tenant, resident, lessee
STRATA entities: owners corporation, body corporate, strata corporation, HOA, committee

For each responsibility clause extract a structured triplet:
- asset: the thing being maintained/repaired/insured (snake_case, e.g. waterproof_membrane)
- responsible_party: "lot_owner" | "strata" | "shared" | "unclear"
- obligation: normalised obligation verb (snake_case, e.g. must_maintain, liable_for, responsible_for, must_indemnify, recover_from, repair_and_maintain, at_owners_expense)
- source_phrase: exact verbatim quote from the document (keep it short — the relevant clause only)
- confidence: 0.0–1.0
- category: one of the 8 categories below

CATEGORIES — what triggers each one:
- combustible_cladding: ACP, aluminium composite panel, cladding, fire remediation, fire safety order, fire risk material
- building_defect: defect proceedings, water ingress, structural cracking, rectification works, building defect, latent defect
- str_rules: Airbnb, short-term rental, transient accommodation, holiday letting, minimum lease term, vacation rental, hosted accommodation
- maintenance_responsibility: waterproof membrane, repair and maintain, common property, owner responsibility, balcony, windows, pipes, drains, air conditioning, roof, facade, glazing, exclusive use
- insurance_excess: insurance excess, originating lot, recoverable excess, indemnify, liable for excess, EV charger, electric vehicle charger, high-risk installation, insurance risk
- special_levy: capital works fund, sinking fund, special levy, remediation levy, major works, extraordinary levy
- mixed_use_occupancy: residential purposes only, commercial use, serviced apartment, hotel use, mixed use, change of use, occupancy restriction
- pets: pet approval, companion animal, nuisance animal, restricted breed, pet keeping, animals

RESPONSIBILITY SIGNALS — use these to determine responsible_party:
Owner signals: "owner responsible for", "must maintain", "at the owner's expense", "must indemnify", "liable for", "serving the lot", "occupier must", "lessee shall"
Strata signals: "owners corporation responsible", "common property", "body corporate responsible", "strata must maintain", "committee shall"

HIGH-VALUE ASSETS to normalise (use these exact snake_case names when you see them):
waterproof_membrane, balcony, windows, glazing, pipes, drains, air_conditioning, roof, facade, cladding, exclusive_use_area, utility_infrastructure, common_property, structural_walls, ev_charger, car_park, lift, fire_safety_system

Return ONLY a JSON code block with no other text:
\`\`\`json
[
  {
    "asset": "waterproof_membrane",
    "responsible_party": "lot_owner",
    "obligation": "must_maintain",
    "source_phrase": "The owner must maintain the waterproof membrane serving the lot",
    "confidence": 0.91,
    "category": "maintenance_responsibility"
  }
]
\`\`\`

Return [] if no relevant clauses are found. Do not include trivial or low-confidence (< 0.5) results.`;

function buildUserPrompt(docType: string, text?: string): string {
  return `Document type: ${docType}

Extract all liability triplets from this strata document. Focus on clauses that clearly allocate responsibility between lot owners and the strata/owners corporation.
${text ? `\nDocument text:\n${text.slice(0, 12000)}` : ""}`;
}

function parseResponse(text: string): LiabilityTriplet[] {
  try {
    const match = text.match(/```json\s*([\s\S]*?)```/);
    const raw = match ? match[1] : text.match(/\[[\s\S]*\]/)?.[0];
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function extractLiability(
  doc: { id: string; type: string; extracted_text?: string | null; storage_path?: string | null },
  supabase: SupabaseClient
): Promise<LiabilityTriplet[]> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    if (doc.storage_path) {
      const { data: fileData } = await supabase.storage
        .from("property-documents")
        .download(doc.storage_path);

      if (!fileData) return [];

      const buffer = Buffer.from(await fileData.arrayBuffer());
      const base64 = buffer.toString("base64");

      const message = await (client.beta.messages.create as any)({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
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
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserPrompt(doc.type, doc.extracted_text) }],
      });

      const text = message.content[0].type === "text" ? message.content[0].text : "";
      return parseResponse(text);
    }
  } catch (e) {
    console.error("[extract-liability]", e instanceof Error ? e.message : e);
  }

  return [];
}
