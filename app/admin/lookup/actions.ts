"use server";

import { createServiceClient } from "@/lib/supabase/server";

export async function searchProperties(query: string) {
  const supabase = createServiceClient();
  const q = query.replace(/,/g, " ").replace(/\s+/g, " ").trim();
  const { data } = await supabase
    .from("properties")
    .select("id, address_normalised")
    .or(`address_normalised.ilike.%${q}%,address_raw.ilike.%${q}%`)
    .not("address_normalised", "is", null)
    .limit(8);
  return data ?? [];
}

export async function lookupProperty(propertyId: string): Promise<{
  property: { id: string; address_raw: string; address_normalised: string | null; status: string } | null;
  bylaws: any | null;
  liability: any | null;
}> {
  const supabase = createServiceClient();

  const { data: property } = await supabase
    .from("properties")
    .select("id, address_raw, address_normalised, status")
    .eq("id", propertyId)
    .single();

  if (!property) return { property: null, bylaws: null, liability: null };

  const [{ data: bylaws }, { data: liability }] = await Promise.all([
    supabase
      .from("strata_bylaws")
      .select("*")
      .eq("property_id", propertyId)
      .order("processed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("strata_liability_extractions")
      .select("*")
      .eq("property_id", propertyId)
      .order("processed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return { property, bylaws, liability };
}

export async function lookupByAddress(query: string) {
  const supabase = createServiceClient();
  const q = query.replace(/,/g, " ").replace(/\s+/g, " ").trim();
  const { data } = await supabase
    .from("properties")
    .select("id, address_raw, address_normalised, status")
    .or(`address_normalised.ilike.%${q}%,address_raw.ilike.%${q}%`)
    .limit(1);
  return data?.[0] ?? null;
}
