// lib/db/usage.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export type UsageSummary = {
  used: number;
  remaining: number;
  quota: number;
  plan: string;
  resetAt: string;
};

export async function getUsageSummary(
  orgId: string,
  monthlyQuota: number,
  plan: string,
  supabase: SupabaseClient
): Promise<UsageSummary> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const nextMonth = new Date(startOfMonth);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const { count } = await supabase
    .from("api_usage")
    .select("*", { count: "exact", head: true })
    .eq("org_id", orgId)
    .gte("billed_at", startOfMonth.toISOString());

  const used = count ?? 0;

  return {
    used,
    remaining: Math.max(0, monthlyQuota - used),
    quota: monthlyQuota,
    plan,
    resetAt: nextMonth.toISOString(),
  };
}
