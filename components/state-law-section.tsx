"use client";

import { useState } from "react";
import type { AttributeStateLaws, StateLawEntry } from "@/lib/state-laws";

function StateLawPanel({ law }: { law: StateLawEntry }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-lg border text-xs ${law.overridesHardNo ? "border-amber-500/50 bg-amber-950/20" : "border-slate-700 bg-slate-800/40"}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
      >
        <svg className={`w-3.5 h-3.5 shrink-0 ${law.overridesHardNo ? "text-amber-400" : "text-slate-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className={`flex-1 leading-snug ${law.overridesHardNo ? "text-amber-300 font-medium" : "text-slate-300"}`}>
          {law.takeaway}
        </span>
        <svg
          className={`w-3 h-3 shrink-0 transition-transform ${open ? "rotate-180" : ""} ${law.overridesHardNo ? "text-amber-500" : "text-slate-600"}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-3 pb-3 border-t border-slate-700/50">
          <pre className="whitespace-pre-wrap text-slate-400 leading-relaxed font-sans text-xs mt-2">{law.detail}</pre>
        </div>
      )}
    </div>
  );
}

interface Props {
  stateLaws: AttributeStateLaws;
  stateName: string;
}

export default function StateLawSection({ stateLaws, stateName }: Props) {
  const laws = [
    { key: "pets_allowed" as const,       label: "Pets"              },
    { key: "short_term_rental" as const,  label: "Short-term rental" },
    { key: "interior_renovations" as const, label: "Interior renovations" },
    { key: "exterior_renovations" as const, label: "Exterior renovations" },
  ].filter(({ key }) => !!stateLaws[key]);

  if (laws.length === 0) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
        </svg>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {stateName.toUpperCase()} State Law Summary
        </p>
      </div>
      <div className="space-y-2">
        {laws.map(({ key }) => (
          <StateLawPanel key={key} law={stateLaws[key]!} />
        ))}
      </div>
    </div>
  );
}
