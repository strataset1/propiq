"use client";

import { useState } from "react";

type DocumentRowProps = {
  doc: {
    id: string;
    label: string;
    type: string;
    ingested_via: string;
    properties: { address_raw: string } | null;
    isScanned: boolean;
    hasStorage: boolean;
  };
  processOne: (docId: string) => Promise<{ ok: true } | { ok: false; error: string }>;
};

export function DocumentRow({ doc, processOne }: DocumentRowProps) {
  const [state, setState] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const canProcess = doc.hasStorage || !doc.isScanned;

  async function handle() {
    setState("processing");
    const result = await processOne(doc.id);
    if (result.ok) {
      setState("done");
    } else {
      setState("error");
      setError(result.error);
    }
  }

  if (state === "done") return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-white text-sm truncate">{doc.label}</p>
            {doc.isScanned && (
              <span className="text-xs bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded shrink-0">scanned</span>
            )}
          </div>
          <p className="text-slate-500 text-xs mt-0.5 font-mono truncate">
            {doc.properties?.address_raw} · {doc.type} · via {doc.ingested_via}
          </p>
          {state === "error" && <p className="text-red-400 text-xs mt-1">{error}</p>}
        </div>
        <div className="shrink-0">
          {!canProcess ? (
            <span className="text-slate-600 text-xs">no file available</span>
          ) : state === "idle" ? (
            <button
              onClick={handle}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              {doc.isScanned ? "Process (vision)" : "Process"}
            </button>
          ) : state === "processing" ? (
            <span className="text-amber-400 text-xs">
              {doc.isScanned ? "Reading with vision…" : "Processing…"}
            </span>
          ) : (
            <span className="text-red-400 text-xs">Failed</span>
          )}
        </div>
      </div>
    </div>
  );
}
