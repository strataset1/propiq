import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getUsageSummary } from "@/lib/db/usage";
import { QuotaBar } from "@/components/portal/quota-bar";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Look up the organisation linked to this user's email
  const service = createServiceClient();
  const { data: org } = await service
    .from("organisations")
    .select("*")
    .eq("owner_email", user.email)
    .single();

  if (!org) {
    return (
      <div className="text-center py-24">
        <p className="text-slate-400">
          Your account isn&apos;t linked to an organisation yet.
          Contact support to get set up.
        </p>
      </div>
    );
  }

  const usage = await getUsageSummary(org.id, org.monthly_quota, org.plan, service);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">
          Resets {new Date(usage.resetAt).toLocaleDateString("en-AU", { month: "long", day: "numeric" })}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-slate-400 text-xs uppercase tracking-wide">Used this month</p>
          <p className="text-3xl font-bold text-sky-400 font-mono mt-2">{usage.used.toLocaleString()}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-slate-400 text-xs uppercase tracking-wide">Remaining</p>
          <p className="text-3xl font-bold text-emerald-400 font-mono mt-2">
            {usage.quota === -1 ? "∞" : usage.remaining.toLocaleString()}
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-slate-400 text-xs uppercase tracking-wide">Plan</p>
          <p className="text-3xl font-bold text-white font-mono mt-2 capitalize">{org.plan}</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <QuotaBar used={usage.used} quota={usage.quota} plan={org.plan} />
      </div>
    </div>
  );
}
