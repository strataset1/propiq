export const dynamic = "force-dynamic";

import { createServiceClient } from "@/lib/supabase/server";

export default async function PropertiesPage() {
  const supabase = createServiceClient();

  const { data: properties } = await supabase
    .from("properties")
    .select(`
      id,
      address_raw,
      address_normalised,
      status,
      created_at,
      documents (
        id,
        label,
        type,
        processed_at,
        created_at
      ),
      strata_bylaws (
        pets_allowed_value,
        short_term_rental_value,
        interior_renovations_value,
        confidence,
        processed_at
      ),
      strata_liability_extractions (
        processed_at
      )
    `)
    .order("created_at", { ascending: false })
    .limit(500);

  const allRows = (properties ?? []).map((p) => {
    const docs = (p.documents as any[]) ?? [];
    const bylaw = ((p.strata_bylaws as any[]) ?? [])[0] ?? null;
    const liability = ((p.strata_liability_extractions as any[]) ?? [])[0] ?? null;
    const processedDocs = docs.filter((d) => d.processed_at);
    return { ...p, docs, processedDocs, bylaw, liability };
  });

  // Only show properties with a real extracted address (status = ready)
  // Only show properties that have at least one document and a real address
  const rows = allRows
    .filter((p) => p.status === "ready" && p.address_normalised && p.docs.length > 0)
    .sort((a, b) => {
      const aDate = a.bylaw?.processed_at ?? a.docs[0]?.processed_at ?? a.created_at;
      const bDate = b.bylaw?.processed_at ?? b.docs[0]?.processed_at ?? b.created_at;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
  const pending = allRows.filter((p) => p.status !== "ready" || !p.address_normalised || p.docs.length === 0);

  const total = rows.length;
  const fullyProcessed = rows.filter((r) => r.bylaw).length;
  const withLiability = rows.filter((r) => r.liability).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Properties</h1>
        <p className="text-slate-400 text-sm mt-1">All indexed properties and their extraction status</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-400 text-xs uppercase tracking-wide">Total properties</p>
          <p className="text-2xl font-bold text-white font-mono mt-1">{total}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-400 text-xs uppercase tracking-wide">By-laws extracted</p>
          <p className="text-2xl font-bold text-emerald-400 font-mono mt-1">{fullyProcessed}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-400 text-xs uppercase tracking-wide">Liability extracted</p>
          <p className="text-2xl font-bold text-sky-400 font-mono mt-1">{withLiability}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-400 text-xs uppercase tracking-wide">Pending processing</p>
          <p className="text-2xl font-bold text-amber-400 font-mono mt-1">{pending.length}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left text-slate-400 font-medium px-4 py-3">Address</th>
                <th className="text-center text-slate-400 font-medium px-4 py-3">Docs</th>
                <th className="text-center text-slate-400 font-medium px-4 py-3">By-laws</th>
                <th className="text-center text-slate-400 font-medium px-4 py-3">Liability</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">Pets</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">STR</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">Processed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-white font-medium truncate max-w-xs">{p.address_raw ?? "—"}</p>
                    <p className="text-slate-500 text-xs mt-0.5 font-mono">{p.id.slice(0, 8)}…</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-slate-300 font-mono">{p.processedDocs.length}/{p.docs.length}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {p.bylaw ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 text-xs">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                        Done
                      </span>
                    ) : (
                      <span className="text-slate-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {p.liability ? (
                      <span className="inline-flex items-center gap-1 text-sky-400 text-xs">
                        <span className="w-1.5 h-1.5 bg-sky-400 rounded-full" />
                        Done
                      </span>
                    ) : (
                      <span className="text-slate-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ValuePill value={p.bylaw?.pets_allowed_value} />
                  </td>
                  <td className="px-4 py-3">
                    <ValuePill value={p.bylaw?.short_term_rental_value} />
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                    {p.bylaw?.processed_at
                      ? new Date(p.bylaw.processed_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ValuePill({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-slate-600 text-xs">—</span>;
  const cfg: Record<string, string> = {
    yes: "text-emerald-400",
    no: "text-red-400",
    maybe: "text-amber-400",
  };
  const labels: Record<string, string> = { yes: "Allowed", no: "No", maybe: "Conditional" };
  return <span className={`text-xs ${cfg[value] ?? "text-slate-400"}`}>{labels[value] ?? value}</span>;
}
