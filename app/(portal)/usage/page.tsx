import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { UsageTable } from "@/components/portal/usage-table";

export default async function UsagePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const service = createServiceClient();
  const { data: org } = await service
    .from("organisations")
    .select("id")
    .eq("owner_email", user.email)
    .single();

  if (!org) redirect("/dashboard");

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: rows } = await service
    .from("api_usage")
    .select("id, endpoint, billed_at, property_id")
    .eq("org_id", org.id)
    .gte("billed_at", startOfMonth.toISOString())
    .order("billed_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-white">Usage</h1>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <UsageTable rows={rows ?? []} />
      </div>
    </div>
  );
}
