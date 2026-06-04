"use client";

import { useState } from "react";
import Link from "next/link";
import { StateLawPanel } from "@/components/state-law-section";
import type { AttributeStateLaws, StateLawEntry } from "@/lib/state-laws";

const LIABILITY_LABELS: Record<string, { label: string; icon: string }> = {
  combustible_cladding:      { label: "Combustible cladding",      icon: "🔥" },
  building_defect:           { label: "Building defects",          icon: "🏗️" },
  str_rules:                 { label: "Short-term rental rules",   icon: "🏠" },
  maintenance_responsibility:{ label: "Maintenance responsibility", icon: "🔧" },
  insurance_excess:          { label: "Insurance excess",          icon: "🛡️" },
  special_levy:              { label: "Special levy / assessment", icon: "💰" },
  mixed_use_occupancy:       { label: "Use restrictions",          icon: "🏢" },
  pets:                      { label: "Pets",                      icon: "🐾" },
};

const BY_LAW_FIELDS: { field: string; icon: string; key: string }[] = [
  { field: "Pets",              icon: "🐾", key: "pets_allowed_value"          },
  { field: "Short-term rental", icon: "🏠", key: "short_term_rental_value"     },
  { field: "Interior reno",     icon: "🔨", key: "interior_renovations_value"  },
  { field: "Exterior reno",     icon: "🏗️", key: "exterior_renovations_value"  },
];

const STATE_LAW_ENTRIES: { label: string; icon: string; key: keyof AttributeStateLaws }[] = [
  { label: "Pets",               icon: "🐾", key: "pets_allowed"         },
  { label: "Short-term rental",  icon: "🏠", key: "short_term_rental"    },
  { label: "Interior reno",      icon: "🔨", key: "interior_renovations" },
  { label: "Exterior reno",      icon: "🏗️", key: "exterior_renovations" },
];

const VALUE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  yes:   { label: "Allowed",      color: "text-emerald-400", bg: "bg-emerald-500/10" },
  no:    { label: "Not allowed",  color: "text-red-400",     bg: "bg-red-500/10"     },
  maybe: { label: "Conditional",  color: "text-amber-400",   bg: "bg-amber-500/10"   },
};

const PARTY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  lot_owner:    { label: "Owner",        color: "text-amber-400",   bg: "bg-amber-500/10"   },
  strata:       { label: "Strata / HOA", color: "text-indigo-400",  bg: "bg-indigo-500/10"  },
  shared:       { label: "Shared",       color: "text-purple-400",  bg: "bg-purple-500/10"  },
  not_mentioned:{ label: "Not mentioned",color: "text-slate-500",   bg: "bg-slate-800/50"   },
};

function StateLawBlock({ stateLaws, stateName }: { stateLaws?: AttributeStateLaws | null; stateName?: string }) {
  if (!stateLaws || !stateName) return null;
  const entries = STATE_LAW_ENTRIES.map(e => ({ ...e, law: stateLaws[e.key] as StateLawEntry | undefined })).filter(e => e.law);
  if (entries.length === 0) return null;
  return (
    <div className="mt-4 space-y-2">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stateName.toUpperCase()} Blanket State Laws</p>
      {entries.map(({ label, icon, law }) => (
        <div key={label} className="flex gap-2.5 items-start">
          <span className="text-sm mt-0.5 shrink-0">{icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500 mb-1">{label}</p>
            <StateLawPanel law={law!} />
          </div>
        </div>
      ))}
    </div>
  );
}

