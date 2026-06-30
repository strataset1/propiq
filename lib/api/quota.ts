import type { SupabaseClient } from "@supabase/supabase-js";

export type QuotaResult =
  | { allowed: true; used: number; remaining: number }
  | { allowed: false; used: number; remaining: 0 };

export async function checkQuota(
  orgId: string,
  monthlyQuota: number,
  supabase: SupabaseClient
): Promise<QuotaResult> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from("api_usage")
    .select("*", { count: "exact", head: true })
    .eq("org_id", orgId)
    .gte("billed_at", startOfMonth.toISOString());

  const used = error ? 0 : (count ?? 0);

  // -1 means unlimited (enterprise)
  if (monthlyQuota === -1) {
    return { allowed: true, used, remaining: Infinity };
  }

  if (used >= monthlyQuota) {
    return { allowed: false, used, remaining: 0 };
  }

  return { allowed: true, used, remaining: monthlyQuota - used };
}

export async function recordUsage(
  orgId: string,
  apiKeyId: string,
  endpoint: string,
  propertyId: string | null,
  supabase: SupabaseClient
): Promise<void> {
  await supabase.from("api_usage").insert({
    org_id: orgId,
    api_key_id: apiKeyId,
    property_id: propertyId,
    endpoint,
    billed_at: new Date().toISOString(),
  });
}
