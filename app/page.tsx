"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Suggestion = { id: string; address_raw: string };

type ByLawResult = {
  propertyId: string;
  address: string;
  documents: { id: string; label: string; type: string }[];
  bylaws: {
    pets_allowed_value: string | null;
    short_term_rental_value: string | null;
    interior_renovations_value: string | null;
    confidence: number | null;
  } | null;
};

const VALUE_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  yes:   { label: "Allowed",      bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400" },
  no:    { label: "Not allowed",  bg: "bg-red-500/10",     text: "text-red-400",     dot: "bg-red-400"     },
  maybe: { label: "Conditional",  bg: "bg-amber-500/10",   text: "text-amber-400",   dot: "bg-amber-400"   },
};

const FIELD_ICONS: Record<string, string> = {
  "Pets": "🐾",
  "Short-term rental": "🏠",
  "Renovations": "🔨",
};

function ValuePill({ value, field }: { value: string | null; field: string }) {
  if (!value) return null;
  const cfg = VALUE_CONFIG[value] ?? { label: value, bg: "bg-slate-800", text: "text-slate-400", dot: "bg-slate-400" };
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${cfg.bg}`}>
      <span className="text-base">{FIELD_ICONS[field] ?? "•"}</span>
      <div>
        <p className="text-slate-400 text-xs">{field}</p>
        <p className={`text-sm font-medium ${cfg.text}`}>{cfg.label}</p>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 animate-pulse">
      <div className="h-4 bg-slate-800 rounded w-2/3 mb-3" />
      <div className="flex gap-3">
        <div className="h-12 w-28 bg-slate-800 rounded-lg" />
        <div className="h-12 w-28 bg-slate-800 rounded-lg" />
        <div className="h-12 w-28 bg-slate-800 rounded-lg" />
      </div>
    </div>
  );
}

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [result, setResult] = useState<ByLawResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 3) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      const isPostcode = /^\d{4}$/.test(query.trim());
      const { data } = await supabase
        .from("properties")
        .select("id, address_raw")
        .or(`address_normalised.ilike.%${query}%,address_raw.ilike.%${query}%`)
        .eq("status", "ready")
        .limit(isPostcode ? 20 : 6);
      setSuggestions(data ?? []);
    }, 250);
  }, [query]);

  async function selectProperty(p: Suggestion) {
    setSuggestions([]);
    setQuery(p.address_raw);
    setLoading(true);
    setResult(null);

    const [{ data: bylaws }, { data: docs }] = await Promise.all([
      supabase
        .from("strata_bylaws")
        .select("pets_allowed_value, short_term_rental_value, interior_renovations_value, confidence")
        .eq("property_id", p.id)
        .order("processed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("documents")
        .select("id, label, type")
        .eq("property_id", p.id)
        .not("processed_at", "is", null)
        .limit(10),
    ]);

    setResult({
      propertyId: p.id,
      address: p.address_raw,
      documents: docs ?? [],
      bylaws: bylaws ?? null,
    });
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

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Nav */}
      <nav className="border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-white font-bold tracking-tight text-lg">Strataset</span>
          <div className="flex items-center gap-2">
            <a
              href="mailto:sales@strataset.com.au"
              className="text-slate-400 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Contact Sales
            </a>
            <Link
              href="/login"
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-sm px-4 py-1.5 rounded-lg transition-colors font-medium"
            >
              Business Login →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative overflow-hidden">
        {/* Subtle glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-amber-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-6 pt-24 pb-16 w-full">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1 mb-6">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
              <span className="text-amber-400 text-xs font-medium">Australia&apos;s strata by-law database</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-4">
              Know the rules before<br />
              <span className="text-amber-400">you sign the lease.</span>
            </h1>
            <p className="text-slate-400 text-lg mb-10 leading-relaxed">
              Search any strata building to instantly see what&apos;s allowed — pets, short-term rentals, renovations — and download the original by-law document.
            </p>

            {/* Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by address or postcode e.g. 2000, 129 Harrington St"
                className="w-full bg-slate-900 border border-slate-700 hover:border-slate-600 focus:border-amber-500 text-white rounded-xl pl-10 pr-4 py-4 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-colors shadow-lg"
              />
              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden z-10 shadow-2xl">
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => selectProperty(s)}
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

            {/* Trust badges */}
            {!result && !loading && (
              <div className="flex flex-wrap gap-4 mt-6">
                {[
                  { icon: "⚡", text: "Instant results" },
                  { icon: "📄", text: "Original PDF included" },
                  { icon: "🏢", text: "NSW, VIC & more" },
                ].map((b) => (
                  <span key={b.text} className="flex items-center gap-1.5 text-slate-500 text-xs">
                    <span>{b.icon}</span>
                    {b.text}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-5xl mx-auto px-6 w-full pb-20">
        {loading && (
          <div className="space-y-4 max-w-2xl">
            <SkeletonCard />
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-slate-800 rounded w-48" />
                  <div className="h-3 bg-slate-800 rounded w-24" />
                </div>
                <div className="h-9 w-36 bg-slate-800 rounded-lg" />
              </div>
            </div>
          </div>
        )}

        {result && !loading && (
          <div className="space-y-4 max-w-2xl">
            {/* Address heading */}
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-slate-400 text-sm">{result.address}</p>
            </div>

            {/* By-law summary */}
            {result.bylaws && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">By-law summary</p>
                <div className="grid grid-cols-3 gap-3">
                  <ValuePill value={result.bylaws.pets_allowed_value} field="Pets" />
                  <ValuePill value={result.bylaws.short_term_rental_value} field="Short-term rental" />
                  <ValuePill value={result.bylaws.interior_renovations_value} field="Renovations" />
                </div>
              </div>
            )}

            {/* Document list */}
            {result.documents.length > 0 ? (
              <>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider pt-2">Documents</p>
                {result.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 flex items-center justify-between gap-4 transition-colors"
                  >
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
                        <>
                          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Loading…
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download — $9.95
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
                <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-slate-400 text-sm font-medium">No documents available yet</p>
                <p className="text-slate-600 text-xs mt-1">We&apos;re still indexing this building</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Enterprise footer CTA */}
      <div className="mt-auto border-t border-slate-800 bg-slate-900/50">
        <div className="max-w-5xl mx-auto px-6 py-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="text-white font-semibold text-lg">Built for property professionals</p>
            <p className="text-slate-400 text-sm mt-1 max-w-md">
              API access, bulk lookups, webhook delivery, and custom data fields for your platform.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="mailto:sales@strataset.com.au"
              className="border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white text-sm px-5 py-2.5 rounded-lg transition-colors font-medium"
            >
              Contact Sales
            </a>
            <Link
              href="/login"
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              Business Login →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
