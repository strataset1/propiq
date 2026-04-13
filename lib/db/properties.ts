// lib/db/properties.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export type PropertyRow = {
  id: string;
  address_raw: string;
  address_normalised: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  status: "processing" | "ready" | "failed";
  last_crawled_at: string | null;
  created_at: string;
};

export type PropertySummaryRow = {
  id: string;
  property_id: string;
  summary: string | null;
  checklist: Record<string, unknown> | null;
  confidence: number | null;
  model_version: string | null;
  generated_at: string;
};

export async function findPropertyByAddress(
  normalised: string,
  supabase: SupabaseClient
): Promise<PropertyRow | null> {
  const { data } = await supabase
    .from("properties")
    .select("*")
    .eq("address_normalised", normalised)
    .single();
  return data ?? null;
}

export async function findPropertyById(
  id: string,
  supabase: SupabaseClient
): Promise<PropertyRow | null> {
  const { data } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .single();
  return data ?? null;
}

export async function findPropertySummary(
  propertyId: string,
  supabase: SupabaseClient
): Promise<PropertySummaryRow | null> {
  const { data } = await supabase
    .from("property_summaries")
    .select("*")
    .eq("property_id", propertyId)
    .single();
  return data ?? null;
}

export async function createProperty(
  addressRaw: string,
  addressNormalised: string,
  supabase: SupabaseClient
): Promise<PropertyRow> {
  const { data, error } = await supabase
    .from("properties")
    .insert({ address_raw: addressRaw, address_normalised: addressNormalised, status: "processing" })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}
