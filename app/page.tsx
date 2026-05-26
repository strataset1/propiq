"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { getPropertyData, searchAddresses } from "./actions";

type Suggestion = { id: string; address_raw: string };

type LiabilityField = {
  summary: string | null;
  responsible_party: "lot_owner" | "strata" | "shared" | "not_mentioned" | null;
  confidence: number | null;
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

function LiabilityRow({ fieldKey, data }: { fieldKey: string; data: LiabilityField }) {
  const [expanded, setExpanded] = useState(false);
  const meta = LIABILITY_LABELS[fieldKey];
  const party = data.responsible_party ? PARTY_CONFIG[data.responsible_party] : null;
  const isNotMentioned = !data.responsible_party || data.responsible_party === "not_mentioned";
  const hasLongSummary = data.summary && data.summary.length > 120;

  return (
    <div className="py-3 border-b border-slate-800/60 last:border-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2.5 min-w-0">
          <span className="text-base mt-0.5 shrink-0">{meta?.icon ?? "•"}</span>
          <div className="min-w-0">
            <p className="text-slate-200 text-sm font-medium">{meta?.label ?? fieldKey}</p>
            {!isNotMentioned && data.summary && (
              <p className={`text-slate-500 text-xs mt-0.5 leading-relaxed ${expanded ? "" : "line-clamp-2"}`}>
                {data.summary}
              </p>
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
        {party && !isNotMentioned && (
          <span className={`text-xs font-medium shrink-0 mt-0.5 whitespace-nowrap ${party.color}`}>{party.label}</span>
        )}
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      combustible_cladding:      { summary: liab.combustible_cladding_summary,       responsible_party: liab.combustible_cladding_responsible_party as any,       confidence: liab.combustible_cladding_confidence },
      building_defect:           { summary: liab.building_defect_summary,            responsible_party: liab.building_defect_responsible_party as any,            confidence: liab.building_defect_confidence },
      str_rules:                 { summary: liab.str_rules_summary,                  responsible_party: liab.str_rules_responsible_party as any,                  confidence: liab.str_rules_confidence },
      maintenance_responsibility:{ summary: liab.maintenance_responsibility_summary, responsible_party: liab.maintenance_responsibility_responsible_party as any, confidence: liab.maintenance_responsibility_confidence },
      insurance_excess:          { summary: liab.insurance_excess_summary,           responsible_party: liab.insurance_excess_responsible_party as any,           confidence: liab.insurance_excess_confidence },
      special_levy:              { summary: liab.special_levy_summary,               responsible_party: liab.special_levy_responsible_party as any,               confidence: liab.special_levy_confidence },
      mixed_use_occupancy:       { summary: liab.mixed_use_occupancy_summary,        responsible_party: liab.mixed_use_occupancy_responsible_party as any,        confidence: liab.mixed_use_occupancy_confidence },
      pets:                      { summary: liab.pets_summary,                       responsible_party: liab.pets_responsible_party as any,                       confidence: liab.pets_confidence },
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
          <span className="text-white font-bold tracking-tight text-lg">Strataset</span>
          <div className="flex items-center gap-2">
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

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-amber-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-14 w-full">
          <div className="max-w-2xl">
            {/* Legitimacy badge */}
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 mb-6">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              <span className="text-emerald-400 text-xs font-medium">Official Australian strata records</span>
            </div>

            <h1 className="text-5xl sm:text-6xl font-bold text-white leading-tight mb-5">
              Know the rules<br />
              <span className="text-amber-400">before you sign the lease.</span>
            </h1>
            <p className="text-slate-300 text-xl mb-10 leading-relaxed">
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
                  {/* Empty state — show examples */}
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

                  {/* No results */}
                  {notFound && query.length >= 3 && (
                    <div className="px-4 py-4 text-center">
                      <p className="text-slate-400 text-sm">No properties found for &quot;{query}&quot;</p>
                      <p className="text-slate-600 text-xs mt-1">Our database is growing — try another address or suburb in NSW.</p>
                    </div>
                  )}

                  {/* Results */}
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

            {/* Trust line */}
            {!result && !loading && (
              <p className="text-slate-500 text-sm mt-4">
                Instant results · Original PDF included · NSW, VIC &amp; more
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-5xl mx-auto px-6 w-full pb-20">
        {loading && (
          <div className="space-y-4 max-w-2xl">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 animate-pulse">
              <div className="h-4 bg-slate-800 rounded w-40 mb-4" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[1,2,3,4].map(i => <div key={i} className="h-14 bg-slate-800 rounded-lg" />)}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 animate-pulse space-y-4">
              {[1,2,3,4].map(i => <div key={i} className="h-10 bg-slate-800 rounded" />)}
            </div>
          </div>
        )}

        {result && !loading && (
          <div className="space-y-4 max-w-2xl">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-slate-300 text-sm font-medium">{result.address}</p>
            </div>

            {/* 4 by-law pills */}
            {result.bylaws && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">By-law summary</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <ValuePill value={result.bylaws.pets_allowed_value}         field="Pets"            icon="🐾" />
                  <ValuePill value={result.bylaws.short_term_rental_value}    field="Short-term rental" icon="🏠" />
                  <ValuePill value={result.bylaws.interior_renovations_value} field="Interior reno"   icon="🔨" />
                  <ValuePill value={result.bylaws.exterior_renovations_value} field="Exterior reno"   icon="🏗️" />
                </div>
              </div>
            )}

            {/* 8 liability fields */}
            {result.liability && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Liability &amp; risk summary</p>
                <div>
                  {(Object.keys(LIABILITY_LABELS) as (keyof typeof result.liability)[]).map((key) => (
                    <LiabilityRow key={key} fieldKey={key} data={result.liability![key]} />
                  ))}
                </div>
              </div>
            )}

            {/* Documents */}
            {result.documents.length > 0 ? (
              <>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider pt-2">Documents</p>
                {result.documents.map((doc) => (
                  <div key={doc.id} className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 flex items-center justify-between gap-4 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 bg-slate-800 rounded-lg flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{doc.label}</p>
                        <p className="text-slate-500 text-xs mt-0.5 capitalize">{doc.type.replace(/_/g, " ")}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCheckout(doc.id)}
                      disabled={checkoutLoading === doc.id}
                      className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors shrink-0 flex items-center gap-2"
                    >
                      {checkoutLoading === doc.id ? (
                        <><svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Loading…</>
                      ) : (
                        <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>Download — $9.95</>
                      )}
                    </button>
                  </div>
                ))}
              </>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
                <p className="text-slate-400 text-sm font-medium">No documents available yet</p>
                <p className="text-slate-600 text-xs mt-1">We&apos;re still indexing this building</p>
              </div>
            )}
          </div>
        )}

        {/* Content sections — visible when no search result */}
        {!result && !loading && (
          <div className="max-w-2xl space-y-16 pt-4">

            {/* How it works */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-6">How it works</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                  { step: "1", title: "Search an address", desc: "Enter any strata property address, suburb, or postcode across Australia." },
                  { step: "2", title: "See the rules instantly", desc: "Our AI reads the by-laws and surfaces what matters — pets, STR, renovations, liability." },
                  { step: "3", title: "Download the original", desc: "Get the verified PDF document directly from the strata register for $9.95." },
                ].map((s) => (
                  <div key={s.step} className="space-y-2">
                    <div className="w-8 h-8 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-center">
                      <span className="text-amber-400 text-sm font-bold">{s.step}</span>
                    </div>
                    <p className="text-white font-semibold text-base">{s.title}</p>
                    <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Who it's for */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-6">Who uses Strataset</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { icon: "🏠", title: "Buyers & Renters", desc: "Know exactly what you can and can't do before you sign. Avoid surprises around pets, renovations, and short-term letting." },
                  { icon: "📈", title: "Property Investors", desc: "Assess investment risk at a glance. Identify special levies, cladding issues, and building defects before they hit your return." },
                  { icon: "🏗️", title: "Developers & Conveyancers", desc: "Fast due diligence on strata by-laws and liability exposure. Integrate via API for bulk property assessment." },
                  { icon: "💻", title: "PropTech Platforms", desc: "Embed strata intelligence into your product via our REST API. Bulk lookups, webhooks, and custom data fields available." },
                ].map((card) => (
                  <div key={card.title} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <span className="text-2xl">{card.icon}</span>
                    <p className="text-white font-semibold mt-3 mb-1.5">{card.title}</p>
                    <p className="text-slate-400 text-sm leading-relaxed">{card.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Data legitimacy */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex gap-4">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold">Verified, official records</p>
                <p className="text-slate-400 text-sm mt-1 leading-relaxed">
                  All by-law documents are sourced directly from licensed strata managers and official Australian state land registries. Data is extracted by AI trained on Australian property law — not scraped from third-party listings.
                </p>
              </div>
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
          <span className="text-slate-600 text-xs">© 2025 Strataset. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/about" className="text-slate-600 hover:text-slate-400 text-xs transition-colors">About</Link>
            <Link href="/contact" className="text-slate-600 hover:text-slate-400 text-xs transition-colors">Contact</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
