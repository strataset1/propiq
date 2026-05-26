"use client";

import { useState } from "react";
import Link from "next/link";

const LIABILITY_LABELS: Record<string, { label: string; icon: string }> = {
  combustible_cladding:      { label: "Combustible cladding",      icon: "🔥" },
  building_defect:           { label: "Building defects",          icon: "🏗️" },
  str_rules:                 { label: "Short-term rental rules",   icon: "🏠" },
  maintenance_responsibility:{ label: "Maintenance responsibility", icon: "🔧" },
  insurance_excess:          { label: "Insurance excess",          icon: "🛡️" },
  special_levy:              { label: "Special levy",              icon: "💰" },
  mixed_use_occupancy:       { label: "Use restrictions",          icon: "🏢" },
  pets:                      { label: "Pets",                      icon: "🐾" },
};

const BY_LAW_FIELDS = [
  { field: "Pets",              icon: "🐾" },
  { field: "Short-term rental", icon: "🏠" },
  { field: "Interior reno",     icon: "🔨" },
  { field: "Exterior reno",     icon: "🏗️" },
];

function LockIcon() {
  return (
    <svg className="w-3 h-3 text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

interface Props {
  address: string;
  hasBylaws: boolean;
  hasLiability: boolean;
  docs: { id: string; label: string; type: string }[];
}

export default function PropertyView({ address, hasBylaws, hasLiability, docs }: Props) {
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  async function handleCheckout(docId: string) {
    setCheckoutLoading(docId);
    const res = await fetch("/api/checkout/document", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: docId }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert(data.error ?? "Checkout failed");
      setCheckoutLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Unlock CTA */}
      {docs.length > 0 ? docs.map((doc) => (
        <div key={doc.id} className="bg-slate-900 border border-amber-500/30 rounded-xl p-5 flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-white font-semibold text-sm">{address}</p>
            </div>
            <p className="text-slate-400 text-sm">Unlock the full by-law summary and download the original PDF document.</p>
          </div>
          <button
            onClick={() => handleCheckout(doc.id)}
            disabled={checkoutLoading === doc.id}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm px-6 py-3 rounded-lg transition-colors flex items-center gap-2 shrink-0"
          >
            {checkoutLoading === doc.id ? (
              <><svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Loading…</>
            ) : (
              <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>Unlock &amp; Download — $9.95</>
            )}
          </button>
        </div>
      )) : (
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-slate-300 text-sm font-medium">{address}</p>
        </div>
      )}

      {/* By-law summary — locked */}
      {hasBylaws && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">By-law summary</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {BY_LAW_FIELDS.map(({ field, icon }) => (
              <div key={field} className="flex items-center gap-2.5 px-3 py-3 rounded-lg bg-slate-800/50">
                <span className="text-lg opacity-40">{icon}</span>
                <div>
                  <p className="text-slate-500 text-xs">{field}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <LockIcon />
                    <p className="text-slate-600 text-xs font-medium">Locked</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Liability — locked */}
      {hasLiability && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Liability &amp; risk summary</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(LIABILITY_LABELS).map(([key, meta]) => (
              <div key={key} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
                <span className="text-base opacity-40 shrink-0">{meta.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-slate-400 text-sm font-medium">{meta.label}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <LockIcon />
                    <p className="text-slate-600 text-xs">Purchase to unlock</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasBylaws && !hasLiability && docs.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
          <p className="text-slate-400 font-medium">Document not yet indexed</p>
          <p className="text-slate-600 text-sm mt-1">This property is in our database but is still being processed.</p>
          <Link href="/" className="mt-4 inline-block text-amber-400 hover:text-amber-300 text-sm transition-colors">← Search another property</Link>
        </div>
      )}
    </div>
  );
}
