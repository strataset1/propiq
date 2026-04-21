"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ByLawAttribute = {
  value: string | null;
  detail: string | null;
  legal: string | null;
};

type LookupResult = {
  address_raw: string;
  address_normalised: string;
  status: string;
  document_date: string | null;
  confidence: number | null;
  model_version: string | null;
  processed_at: string | null;
  short_term_rental: ByLawAttribute;
  pets_allowed: ByLawAttribute;
  interior_renovations: ByLawAttribute;
  exterior_renovations: ByLawAttribute;
};

const VALUE_COLOURS: Record<string, string> = {
  yes: "text-emerald-400",
  no: "text-red-400",
  maybe: "text-amber-400",
};

function AttributeCard({ label, attr }: { label: string; attr: ByLawAttribute }) {
  const colour = VALUE_COLOURS[attr.value ?? ""] ?? "text-slate-400";
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-slate-300 text-sm font-medium">{label}</p>
        <span className={`text-sm font-semibold uppercase ${colour}`}>{attr.value ?? "—"}</span>
      </div>
      {attr.detail && <p className="text-slate-400 text-xs leading-relaxed">{attr.detail}</p>}
      {attr.legal && (
        <p className="text-slate-600 text-xs italic border-l-2 border-slate-700 pl-3 leading-relaxed">
          {attr.legal}
        </p>
      )}
    </div>
  );
}

export default function LookupPage() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState("");

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);

    const supabase = createClient();

    const { data: properties } = await supabase
      .from("properties")
      .select("id, address_raw, address_normalised, status")
      .ilike("address_raw", `%${address.trim()}%`)
      .limit(1);

    if (!properties || properties.length === 0) {
      setError("No property found matching that address.");
      setLoading(false);
      return;
    }

    const property = properties[0];

    const { data: bylaws } = await supabase
      .from("strata_bylaws")
      .select("*")
      .eq("property_id", property.id)
      .order("processed_at", { ascending: false })
      .limit(1)
      .single();

    if (!bylaws) {
      setError(`Property found (${property.address_raw}) but no processed documents yet.`);
      setLoading(false);
      return;
    }

    setResult({
      address_raw: property.address_raw,
      address_normalised: property.address_normalised,
      status: property.status,
      document_date: bylaws.document_date,
      confidence: bylaws.confidence,
      model_version: bylaws.model_version,
      processed_at: bylaws.processed_at,
      short_term_rental: { value: bylaws.short_term_rental_value, detail: bylaws.short_term_rental_detail, legal: bylaws.short_term_rental_legal },
      pets_allowed: { value: bylaws.pets_allowed_value, detail: bylaws.pets_allowed_detail, legal: bylaws.pets_allowed_legal },
      interior_renovations: { value: bylaws.interior_renovations_value, detail: bylaws.interior_renovations_detail, legal: bylaws.interior_renovations_legal },
      exterior_renovations: { value: bylaws.exterior_renovations_value, detail: bylaws.exterior_renovations_detail, legal: bylaws.exterior_renovations_legal },
    });

    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Property Lookup</h1>
        <p className="text-slate-400 text-sm mt-1">Preview what the API returns for any address</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3">
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Search address e.g. Georgina St, Newtown"
          className="flex-1 bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-4 py-2.5 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {result && (
        <div className="space-y-6">
          {/* Property header */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-white font-semibold text-base">{result.address_raw}</p>
                <p className="text-slate-500 text-xs mt-0.5 font-mono">{result.address_normalised}</p>
              </div>
              <span className="text-xs px-2 py-1 rounded font-mono shrink-0 bg-emerald-950 text-emerald-400">
                processed
              </span>
            </div>
            <div className="flex items-center gap-4 border-t border-slate-800 pt-3">
              {result.document_date ? (
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wide">By-law date</p>
                  <p className="text-white text-sm mt-0.5">{new Date(result.document_date).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
              ) : (
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wide">By-law date</p>
                  <p className="text-slate-600 text-sm mt-0.5">Not found in document</p>
                </div>
              )}
              {result.confidence !== null && (
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wide">Confidence</p>
                  <p className={`text-sm mt-0.5 font-medium ${result.confidence >= 0.7 ? "text-emerald-400" : result.confidence >= 0.5 ? "text-amber-400" : "text-red-400"}`}>
                    {Math.round(result.confidence * 100)}%
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Attributes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AttributeCard label="Short-term rental" attr={result.short_term_rental} />
            <AttributeCard label="Pets allowed" attr={result.pets_allowed} />
            <AttributeCard label="Interior renovations" attr={result.interior_renovations} />
            <AttributeCard label="Exterior renovations" attr={result.exterior_renovations} />
          </div>

          {result.processed_at && (
            <p className="text-slate-600 text-xs">
              Processed {new Date(result.processed_at).toLocaleString("en-AU")} · {result.model_version}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
