"use client";

import { useState } from "react";

type BatchResult = { ok: true; processed: number } | { ok: false; error: string };

export function BackfillLiabilityButton({
  getPending,
  processBatch,
}: {
  getPending: () => Promise<string[]>;
  processBatch: (ids: string[]) => Promise<BatchResult>;
}) {
  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState("");

  async function run() {
    setState("running");
    setError("");

    let ids: string[];
    try {
      ids = await getPending();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch pending documents");
      setState("error");
      return;
    }

    if (ids.length === 0) {
      setProgress({ done: 0, total: 0 });
      setState("done");
      return;
    }

    setProgress({ done: 0, total: ids.length });

    const CHUNK = 5;
    let done = 0;

    for (let i = 0; i < ids.length; i += CHUNK) {
      const chunk = ids.slice(i, i + CHUNK);
      try {
        const result = await processBatch(chunk);
        if (!result.ok) {
          setError(result.error);
          setState("error");
          return;
        }
        done += result.processed;
        setProgress({ done, total: ids.length });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Batch failed");
        setState("error");
        return;
      }
    }

    setState("done");
  }

  return (
    <div className="space-y-2">
      <button
        onClick={run}
        disabled={state === "running"}
        className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
      >
        {state === "running"
          ? `Running… ${progress.done}/${progress.total}`
          : state === "error"
          ? "Retry"
          : "Backfill Liability (existing docs)"}
      </button>
      {state === "done" && (
        <p className="text-xs font-mono text-emerald-400">
          Done — {progress.total === 0 ? "all documents already have liability data" : `${progress.done} extracted`}
        </p>
      )}
      {error && <p className="text-xs font-mono text-red-400">{error}</p>}
    </div>
  );
}
