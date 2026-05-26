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
    .eq("owner_email", user.email!)
    .single();

  if (!org) {
    async function signOut() {
      "use server";
      const s = await createClient();
      await s.auth.signOut();
      redirect("/login");
    }
    return (
      <div className="text-center py-24 space-y-4">
        <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <div>
          <p className="text-white font-medium">Account not linked to an organisation</p>
          <p className="text-slate-400 text-sm mt-1">
            Email <a href="mailto:sales@strataset.com.au" className="text-amber-400 hover:underline">sales@strataset.com.au</a> to get API access set up.
          </p>
        </div>
        <form action={signOut}>
          <button type="submit" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
            Sign out
          </button>
        </form>
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
