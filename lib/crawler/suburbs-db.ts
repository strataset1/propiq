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

async function fetchAllLocations(supabase: SupabaseClient): Promise<CrawlLocation[]> {
  const PAGE = 1000;
  const all: CrawlLocation[] = [];
  let from = 0;
  while (true) {
    const { data } = await supabase
      .from("crawl_locations")
      .select("id, name, display_name, state, region, postcode, enabled")
      .order("id")
      .range(from, from + PAGE - 1);
    if (!data || data.length === 0) break;
    all.push(...(data as CrawlLocation[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

export async function getCrawlLocations(supabase: SupabaseClient): Promise<CrawlLocation[]> {
  return (await fetchAllLocations(supabase)).filter((l) => l.enabled);
}

export async function getAllCrawlLocations(supabase: SupabaseClient): Promise<CrawlLocation[]> {
  return fetchAllLocations(supabase);
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
