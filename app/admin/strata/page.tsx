"use client";

import { useState, useEffect, useCallback } from "react";

type StrataPlan = {
  sp_number: string;
  address: string | null;
  suburb: string | null;
  lots_count: number | null;
  strata_manager_name: string | null;
  crawled_at: string;
};

type CrawlResult = {
  sp_number: string;
  found: number;
  inserted: number;
  error?: string;
};

export default function StrataPage() {
  const [lga, setLga] = useState("Newcastle");
  const [discovering, setDiscovering] = useState(false);
  const [discoverResult, setDiscoverResult] = useState<{ found: number; upserted: number } | null>(null);
  const [discoverError, setDiscoverError] = useState<string | null>(null);

  const [plans, setPlans] = useState<StrataPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  const [crawling, setCrawling] = useState(false);
  const [crawlProgress, setCrawlProgress] = useState<CrawlResult[]>([]);
  const [crawlTotal, setCrawlTotal] = useState(0);
  const [crawlDone, setCrawlDone] = useState(0);

  const loadPlans = useCallback(async () => {
    setLoadingPlans(true);
    try {
      const res = await fetch(`/api/admin/strata/plans?lga=${encodeURIComponent(lga)}`);
      if (res.ok) {
        const data = await res.json() as { plans: StrataPlan[] };
        setPlans(data.plans ?? []);
      }
    } finally {
      setLoadingPlans(false);
    }
  }, [lga]);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  async function handleDiscover() {
    setDiscovering(true);
    setDiscoverError(null);
    setDiscoverResult(null);
    try {
      const res = await fetch("/api/admin/strata/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lga }),
      });
      const data = await res.json() as { ok?: boolean; found?: number; upserted?: number; error?: string };
      if (!res.ok || data.error) {
        setDiscoverError(data.error ?? "Unknown error");
      } else {
        setDiscoverResult({ found: data.found ?? 0, upserted: data.upserted ?? 0 });
        await loadPlans();
      }
    } catch (e) {
      setDiscoverError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setDiscovering(false);
    }
  }

  async function handleCrawlAll() {
    if (plans.length === 0) return;
    setCrawling(true);
    setCrawlProgress([]);
    setCrawlDone(0);
    setCrawlTotal(plans.length);

    for (const plan of plans) {
      try {
        const res = await fetch("/api/admin/strata/crawl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sp_number: plan.sp_number }),
        });
        const data = await res.json() as { ok?: boolean; found?: number; inserted?: number; error?: string };
        setCrawlProgress((prev) => [
          ...prev,
          {
            sp_number: plan.sp_number,
            found: data.found ?? 0,
            inserted: data.inserted ?? 0,
            error: data.error,
          },
        ]);
      } catch (e) {
        setCrawlProgress((prev) => [
          ...prev,
          {
            sp_number: plan.sp_number,
            found: 0,
            inserted: 0,
            error: e instanceof Error ? e.message : "Request failed",
          },
        ]);
      }
      setCrawlDone((d) => d + 1);
    }

    setCrawling(false);
  }

  const totalFound = crawlProgress.reduce((s, r) => s + r.found, 0);
  const totalInserted = crawlProgress.reduce((s, r) => s + r.inserted, 0);
  const crawlErrors = crawlProgress.filter((r) => r.error);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-white font-semibold text-lg">NSW Strata Plan Discovery</h1>
        <p className="text-slate-400 text-sm mt-1">
          Job 1 builds the SP universe from NSW Strata Hub. Job 2 searches for by-law PDFs per SP number.
        </p>
      </div>

      {/* Job 1 — Discover SP Numbers */}
      <section className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-medium">Job 1 — Discover Strata Plans</h2>
          {plans.length > 0 && (
            <span className="text-slate-400 text-sm">{plans.length} plans in table for this LGA</span>
          )}
        </div>

        <div className="flex gap-3 items-end">
          <div className="flex-1 max-w-xs">
            <label className="block text-slate-400 text-xs mb-1">LGA</label>
            <input
              value={lga}
              onChange={(e) => setLga(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
              placeholder="e.g. Newcastle"
            />
          </div>
          <button
            onClick={handleDiscover}
            disabled={discovering || !lga}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-sm font-medium rounded transition-colors"
          >
            {discovering ? "Discovering…" : "Discover SP Numbers"}
          </button>
        </div>

        {discoverError && (
          <div className="bg-red-950 border border-red-800 rounded p-3 text-red-300 text-sm font-mono whitespace-pre-wrap">
            {discoverError}
          </div>
        )}

        {discoverResult && (
          <div className="bg-emerald-950 border border-emerald-800 rounded p-3 text-emerald-300 text-sm">
            Found {discoverResult.found} strata plans, upserted {discoverResult.upserted} into strata_plans.
          </div>
        )}

        {/* SP list */}
        {loadingPlans ? (
          <p className="text-slate-500 text-sm">Loading plans…</p>
        ) : plans.length > 0 ? (
          <div className="overflow-auto max-h-64 rounded border border-slate-800">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-900">
                <tr className="text-slate-400 text-left">
                  <th className="px-3 py-2 font-normal">SP Number</th>
                  <th className="px-3 py-2 font-normal">Address</th>
                  <th className="px-3 py-2 font-normal">Suburb</th>
                  <th className="px-3 py-2 font-normal">Lots</th>
                  <th className="px-3 py-2 font-normal">Manager</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p.sp_number} className="border-t border-slate-800 hover:bg-slate-800/50">
                    <td className="px-3 py-2 text-amber-400 font-mono">{p.sp_number}</td>
                    <td className="px-3 py-2 text-slate-300">{p.address ?? "—"}</td>
                    <td className="px-3 py-2 text-slate-400">{p.suburb ?? "—"}</td>
                    <td className="px-3 py-2 text-slate-400">{p.lots_count ?? "—"}</td>
                    <td className="px-3 py-2 text-slate-400 truncate max-w-[180px]">
                      {p.strata_manager_name ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {/* Job 2 — Crawl By-Laws */}
      <section className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-medium">Job 2 — Crawl By-Law Documents</h2>
          <button
            onClick={handleCrawlAll}
            disabled={crawling || plans.length === 0}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-sm font-medium rounded transition-colors"
          >
            {crawling
              ? `Crawling… ${crawlDone}/${crawlTotal}`
              : `Crawl All ${plans.length} SPs`}
          </button>
        </div>

        {crawling && (
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div
              className="bg-amber-500 h-2 rounded-full transition-all"
              style={{ width: `${crawlTotal > 0 ? (crawlDone / crawlTotal) * 100 : 0}%` }}
            />
          </div>
        )}

        {crawlProgress.length > 0 && (
          <>
            <div className="flex gap-6 text-sm">
              <span className="text-slate-400">
                SPs crawled: <span className="text-white">{crawlProgress.length}</span>
              </span>
              <span className="text-slate-400">
                URLs found: <span className="text-white">{totalFound}</span>
              </span>
              <span className="text-slate-400">
                Docs inserted: <span className="text-emerald-400">{totalInserted}</span>
              </span>
              {crawlErrors.length > 0 && (
                <span className="text-red-400">
                  Errors: {crawlErrors.length}
                </span>
              )}
            </div>

            <div className="overflow-auto max-h-72 rounded border border-slate-800">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-900">
                  <tr className="text-slate-400 text-left">
                    <th className="px-3 py-2 font-normal">SP Number</th>
                    <th className="px-3 py-2 font-normal">URLs Found</th>
                    <th className="px-3 py-2 font-normal">Inserted</th>
                    <th className="px-3 py-2 font-normal">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {crawlProgress.map((r) => (
                    <tr key={r.sp_number} className="border-t border-slate-800">
                      <td className="px-3 py-2 text-amber-400 font-mono">{r.sp_number}</td>
                      <td className="px-3 py-2 text-slate-300">{r.found}</td>
                      <td className="px-3 py-2 text-emerald-400">{r.inserted}</td>
                      <td className="px-3 py-2">
                        {r.error ? (
                          <span className="text-red-400 text-xs">{r.error.slice(0, 80)}</span>
                        ) : (
                          <span className="text-slate-500 text-xs">ok</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
