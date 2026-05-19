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

const VALUE_LABELS: Record<string, { label: string; color: string }> = {
  yes: { label: "Allowed", color: "text-emerald-400" },
  no: { label: "Not allowed", color: "text-red-400" },
  maybe: { label: "Conditional", color: "text-amber-400" },
};

function ValueBadge({ value, field }: { value: string | null; field: string }) {
  if (!value) return null;
  const v = VALUE_LABELS[value] ?? { label: value, color: "text-slate-400" };
  return (
    <span className="text-xs">
      <span className="text-slate-500">{field}: </span>
      <span className={v.color}>{v.label}</span>
    </span>
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
      const { data } = await supabase
        .from("properties")
        .select("id, address_raw")
        .or(`address_normalised.ilike.%${query}%,address_raw.ilike.%${query}%`)
        .eq("status", "ready")
        .limit(6);
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
      <nav className="border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-white font-semibold tracking-tight">Strataset</span>
          <div className="flex items-center gap-3">
            <a
              href="mailto:sales@strataset.com.au"
              className="text-slate-400 hover:text-white text-sm transition-colors"
            >
              Contact Sales
            </a>
            <Link
              href="/dashboard"
              className="bg-slate-800 hover:bg-slate-700 text-white text-sm px-4 py-1.5 rounded-lg transition-colors"
            >
              Business Login →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-20 pb-12 w-full">
        <h1 className="text-3xl font-bold text-white mb-2">
          Find by-laws for any strata building in Australia
        </h1>
        <p className="text-slate-400 mb-8">
          Search by address to see what&apos;s allowed — pets, short-term rental, renovations — and download the original by-law document.
        </p>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by address e.g. 129 Harrington St, Sydney"
            className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3.5 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden z-10 shadow-xl">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => selectProperty(s)}
                  className="w-full text-left px-4 py-3 text-sm text-white hover:bg-slate-800 transition-colors border-b border-slate-800 last:border-0"
                >
                  {s.address_raw}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-4xl mx-auto px-6 w-full pb-16">
        {loading && (
          <div className="text-slate-500 text-sm py-8 text-center">Loading…</div>
        )}

        {result && !loading && (
          <div className="space-y-4">
            {/* By-law summary */}
            {result.bylaws && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <p className="text-white font-medium mb-3">{result.address}</p>
                <div className="flex flex-wrap gap-4">
                  <ValueBadge value={result.bylaws.pets_allowed_value} field="Pets" />
                  <ValueBadge value={result.bylaws.short_term_rental_value} field="Short-term rental" />
                  <ValueBadge value={result.bylaws.interior_renovations_value} field="Renovations" />
                </div>
              </div>
            )}

            {/* Document list */}
            {result.documents.length > 0 ? (
              result.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-white text-sm font-medium">{doc.label}</p>
                    <p className="text-slate-500 text-xs mt-0.5 capitalize">
                      {doc.type.replace(/_/g, " ")}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCheckout(doc.id)}
                    disabled={checkoutLoading === doc.id}
                    className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold text-sm px-5 py-2 rounded-lg transition-colors shrink-0"
                  >
                    {checkoutLoading === doc.id ? "Loading…" : "Download — $9.95"}
                  </button>
                </div>
              ))
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
                <p className="text-slate-400 text-sm">
                  No documents available for this property yet.
                </p>
              </div>
            )}
          </div>
        )}

        {!result && !loading && (
          <div className="text-center py-16">
            <p className="text-slate-600 text-sm">Enter an address above to get started</p>
          </div>
        )}
      </div>

      {/* Enterprise footer CTA */}
      <div className="mt-auto border-t border-slate-800 bg-slate-900">
        <div className="max-w-4xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="text-white font-semibold">Using this for your business?</p>
            <p className="text-slate-400 text-sm mt-1">
              Enterprise access gives you API integration, bulk lookups, and custom data fields.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="mailto:sales@strataset.com.au"
              className="border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white text-sm px-5 py-2 rounded-lg transition-colors"
            >
              Contact Sales
            </a>
            <Link
              href="/dashboard"
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm px-5 py-2 rounded-lg transition-colors"
            >
              Business Login →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
