import type { SupabaseClient } from "@supabase/supabase-js";
import type { LiabilityTriplet, LiabilityCategory } from "@/lib/processing/extract-liability";

export const LIABILITY_CATEGORIES: LiabilityCategory[] = [
  "combustible_cladding",
  "building_defect",
  "str_rules",
  "maintenance_responsibility",
  "insurance_excess",
  "special_levy",
  "mixed_use_occupancy",
  "pets",
];

export type LiabilityRow = {
  id: string;
  property_id: string;
  document_id: string;
  asset: string;
  responsible_party: string;
  obligation: string;
  source_phrase: string;
  confidence: number;
  category: LiabilityCategory;
  processed_at: string;
};

export type GroupedLiability = Record<LiabilityCategory, Omit<LiabilityRow, "id" | "property_id" | "document_id" | "processed_at">[]>;

export async function saveLiabilityExtractions(
  propertyId: string,
  documentId: string,
  triplets: LiabilityTriplet[],
  supabase: SupabaseClient
): Promise<void> {
  await supabase
    .from("strata_liability_extractions")
    .delete()
    .eq("document_id", documentId);

  if (triplets.length === 0) return;

  await supabase.from("strata_liability_extractions").insert(
    triplets.map((t) => ({
      property_id: propertyId,
      document_id: documentId,
      asset: t.asset,
      responsible_party: t.responsible_party,
      obligation: t.obligation,
      source_phrase: t.source_phrase,
      confidence: t.confidence,
      category: t.category,
      processed_at: new Date().toISOString(),
    }))
  );
}

export async function getLiabilityByProperty(
  propertyId: string,
  supabase: SupabaseClient
): Promise<GroupedLiability> {
  const { data } = await supabase
    .from("strata_liability_extractions")
    .select("asset, responsible_party, obligation, source_phrase, confidence, category")
    .eq("property_id", propertyId)
    .order("confidence", { ascending: false });

  const rows = (data ?? []) as Pick<LiabilityRow, "asset" | "responsible_party" | "obligation" | "source_phrase" | "confidence" | "category">[];

  const grouped = Object.fromEntries(
    LIABILITY_CATEGORIES.map((cat) => [cat, rows.filter((r) => r.category === cat)])
  ) as GroupedLiability;

  return grouped;
}
