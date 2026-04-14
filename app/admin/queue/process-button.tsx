"use client";

import { useState } from "react";

export function ProcessButton({ processAction }: { processAction: () => Promise<{ ok: true; queued: number; batchId: string } | { ok: false; error: string; queued?: number }> }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleProcess() {
    setState("loading");
    setMessage("");
    const result = await processAction();
    if (result.ok) {
      setMessage(`Batch submitted — ${result.queued} document${result.queued === 1 ? "" : "s"} sent to Claude.`);
      setState("done");
    } else {
      setMessage(result.error);
      setState("error");
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleProcess}
        disabled={state === "loading"}
        className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
      >
        {state === "loading" ? "Submitting to Claude…" : "Process Queue"}
      </button>
      {message && (
        <p className={`text-xs font-mono ${state === "error" ? "text-red-400" : "text-emerald-400"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
