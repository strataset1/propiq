"use server";

import { createServiceClient } from "@/lib/supabase/server";

export async function getStats() {
  const supabase = createServiceClient();
  const [{ count: propCount }, { count: docCount }] = await Promise.all([
    supabase.from("properties").select("id", { count: "exact", head: true }).eq("status", "ready"),
    supabase.from("documents").select("id", { count: "exact", head: true }).not("processed_at", "is", null),
  ]);
  return { propertyCount: propCount ?? 0, documentCount: docCount ?? 0 };
}

export async function getPropertyData(propertyId: string) {
  const supabase = createServiceClient();

  const [{ data: bylaws }, { data: docs }, { data: liab }] = await Promise.all([
    supabase
      .from("strata_bylaws")
      .select("pets_allowed_value, short_term_rental_value, interior_renovations_value, exterior_renovations_value, confidence")
      .eq("property_id", propertyId)
      .order("processed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("documents")
      .select("id, label, type")
      .eq("property_id", propertyId)
      .not("processed_at", "is", null)
      .limit(10),
    supabase
      .from("strata_liability_extractions")
      .select("combustible_cladding_summary, combustible_cladding_responsible_party, combustible_cladding_confidence, combustible_cladding_source, building_defect_summary, building_defect_responsible_party, building_defect_confidence, building_defect_source, str_rules_summary, str_rules_responsible_party, str_rules_confidence, str_rules_source, maintenance_responsibility_summary, maintenance_responsibility_responsible_party, maintenance_responsibility_confidence, maintenance_responsibility_source, insurance_excess_summary, insurance_excess_responsible_party, insurance_excess_confidence, insurance_excess_source, special_levy_summary, special_levy_responsible_party, special_levy_confidence, special_levy_source, mixed_use_occupancy_summary, mixed_use_occupancy_responsible_party, mixed_use_occupancy_confidence, mixed_use_occupancy_source, pets_summary, pets_responsible_party, pets_confidence, pets_source")
      .eq("property_id", propertyId)
      .order("processed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return { bylaws: bylaws ?? null, docs: docs ?? [], liab: liab ?? null };
}

export async function searchAddresses(query: string) {
  const supabase = createServiceClient();
  const isPostcode = /^\d{4}$/.test(query.trim());
  const q = query.trim().replace(/,/g, " ").replace(/\s+/g, " ").trim();
  const { data } = await supabase
    .from("properties")
    .select("id, address_raw")
    .or(`address_normalised.ilike.%${q}%,address_raw.ilike.%${q}%`)
    .eq("status", "ready")
    .limit(isPostcode ? 20 : 6);
  return data ?? [];
}
