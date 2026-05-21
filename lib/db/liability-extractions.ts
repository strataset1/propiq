import type { SupabaseClient } from "@supabase/supabase-js";
import type { LiabilityExtraction } from "@/lib/processing/extract-liability";
import type { CombinedExtraction } from "@/lib/processing/extract-combined";
import { normaliseAddress } from "@/lib/utils/address";

export async function saveLiabilityExtractions(
  propertyId: string,
  documentId: string,
  extraction: LiabilityExtraction,
  supabase: SupabaseClient
): Promise<void> {
  const f = extraction;
  await supabase.from("strata_liability_extractions").upsert({
    property_id: propertyId,
    document_id: documentId,

    combustible_cladding_summary:          f.combustible_cladding.summary,
    combustible_cladding_confidence:        f.combustible_cladding.confidence,
    combustible_cladding_responsible_party: f.combustible_cladding.responsible_party,
    combustible_cladding_source:            f.combustible_cladding.source_phrase,

    building_defect_summary:               f.building_defect.summary,
    building_defect_confidence:             f.building_defect.confidence,
    building_defect_responsible_party:      f.building_defect.responsible_party,
    building_defect_source:                 f.building_defect.source_phrase,

    str_rules_summary:                     f.str_rules.summary,
    str_rules_confidence:                   f.str_rules.confidence,
    str_rules_responsible_party:            f.str_rules.responsible_party,
    str_rules_source:                       f.str_rules.source_phrase,

    maintenance_responsibility_summary:          f.maintenance_responsibility.summary,
    maintenance_responsibility_confidence:        f.maintenance_responsibility.confidence,
    maintenance_responsibility_responsible_party: f.maintenance_responsibility.responsible_party,
    maintenance_responsibility_source:            f.maintenance_responsibility.source_phrase,

    insurance_excess_summary:              f.insurance_excess.summary,
    insurance_excess_confidence:            f.insurance_excess.confidence,
    insurance_excess_responsible_party:     f.insurance_excess.responsible_party,
    insurance_excess_source:                f.insurance_excess.source_phrase,

    special_levy_summary:                  f.special_levy.summary,
    special_levy_confidence:                f.special_levy.confidence,
    special_levy_responsible_party:         f.special_levy.responsible_party,
    special_levy_source:                    f.special_levy.source_phrase,

    mixed_use_occupancy_summary:           f.mixed_use_occupancy.summary,
    mixed_use_occupancy_confidence:         f.mixed_use_occupancy.confidence,
    mixed_use_occupancy_responsible_party:  f.mixed_use_occupancy.responsible_party,
    mixed_use_occupancy_source:             f.mixed_use_occupancy.source_phrase,

    pets_summary:                          f.pets.summary,
    pets_confidence:                        f.pets.confidence,
    pets_responsible_party:                 f.pets.responsible_party,
    pets_source:                            f.pets.source_phrase,

    processed_at: new Date().toISOString(),
  }, { onConflict: "document_id" });
}

