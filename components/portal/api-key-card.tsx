"use client";

import { useState } from "react";

type ApiKeyCardProps = {
  id: string;
  label: string;
  lastUsedAt: string | null;
  createdAt: string;
};

export function ApiKeyCard({ id, label, lastUsedAt, createdAt }: ApiKeyCardProps) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-white font-medium text-sm">{label}</p>
        <p className="text-slate-500 text-xs font-mono mt-1">
          sk_live_••••••••••••{id.slice(-4)}
        </p>
        <p className="text-slate-600 text-xs mt-1">
          Created {new Date(createdAt).toLocaleDateString("en-AU")}
          {lastUsedAt && ` · Last used ${new Date(lastUsedAt).toLocaleDateString("en-AU")}`}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-emerald-400 text-xs flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
          Active
        </span>
        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            className="text-red-400 text-xs hover:text-red-300 transition-colors px-2 py-1 rounded hover:bg-slate-800"
          >
            Revoke
          </button>
        ) : (
          <div className="flex gap-1">
            <button
              type="submit"
              className="text-red-400 text-xs bg-red-950 border border-red-800 px-2 py-1 rounded hover:bg-red-900"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="text-slate-400 text-xs px-2 py-1 rounded hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
