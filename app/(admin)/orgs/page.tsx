import { createServiceClient } from "@/lib/supabase/server";

export default async function AdminOrgsPage() {
  const supabase = createServiceClient();

  const { data: orgs } = await supabase
    .from("organisations")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Organisations</h1>
        <p className="text-slate-400 text-sm mt-1">{orgs?.length ?? 0} total</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              {["Name", "Plan", "Quota", "Licensed", "Created"].map((h) => (
                <th key={h} className="text-left text-slate-400 text-xs uppercase tracking-wide pb-3 font-medium pr-6">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {orgs?.map((org) => (
              <tr key={org.id}>
                <td className="py-3 text-white pr-6">{org.name}</td>
                <td className="py-3 pr-6">
                  <span className="text-xs font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300 capitalize">{org.plan}</span>
                </td>
                <td className="py-3 text-slate-400 font-mono text-xs pr-6">
                  {org.monthly_quota === -1 ? "∞" : org.monthly_quota.toLocaleString()}
                </td>
                <td className="py-3 pr-6">
                  {org.license_paid_at ? (
                    <span className="text-emerald-400 text-xs">✓ Paid</span>
                  ) : (
                    <span className="text-red-400 text-xs">✗ Unpaid</span>
                  )}
                </td>
                <td className="py-3 text-slate-500 text-xs">
                  {new Date(org.created_at).toLocaleDateString("en-AU")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
