"use client";

import { useState } from "react";
import { flushSync } from "react-dom";

type DocumentRowProps = {
  doc: {
    id: string;
    label: string;
    type: string;
    ingested_via: string;
    properties: { address_raw: string } | null;
    source_url: string | null;
    isScanned: boolean;
    hasStorage: boolean;
  };
  processOne: (docId: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  deleteOne: (docId: string) => Promise<{ ok: true } | { ok: false; error: string }>;
};

export function DocumentRow({ doc, processOne, deleteOne }: DocumentRowProps) {
  const [state, setState] = useState<"idle" | "processing" | "deleting" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const canProcess = doc.hasStorage || !doc.isScanned;

  async function handle() {
    flushSync(() => setState("processing"));
    const result = await processOne(doc.id);
    if (result.ok) {
      setState("done");
    } else {
      setState("error");
      setError(result.error);
    }
  }

  async function handleDelete() {
    flushSync(() => setState("deleting"));
    const result = await deleteOne(doc.id);
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
          {doc.source_url && (
            <a href={doc.source_url} target="_blank" rel="noopener noreferrer"
              className="text-slate-600 hover:text-slate-400 text-xs font-mono truncate block mt-0.5 max-w-full"
              title={doc.source_url}
            >
              {doc.source_url}
            </a>
          )}
          {state === "error" && <p className="text-red-400 text-xs mt-1">{error}</p>}
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {state === "deleting" ? (
            <span className="text-slate-500 text-xs">Deleting…</span>
          ) : state === "idle" || state === "error" ? (
            <button
              onClick={handleDelete}
              title="Delete document"
              className="text-slate-600 hover:text-red-400 transition-colors p-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </button>
          ) : null}
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
          ) : state === "error" ? (
            <span className="text-red-400 text-xs">Failed</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