function LockIcon() {
  return (
    <svg className="w-3 h-3 text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

type BylawData = {
  pets_allowed_value: string | null;
  short_term_rental_value: string | null;
  interior_renovations_value: string | null;
  exterior_renovations_value: string | null;
  confidence: number | null;
} | null;

type LiabilityData = Record<string, string | number | null> | null;

interface Props {
  address: string;
  hasBylaws: boolean;
  hasLiability: boolean;
  docs: { id: string; label: string; type: string }[];
  isPurchased?: boolean;
  bylawData?: BylawData;
  liabilityData?: LiabilityData;
  downloadUrl?: string | null;
  stateLaws?: AttributeStateLaws | null;
  stateName?: string;
}

export default function PropertyView({
  address, hasBylaws, hasLiability, docs,
  isPurchased = false, bylawData, liabilityData, downloadUrl,
  stateLaws, stateName,
}: Props) {
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
      {/* Header bar — unlocked or CTA */}
      {isPurchased ? (
        <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-5 flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-white font-semibold text-sm">{address}</p>
              <span className="text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">Unlocked</span>
            </div>
            <p className="text-slate-400 text-sm">Full by-law summary and original PDF available below.</p>
          </div>
          {downloadUrl && (
            <a
              href={downloadUrl}
              download
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm px-6 py-3 rounded-lg transition-colors flex items-center gap-2 shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download PDF
            </a>
          )}
        </div>
      ) : docs.length > 0 ? docs.map((doc) => (
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

      {/* By-law summary */}
      {hasBylaws && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">By-law summary</p>
            {isPurchased && bylawData?.confidence != null && (
              <span className="text-xs text-slate-500">
                AI confidence: <span className="text-slate-300 font-medium">{Math.round(bylawData.confidence * 100)}%</span>
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {BY_LAW_FIELDS.map(({ field, icon, key }) => {
              const rawValue = bylawData?.[key as keyof typeof bylawData] as string | null | undefined;
              const cfg = rawValue ? VALUE_CONFIG[rawValue] : null;
              return (
                <div
                  key={field}
                  className={`flex items-center gap-2.5 px-3 py-3 rounded-lg ${isPurchased && cfg ? cfg.bg : "bg-slate-800/50"}`}
                >
                  <span className={`text-lg shrink-0 ${isPurchased && cfg ? "" : "opacity-40"}`}>{icon}</span>
                  <div>
                    <p className="text-slate-400 text-xs">{field}</p>
                    {isPurchased && cfg ? (
                      <p className={`text-sm font-semibold whitespace-nowrap ${cfg.color}`}>{cfg.label}</p>
                    ) : isPurchased && !rawValue ? (
                      <p className="text-slate-500 text-xs font-medium">Not mentioned</p>
                    ) : (
                      <div className="flex items-center gap-1 mt-0.5">
                        <LockIcon />
                        <p className="text-slate-600 text-xs font-medium">Locked</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Liability & risk summary */}
      {hasLiability && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Liability &amp; risk summary</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(LIABILITY_LABELS).map(([key, meta]) => {
              const summary = liabilityData?.[`${key}_summary`] as string | null;
              const party   = liabilityData?.[`${key}_responsible_party`] as string | null;
              const source  = liabilityData?.[`${key}_source`] as string | null;
              const partyCfg = party ? PARTY_CONFIG[party] : null;
              const hasData  = isPurchased && summary;

              return (
                <div
                  key={key}
                  className={`bg-slate-900 border rounded-xl p-4 ${hasData ? "border-slate-700" : "border-slate-800"}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`text-base shrink-0 mt-0.5 ${hasData ? "" : "opacity-40"}`}>{meta.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                        <p className={`text-sm font-medium ${hasData ? "text-white" : "text-slate-400"}`}>{meta.label}</p>
                        {hasData && partyCfg && (
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${partyCfg.bg} ${partyCfg.color} border-current/20 whitespace-nowrap`}>
                            {partyCfg.label}
                          </span>
                        )}
                      </div>
                      {hasData ? (
                        <>
                          <p className="text-slate-300 text-sm leading-relaxed">{summary}</p>
                          {source && (
                            <p className="text-slate-600 text-xs mt-2 italic border-l-2 border-slate-700 pl-2 leading-relaxed">
                              &ldquo;{source}&rdquo;
                            </p>
                          )}
                        </>
                      ) : isPurchased ? (
                        <p className="text-slate-600 text-xs">Not mentioned in this document</p>
                      ) : (
                        <div className="flex items-center gap-1 mt-0.5">
                          <LockIcon />
                          <p className="text-slate-600 text-xs">Purchase to unlock</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <StateLawBlock stateLaws={stateLaws} stateName={stateName} />
        </div>
      )}

      {/* State laws when no liability section */}
      {!hasLiability && <StateLawBlock stateLaws={stateLaws} stateName={stateName} />}

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