export async function saveAllExtractions(
  propertyId: string,
  documentId: string,
  e: CombinedExtraction,
  supabase: SupabaseClient
): Promise<void> {
  const now = new Date().toISOString();

  await Promise.all([
    supabase.from("strata_bylaws").upsert({
      document_id: documentId,
      property_id: propertyId,
      document_date: e.document_date ?? null,
      short_term_rental_value: e.short_term_rental?.value,
      short_term_rental_detail: e.short_term_rental?.detail,
      short_term_rental_legal: e.short_term_rental?.legal_summary,
      pets_allowed_value: e.pets_allowed?.value,
      pets_allowed_detail: e.pets_allowed?.detail,
      pets_allowed_legal: e.pets_allowed?.legal_summary,
      interior_renovations_value: e.interior_renovations?.value,
      interior_renovations_detail: e.interior_renovations?.detail,
      interior_renovations_legal: e.interior_renovations?.legal_summary,
      exterior_renovations_value: e.exterior_renovations?.value,
      exterior_renovations_detail: e.exterior_renovations?.detail,
      exterior_renovations_legal: e.exterior_renovations?.legal_summary,
      confidence: e.confidence,
      model_version: "claude-sonnet-4-6",
      processed_at: now,
    }),
    supabase.from("strata_liability_extractions").upsert({
      document_id: documentId,
      property_id: propertyId,
      combustible_cladding_summary:          e.combustible_cladding.summary,
      combustible_cladding_confidence:        e.combustible_cladding.confidence,
      combustible_cladding_responsible_party: e.combustible_cladding.responsible_party,
      combustible_cladding_source:            e.combustible_cladding.source_phrase,
      building_defect_summary:               e.building_defect.summary,
      building_defect_confidence:             e.building_defect.confidence,
      building_defect_responsible_party:      e.building_defect.responsible_party,
      building_defect_source:                 e.building_defect.source_phrase,
      str_rules_summary:                     e.str_rules.summary,
      str_rules_confidence:                   e.str_rules.confidence,
      str_rules_responsible_party:            e.str_rules.responsible_party,
      str_rules_source:                       e.str_rules.source_phrase,
      maintenance_responsibility_summary:          e.maintenance_responsibility.summary,
      maintenance_responsibility_confidence:        e.maintenance_responsibility.confidence,
      maintenance_responsibility_responsible_party: e.maintenance_responsibility.responsible_party,
      maintenance_responsibility_source:            e.maintenance_responsibility.source_phrase,
      insurance_excess_summary:              e.insurance_excess.summary,
      insurance_excess_confidence:            e.insurance_excess.confidence,
      insurance_excess_responsible_party:     e.insurance_excess.responsible_party,
      insurance_excess_source:                e.insurance_excess.source_phrase,
      special_levy_summary:                  e.special_levy.summary,
      special_levy_confidence:                e.special_levy.confidence,
      special_levy_responsible_party:         e.special_levy.responsible_party,
      special_levy_source:                    e.special_levy.source_phrase,
      mixed_use_occupancy_summary:           e.mixed_use_occupancy.summary,
      mixed_use_occupancy_confidence:         e.mixed_use_occupancy.confidence,
      mixed_use_occupancy_responsible_party:  e.mixed_use_occupancy.responsible_party,
      mixed_use_occupancy_source:             e.mixed_use_occupancy.source_phrase,
      pets_summary:                          e.pets.summary,
      pets_confidence:                        e.pets.confidence,
      pets_responsible_party:                 e.pets.responsible_party,
      pets_source:                            e.pets.source_phrase,
      processed_at: now,
    }, { onConflict: "document_id" }),
    supabase.from("documents").update({ processed_at: now }).eq("id", documentId),
  ]);

  if (e.address) {
    const normalised = await normaliseAddress(e.address);
    await Promise.all([
      supabase.from("properties").update({
        address_raw: e.address,
        address_normalised: normalised,
        status: "ready",
      }).eq("id", propertyId),
      supabase.from("documents").update({ label: e.address }).eq("id", documentId),
    ]);
  } else {
    await supabase.from("properties").update({ status: "ready" }).eq("id", propertyId);
  }
}

export async function getLiabilityByProperty(
  propertyId: string,
  supabase: SupabaseClient
) {
  const { data } = await supabase
    .from("strata_liability_extractions")
    .select("*")
    .eq("property_id", propertyId)
    .order("processed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  return {
    combustible_cladding:       { summary: data.combustible_cladding_summary,       confidence: data.combustible_cladding_confidence,       responsible_party: data.combustible_cladding_responsible_party,       source_phrase: data.combustible_cladding_source },
    building_defect:            { summary: data.building_defect_summary,            confidence: data.building_defect_confidence,            responsible_party: data.building_defect_responsible_party,            source_phrase: data.building_defect_source },
    str_rules:                  { summary: data.str_rules_summary,                  confidence: data.str_rules_confidence,                  responsible_party: data.str_rules_responsible_party,                  source_phrase: data.str_rules_source },
    maintenance_responsibility: { summary: data.maintenance_responsibility_summary, confidence: data.maintenance_responsibility_confidence, responsible_party: data.maintenance_responsibility_responsible_party, source_phrase: data.maintenance_responsibility_source },
    insurance_excess:           { summary: data.insurance_excess_summary,           confidence: data.insurance_excess_confidence,           responsible_party: data.insurance_excess_responsible_party,           source_phrase: data.insurance_excess_source },
    special_levy:               { summary: data.special_levy_summary,               confidence: data.special_levy_confidence,               responsible_party: data.special_levy_responsible_party,               source_phrase: data.special_levy_source },
    mixed_use_occupancy:        { summary: data.mixed_use_occupancy_summary,        confidence: data.mixed_use_occupancy_confidence,        responsible_party: data.mixed_use_occupancy_responsible_party,        source_phrase: data.mixed_use_occupancy_source },
    pets:                       { summary: data.pets_summary,                       confidence: data.pets_confidence,                       responsible_party: data.pets_responsible_party,                       source_phrase: data.pets_source },
  };
}
