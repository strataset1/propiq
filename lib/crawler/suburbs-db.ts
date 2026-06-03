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

async function fetchAllRows(
  supabase: SupabaseClient,
  filter?: { enabled: boolean }
): Promise<CrawlLocation[]> {
  const PAGE = 1000;
  const all: CrawlLocation[] = [];
  let from = 0;

  while (true) {
    let q = supabase
      .from("crawl_locations")
      .select("id, name, display_name, state, region, postcode, enabled")
      .order("state")
      .order("display_name")
      .range(from, from + PAGE - 1);

    if (filter) q = q.eq("enabled", filter.enabled);

    const { data, error } = await q;
    if (error || !data || data.length === 0) break;
    all.push(...(data as CrawlLocation[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }

  return all;
}

export async function getCrawlLocations(supabase: SupabaseClient): Promise<CrawlLocation[]> {
  return fetchAllRows(supabase, { enabled: true });
}

export async function getAllCrawlLocations(supabase: SupabaseClient): Promise<CrawlLocation[]> {
  return fetchAllRows(supabase);
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
