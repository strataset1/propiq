type QuotaBarProps = {
  used: number;
  quota: number;
  plan: string;
};

export function QuotaBar({ used, quota, plan }: QuotaBarProps) {
  const pct = quota === 0 ? 0 : Math.min(100, Math.round((used / quota) * 100));
  const colour = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-sky-500";

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-slate-400 capitalize">{plan} plan</span>
        <span className="text-white font-mono">
          {used.toLocaleString()} / {quota === -1 ? "∞" : quota.toLocaleString()} lookups
        </span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${colour}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-slate-500 text-xs">{pct}% used this month</p>
    </div>
  );
}
