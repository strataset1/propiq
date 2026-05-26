"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { getPropertyData, searchAddresses, getStats } from "./actions";

type Suggestion = { id: string; address_raw: string };

type LiabilityField = {
  summary: string | null;
  responsible_party: "lot_owner" | "strata" | "shared" | "not_mentioned" | null;
  confidence: number | null;
  source_phrase: string | null;
};

type ByLawResult = {
  propertyId: string;
  address: string;
  documents: { id: string; label: string; type: string }[];
  bylaws: {
    pets_allowed_value: string | null;
    short_term_rental_value: string | null;
    interior_renovations_value: string | null;
    exterior_renovations_value: string | null;
    confidence: number | null;
  } | null;
  liability: {
    combustible_cladding: LiabilityField;
    building_defect: LiabilityField;
    str_rules: LiabilityField;
    maintenance_responsibility: LiabilityField;
    insurance_excess: LiabilityField;
    special_levy: LiabilityField;
    mixed_use_occupancy: LiabilityField;
    pets: LiabilityField;
  } | null;
};

const VALUE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  yes:   { label: "Allowed",     bg: "bg-emerald-500/10", text: "text-emerald-400" },
  no:    { label: "Not allowed", bg: "bg-red-500/10",     text: "text-red-400"     },
  maybe: { label: "Conditional", bg: "bg-amber-500/10",   text: "text-amber-400"   },
};

const PARTY_CONFIG: Record<string, { label: string; color: string }> = {
  lot_owner:    { label: "Lot owner",     color: "text-amber-400"  },
  strata:       { label: "Strata corp",   color: "text-blue-400"   },
  shared:       { label: "Shared",        color: "text-purple-400" },
  not_mentioned:{ label: "Not mentioned", color: "text-slate-600"  },
};

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

const EXAMPLE_SEARCHES = [
  "66 Bowman Street, Pyrmont",
  "41 Refinery Drive",
  "Try a postcode: 2009",
];

function ValuePill({ value, field, icon }: { value: string | null; field: string; icon: string }) {
  if (!value) return null;
  const cfg = VALUE_CONFIG[value] ?? { label: value, bg: "bg-slate-800", text: "text-slate-400" };
  return (
    <div className={`flex items-center gap-2.5 px-3 py-3 rounded-lg ${cfg.bg}`}>
      <span className="text-lg">{icon}</span>
      <div>
        <p className="text-slate-400 text-xs">{field}</p>
        <p className={`text-sm font-semibold ${cfg.text}`}>{cfg.label}</p>
      </div>
    </div>
  );
}

function LockedPill({ field, icon }: { field: string; icon: string }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-3 rounded-lg bg-slate-800/50">
      <span className="text-lg opacity-40">{icon}</span>
      <div>
        <p className="text-slate-500 text-xs">{field}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <svg className="w-3 h-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <p className="text-slate-600 text-xs font-medium">Locked</p>
        </div>
      </div>
    </div>
  );
}

function LiabilityRow({ fieldKey, data }: { fieldKey: string; data: LiabilityField }) {
  const [expanded, setExpanded] = useState(false);
  const meta = LIABILITY_LABELS[fieldKey];
  const party = data.responsible_party ? PARTY_CONFIG[data.responsible_party] : null;
  const isNotMentioned = !data.responsible_party || data.responsible_party === "not_mentioned";
  const hasLongSummary = data.summary && data.summary.length > 120;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="flex items-start gap-2.5">
        <span className="text-base mt-0.5 shrink-0">{meta?.icon ?? "•"}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-slate-200 text-sm font-medium">{meta?.label ?? fieldKey}</p>
            {party && !isNotMentioned && (
              <span className={`text-xs font-medium shrink-0 whitespace-nowrap ${party.color}`}>{party.label}</span>
            )}
          </div>
          {!isNotMentioned && data.summary && (
            <p className={`text-slate-500 text-xs mt-1 leading-relaxed ${expanded ? "" : "line-clamp-2"}`}>
              {data.summary}
            </p>
          )}
          {!isNotMentioned && data.source_phrase && (
            <blockquote className="mt-2 pl-3 border-l-2 border-slate-700">
              <p className="text-slate-600 text-xs italic leading-relaxed">{data.source_phrase}</p>
            </blockquote>
          )}
          {!isNotMentioned && hasLongSummary && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="text-amber-500 hover:text-amber-400 text-xs mt-1 transition-colors"
            >
              {expanded ? "Show less" : "Read more"}
            </button>
          )}
          {isNotMentioned && (
            <p className="text-slate-600 text-xs mt-0.5">Not mentioned in document</p>
          )}
        </div>
      </div>
    </div>
  );
}

