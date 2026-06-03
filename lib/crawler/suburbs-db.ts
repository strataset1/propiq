import type { SupabaseClient } from "@supabase/supabase-js";

export type CrawlLocation = {
  id: string;
  name: string;
  display_name: string;
  state: string;
  region: "au" | "us";
  postcode: string | null;
  enabled: boolean;
};

export async function getCrawlLocations(supabase: SupabaseClient): Promise<CrawlLocation[]> {
  const { data } = await supabase
    .from("crawl_locations")
    .select("id, name, display_name, state, region, postcode, enabled")
    .eq("enabled", true)
    .order("state")
    .order("display_name");
  return (data ?? []) as CrawlLocation[];
}

export async function getAllCrawlLocations(supabase: SupabaseClient): Promise<CrawlLocation[]> {
  const { data } = await supabase
    .from("crawl_locations")
    .select("id, name, display_name, state, region, postcode, enabled")
    .order("state")
    .order("display_name");
  return (data ?? []) as CrawlLocation[];
}

export async function addCrawlLocation(
  supabase: SupabaseClient,
  data: Omit<CrawlLocation, "id" | "enabled">
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("crawl_locations").insert({ ...data, enabled: true });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function toggleCrawlLocation(
  supabase: SupabaseClient,
  id: string,
  enabled: boolean
): Promise<void> {
  await supabase.from("crawl_locations").update({ enabled }).eq("id", id);
}
