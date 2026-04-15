"use client";

import { useState, useRef } from "react";
import { SYDNEY_SUBURBS } from "@/lib/crawler/suburbs";

type SuburbStatus = "pending" | "running" | "done" | "skipped" | "error";

type SuburbResult = {
  suburb: string;
  status: SuburbStatus;
  docsFound?: number;
  reason?: string;
};

type CrawlResponse = {
  skipped?: boolean;
  reason?: string;
  docsFound?: number;
  error?: string;
};

type CrawlPanelProps = {
  crawledSuburbs: string[];
  crawlAction: (suburb: string) => Promise<CrawlResponse>;
};

export function CrawlPanel({ crawledSuburbs, crawlAction }: CrawlPanelProps) {
  const crawledSet = new Set(crawledSuburbs);

  const [results, setResults] = useState<SuburbResult[]>(
    SYDNEY_SUBURBS.map((s) => ({
      suburb: s,
      status: crawledSet.has(s) ? "done" : "pending",
    }))
  );
  const [running, setRunning] = useState(false);
  const [batchSize, setBatchSize] = useState(10);
  const shouldStop = useRef(false);

  function updateResult(suburb: string, patch: Partial<SuburbResult>) {
    setResults((prev) =>
      prev.map((r) => (r.suburb === suburb ? { ...r, ...patch } : r))
    );
  }

  async function handleStart() {
    shouldStop.current = false;
    setRunning(true);

    const pending = results.filter((r) => r.status === "pending").slice(0, batchSize);

    for (const item of pending) {
      if (shouldStop.current) break;

      updateResult(item.suburb, { status: "running" });

      try {
        const data = await crawlAction(item.suburb);

        if (data.error) {
          updateResult(item.suburb, { status: "error", reason: data.error });
        } else if (data.skipped) {
          updateResult(item.suburb, { status: "skipped", reason: data.reason });
        } else {
          updateResult(item.suburb, { status: "done", docsFound: data.docsFound ?? 0 });
        }
      } catch {
        updateResult(item.suburb, { status: "error", reason: "Request failed" });
      }
    }

    setRunning(false);
  }

  function handleStop() {
    shouldStop.current = true;
    setRunning(false);
  }

  const pending = results.filter((r) => r.status === "pending").length;
  const done = results.filter((r) => r.status === "done" || r.status === "skipped").length;
  const totalDocs = results.reduce((sum, r) => sum + (r.docsFound ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Suburbs crawled", value: done },
          { label: "Suburbs remaining", value: pending },
          { label: "Documents found", value: totalDocs },
        ].map(({ label, value }) => (
          <div key={label} className="bg-slate-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-mono font-semibold text-white">{value}</p>
            <p className="text-slate-500 text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-slate-400 text-sm">Suburbs per run:</label>
          <select
            value={batchSize}
            onChange={(e) => setBatchSize(Number(e.target.value))}
            disabled={running}
            className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none"
          >
            {[5, 10, 20, 50].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        {!running ? (
          <button
            onClick={handleStart}
            disabled={pending === 0}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold text-sm px-6 py-2 rounded-lg transition-colors"
          >
            {pending === 0 ? "All suburbs crawled" : `Start (${Math.min(batchSize, pending)} suburbs)`}
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="bg-red-600 hover:bg-red-500 text-white font-semibold text-sm px-6 py-2 rounded-lg transition-colors"
          >
            Stop
          </button>
        )}
      </div>

      {/* Suburb list */}
      <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
        {results.map((r) => (
          <div
            key={r.suburb}
            className={`flex items-center justify-between px-4 py-2.5 rounded-lg text-sm ${
              r.status === "running"
                ? "bg-amber-950 border border-amber-800"
                : r.status === "done"
                ? "bg-slate-800 border border-slate-700"
                : r.status === "error"
                ? "bg-red-950 border border-red-900"
                : "bg-slate-800/40 border border-slate-800"
            }`}
          >
            <span className={
              r.status === "running" ? "text-amber-300" :
              r.status === "done" ? "text-white" :
              r.status === "error" ? "text-red-300" :
              "text-slate-500"
            }>
              {r.suburb}
            </span>
            <span className="text-xs font-mono shrink-0 ml-4">
              {r.status === "running" && <span className="text-amber-400">crawling…</span>}
              {r.status === "done" && (
                <span className="text-emerald-400">
                  {r.docsFound !== undefined ? `${r.docsFound} doc${r.docsFound === 1 ? "" : "s"}` : "✓"}
                </span>
              )}
              {r.status === "skipped" && <span className="text-slate-500">already done</span>}
              {r.status === "error" && <span className="text-red-400">{r.reason}</span>}
              {r.status === "pending" && <span className="text-slate-700">—</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