const SAMPLE_PILLS = [
  { field: "Pets",             icon: "🐾", value: "maybe", label: "Conditional"  },
  { field: "Short-term rental",icon: "🏠", value: "no",    label: "Not allowed"  },
  { field: "Interior reno",    icon: "🔨", value: "yes",   label: "Allowed"      },
  { field: "Exterior reno",    icon: "🏗️", value: "no",    label: "Not allowed"  },
];

const SAMPLE_LIABILITY = [
  { icon: "🔧", label: "Maintenance responsibility" },
  { icon: "🛡️", label: "Insurance excess"           },
  { icon: "💰", label: "Special levy"               },
  { icon: "🏢", label: "Use restrictions"           },
  { icon: "🔥", label: "Combustible cladding"       },
  { icon: "🏗️", label: "Building defects"           },
];

function SampleInsights() {
  const VALUE_COLORS: Record<string, string> = {
    yes:   "text-emerald-400",
    no:    "text-red-400",
    maybe: "text-amber-400",
  };
  const VALUE_BG: Record<string, string> = {
    yes:   "bg-emerald-500/10",
    no:    "bg-red-500/10",
    maybe: "bg-amber-500/10",
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="px-5 pt-5 pb-3 border-b border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Example result</p>
            <p className="text-white text-sm font-medium mt-0.5">12 Bligh Street, Sydney NSW 2000</p>
          </div>
          <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded-full">Sample</span>
        </div>

        {/* By-law pills */}
        <div className="px-5 py-4 border-b border-slate-800">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">By-law summary</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SAMPLE_PILLS.map((p) => (
              <div key={p.field} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg ${VALUE_BG[p.value]}`}>
                <span className="text-base">{p.icon}</span>
                <div>
                  <p className="text-slate-400 text-xs">{p.field}</p>
                  <p className={`text-sm font-semibold ${VALUE_COLORS[p.value]}`}>{p.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Blurred liability section */}
        <div className="relative px-5 py-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Liability &amp; risk summary</p>
          <div className="space-y-3 select-none blur-sm pointer-events-none" aria-hidden>
            {SAMPLE_LIABILITY.map((row) => (
              <div key={row.label} className="flex items-center gap-2.5">
                <span className="text-base">{row.icon}</span>
                <div className="flex-1">
                  <p className="text-slate-300 text-sm font-medium">{row.label}</p>
                  <div className="h-2.5 bg-slate-700 rounded mt-1 w-3/4" />
                </div>
                <div className="h-4 bg-slate-700 rounded w-16" />
              </div>
            ))}
          </div>
          {/* Overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-[1px]">
            <div className="text-center">
              <p className="text-white font-semibold text-sm">Search your address above</p>
              <p className="text-slate-400 text-xs mt-1">to unlock full liability &amp; risk details</p>
            </div>
          </div>
        </div>
    </div>
  );
}

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [result, setResult] = useState<ByLawResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [stats, setStats] = useState<{ propertyCount: number; documentCount: number } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getStats().then(setStats);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 3) { setSuggestions([]); setNotFound(false); return; }
    debounceRef.current = setTimeout(async () => {
      const data = await searchAddresses(query);
      setSuggestions(data);
      setNotFound(data.length === 0);
    }, 300);
  }, [query]);

  async function selectProperty(p: Suggestion) {
    setSuggestions([]);
    setNotFound(false);
    setQuery(p.address_raw);
    setFocused(false);
    setLoading(true);
    setResult(null);

    const { bylaws, docs, liab } = await getPropertyData(p.id);

    const liability = liab ? {
      combustible_cladding:      { summary: liab.combustible_cladding_summary,       responsible_party: liab.combustible_cladding_responsible_party as any,       confidence: liab.combustible_cladding_confidence,       source_phrase: liab.combustible_cladding_source },
      building_defect:           { summary: liab.building_defect_summary,            responsible_party: liab.building_defect_responsible_party as any,            confidence: liab.building_defect_confidence,            source_phrase: liab.building_defect_source },
      str_rules:                 { summary: liab.str_rules_summary,                  responsible_party: liab.str_rules_responsible_party as any,                  confidence: liab.str_rules_confidence,                  source_phrase: liab.str_rules_source },
      maintenance_responsibility:{ summary: liab.maintenance_responsibility_summary, responsible_party: liab.maintenance_responsibility_responsible_party as any, confidence: liab.maintenance_responsibility_confidence, source_phrase: liab.maintenance_responsibility_source },
      insurance_excess:          { summary: liab.insurance_excess_summary,           responsible_party: liab.insurance_excess_responsible_party as any,           confidence: liab.insurance_excess_confidence,           source_phrase: liab.insurance_excess_source },
      special_levy:              { summary: liab.special_levy_summary,               responsible_party: liab.special_levy_responsible_party as any,               confidence: liab.special_levy_confidence,               source_phrase: liab.special_levy_source },
      mixed_use_occupancy:       { summary: liab.mixed_use_occupancy_summary,        responsible_party: liab.mixed_use_occupancy_responsible_party as any,        confidence: liab.mixed_use_occupancy_confidence,        source_phrase: liab.mixed_use_occupancy_source },
      pets:                      { summary: liab.pets_summary,                       responsible_party: liab.pets_responsible_party as any,                       confidence: liab.pets_confidence,                       source_phrase: liab.pets_source },
    } : null;

    setResult({ propertyId: p.id, address: p.address_raw, documents: docs ?? [], bylaws: bylaws ?? null, liability });
    setLoading(false);
  }

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

  const showDropdown = focused && (suggestions.length > 0 || (notFound && query.length >= 3) || (query.length === 0));

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Nav */}
      <nav className="border-b border-slate-800/60 bg-slate-950/90 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-white font-bold tracking-tight text-lg">ByLawsIndex.com</span>
          <div className="flex items-center gap-2">
            <Link href="/" className="text-slate-400 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors">
              Home
            </Link>
            <Link href="/about" className="text-slate-400 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors">
              About
            </Link>
            <Link href="/contact" className="text-slate-400 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors">
              Contact
            </Link>
            <Link
              href="/login"
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-sm px-4 py-1.5 rounded-lg transition-colors font-medium"
            >
              API Access →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero — centered, search only */}
      <div className="relative">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-amber-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-3xl mx-auto px-6 pt-20 pb-10 w-full">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 mb-6">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
            <span className="text-emerald-400 text-xs font-medium">Official Australian strata records</span>
          </div>

          <h1 className="text-5xl font-bold text-white leading-tight mb-5">
            Know the rules<br />
            <span className="text-amber-400">before you sign the lease.</span>
          </h1>
          <p className="text-slate-300 text-lg mb-10 leading-relaxed">
            Search any strata building in Australia to instantly see what&apos;s allowed — pets, short-term rentals, renovations — and download the original by-law document.
          </p>

          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
              </svg>
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 150)}
              placeholder="Search by address, suburb or postcode…"
              className="w-full bg-slate-900 border border-slate-700 hover:border-slate-600 focus:border-amber-500 text-white rounded-xl pl-10 pr-4 py-4 text-base placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-colors shadow-lg"
            />

            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden z-10 shadow-2xl">
                {query.length === 0 && (
                  <div className="px-4 py-3 border-b border-slate-800">
                    <p className="text-slate-500 text-xs uppercase tracking-wide mb-2">Try searching for</p>
                    {EXAMPLE_SEARCHES.map((ex) => (
                      <button
                        key={ex}
                        onMouseDown={() => { setQuery(ex.replace(/^Try a postcode: /, "")); inputRef.current?.focus(); }}
                        className="w-full text-left py-1.5 text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-2"
                      >
                        <svg className="w-3 h-3 text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
                        </svg>
                        {ex}
                      </button>
                    ))}
                  </div>
                )}
                {notFound && query.length >= 3 && (
                  <div className="px-4 py-4 text-center">
                    <p className="text-slate-400 text-sm">No properties found for &quot;{query}&quot;</p>
                    <p className="text-slate-600 text-xs mt-1">Our database is growing — try another address or suburb in NSW.</p>
                  </div>
                )}
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    onMouseDown={() => selectProperty(s)}
                    className="w-full text-left px-4 py-3 text-sm text-white hover:bg-slate-800 transition-colors border-b border-slate-800 last:border-0 flex items-center gap-3"
                  >
                    <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {s.address_raw}
                  </button>
                ))}
              </div>
            )}
          </div>

          <p className="text-slate-500 text-sm mt-4">
            Instant results · Original PDF included · NSW, VIC &amp; more
          </p>

          {/* Stats — no result state */}
          {stats && !result && !loading && (
            <div className="grid grid-cols-3 gap-3 mt-6">
              {[
                { n: stats.propertyCount.toLocaleString(), label: "Properties" },
                { n: stats.documentCount.toLocaleString(), label: "Documents"  },
                { n: "3",                                  label: "States"     },
              ].map(({ n, label }) => (
                <div key={label} className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-center">
                  <p className="text-white font-bold text-lg">{n}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Results — full width */}
      <div className="max-w-6xl mx-auto px-6 pb-20 w-full">

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 animate-pulse flex items-center justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="h-3 bg-slate-800 rounded w-32" />
                <div className="h-4 bg-slate-800 rounded w-56" />
              </div>
              <div className="h-10 bg-slate-800 rounded-lg w-40 shrink-0" />
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 animate-pulse">
              <div className="h-3 bg-slate-800 rounded w-28 mb-4" />
              <div className="grid grid-cols-4 gap-3">
                {[1,2,3,4].map(i => <div key={i} className="h-14 bg-slate-800 rounded-lg" />)}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[1,2,3,4,5,6].map(i => <div key={i} className="h-20 bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />)}
            </div>
          </div>
        )}

        {/* Result content */}
        {result && !loading && (
          <div className="space-y-4">

            {/* Unlock CTA — full width */}
            {result.documents.length > 0 ? result.documents.map((doc) => (
              <div key={doc.id} className="bg-slate-900 border border-amber-500/30 rounded-xl p-5 flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-white font-semibold text-sm">{result.address}</p>
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
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-slate-300 text-sm font-medium">{result.address}</p>
              </div>
            )}

            {/* By-law summary — locked */}
            {result.bylaws && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">By-law summary</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <LockedPill field="Pets"              icon="🐾" />
                  <LockedPill field="Short-term rental" icon="🏠" />
                  <LockedPill field="Interior reno"     icon="🔨" />
                  <LockedPill field="Exterior reno"     icon="🏗️" />
                </div>
              </div>
            )}

            {/* Liability — locked cards */}
            {result.liability && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Liability &amp; risk summary</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(Object.keys(LIABILITY_LABELS) as string[]).map((key) => {
                    const meta = LIABILITY_LABELS[key];
                    return (
                      <div key={key} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
                        <span className="text-base opacity-40 shrink-0">{meta.icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-slate-400 text-sm font-medium">{meta.label}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <svg className="w-3 h-3 text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <p className="text-slate-600 text-xs">Purchase to unlock</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* No-result content */}
        {!result && !loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-4">
            <div className="space-y-14">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-6">How it works</p>
                <div className="space-y-6">
                  {[
                    { step: "1", title: "Search an address", desc: "Enter any strata property address, suburb, or postcode across Australia." },
                    { step: "2", title: "See the rules instantly", desc: "Our AI reads the by-laws and surfaces what matters — pets, STR, renovations, liability." },
                    { step: "3", title: "Download the original", desc: "Get the verified PDF document directly from the strata register for $9.95." },
                  ].map((s) => (
                    <div key={s.step} className="flex gap-4">
                      <div className="w-8 h-8 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-amber-400 text-sm font-bold">{s.step}</span>
                      </div>
                      <div>
                        <p className="text-white font-semibold text-base">{s.title}</p>
                        <p className="text-slate-400 text-sm leading-relaxed mt-1">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex gap-4">
                <div className="w-9 h-9 bg-emerald-500/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Verified, official records</p>
                  <p className="text-slate-400 text-sm mt-1 leading-relaxed">
                    Documents are sourced from licensed strata managers and official Australian state land registries.
                  </p>
                </div>
              </div>
            </div>
            <div className="hidden lg:block">
              <SampleInsights />
            </div>
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="mt-auto border-t border-slate-800 bg-slate-900/50">
        <div className="max-w-5xl mx-auto px-6 py-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="text-white font-semibold text-lg">Built for property professionals</p>
            <p className="text-slate-400 text-sm mt-1 max-w-md">
              API access, bulk lookups, webhook delivery, and custom data fields for your platform.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/contact" className="border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white text-sm px-5 py-2.5 rounded-lg transition-colors font-medium">
              Get in touch
            </Link>
            <Link href="/login" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors">
              API Access →
            </Link>
          </div>
        </div>
        <div className="border-t border-slate-800/50 max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-slate-600 text-xs">© 2025 ByLawsIndex.com. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/about" className="text-slate-600 hover:text-slate-400 text-xs transition-colors">About</Link>
            <Link href="/contact" className="text-slate-600 hover:text-slate-400 text-xs transition-colors">Contact</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
