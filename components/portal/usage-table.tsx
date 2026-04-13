type UsageRow = {
  id: string;
  endpoint: string;
  billed_at: string;
  property_id: string | null;
};

export function UsageTable({ rows }: { rows: UsageRow[] }) {
  if (rows.length === 0) {
    return <p className="text-slate-500 text-sm py-8 text-center">No lookups this month yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800">
            <th className="text-left text-slate-400 text-xs uppercase tracking-wide pb-3 font-medium">Time</th>
            <th className="text-left text-slate-400 text-xs uppercase tracking-wide pb-3 font-medium">Endpoint</th>
            <th className="text-left text-slate-400 text-xs uppercase tracking-wide pb-3 font-medium">Property ID</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/50">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="py-3 text-slate-400 font-mono text-xs">
                {new Date(row.billed_at).toLocaleString("en-AU")}
              </td>
              <td className="py-3 text-white font-mono text-xs">{row.endpoint}</td>
              <td className="py-3 text-slate-500 font-mono text-xs">{row.property_id ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
