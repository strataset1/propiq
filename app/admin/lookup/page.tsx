"use client";

import { useState, useEffect, useRef } from "react";
import { STATE_LAWS, detectState, type StateLawEntry } from "@/lib/state-laws";
import { searchProperties, lookupProperty, lookupByAddress } from "./actions";

type ByLawAttribute = {
  value: string | null;
  detail: string | null;
  legal: string | null;
};

type LiabilityField = {
  summary: string | null;
  confidence: number | null;
  responsible_party: string | null;
  source_phrase: string | null;
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

type Suggestion = {
  id: string;
  address_normalised: string | null;
};

function toTitleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

const VALUE_COLOURS: Record<string, string> = {
  yes: "text-emerald-400",
  no: "text-red-400",
  maybe: "text-amber-400",
};

function StateLawPanel({ law }: { law: StateLawEntry }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-lg border text-xs ${law.overridesHardNo ? "border-amber-700/60 bg-amber-950/30" : "border-slate-700 bg-slate-800/50"}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
      >
        <svg className="w-3.5 h-3.5 shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
        </svg>
        <span className={`flex-1 font-medium ${law.overridesHardNo ? "text-amber-300" : "text-slate-300"}`}>
          {law.takeaway}
        </span>
        <svg
          className={`w-3 h-3 text-slate-500 transition-transform shrink-0 ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-0 border-t border-slate-700/50">
          <pre className="whitespace-pre-wrap text-slate-400 leading-relaxed font-sans mt-2">{law.detail}</pre>
        </div>
      )}
    </div>
  );
}

function AttributeCard({ label, attr, stateLaw }: { label: string; attr: ByLawAttribute; stateLaw?: StateLawEntry }) {
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
      {stateLaw && <StateLawPanel law={stateLaw} />}
    </div>
  );
}

const PARTY_COLOURS: Record<string, string> = {
  lot_owner:    "text-amber-400",
  strata:       "text-sky-400",
  shared:       "text-purple-400",
  not_mentioned: "text-slate-600",
};

const PARTY_LABELS: Record<string, string> = {
  lot_owner:    "Lot owner",
  strata:       "Strata",
  shared:       "Shared",
  not_mentioned: "Not mentioned",
};

function LiabilityCard({ label, field }: { label: string; field: LiabilityField }) {
  const party = field.responsible_party ?? "not_mentioned";
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-slate-300 text-sm font-medium">{label}</p>
        <span className={`text-xs font-semibold ${PARTY_COLOURS[party] ?? "text-slate-400"}`}>
          {PARTY_LABELS[party] ?? party}
        </span>
      </div>
      {field.confidence !== null && (
        <p className="text-slate-600 text-xs">
          Confidence: <span className={field.confidence >= 0.7 ? "text-emerald-400" : field.confidence >= 0.5 ? "text-amber-400" : "text-red-400"}>
            {Math.round(field.confidence * 100)}%
          </span>
        </p>
      )}
      {field.summary && <p className="text-slate-400 text-xs leading-relaxed">{field.summary}</p>}
      {field.source_phrase && (
        <p className="text-slate-600 text-xs italic border-l-2 border-slate-700 pl-3 leading-relaxed">
          {field.source_phrase}
        </p>
      )}
      {!field.summary && !field.source_phrase && (
        <p className="text-slate-600 text-xs">Not mentioned in document</p>
      )}
    </div>
  );
}

export default function LookupPage() {
  const [address, setAddress] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (address.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const data = await searchProperties(address.trim());
      setSuggestions(data);
      setShowSuggestions(true);
    }, 250);
  }, [address]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSearch(propertyId?: string, normalisedAddress?: string) {
    const searchAddress = normalisedAddress ?? address.trim();
    if (!searchAddress) return;

    setShowSuggestions(false);
    setLoading(true);
    setError("");
    setResult(null);

    let property: { id: string; address_raw: string; address_normalised: string | null; status: string } | null = null;
    let bylaws: any = null;
    let liabilityRow: any = null;

    if (propertyId) {
      const res = await lookupProperty(propertyId);
      property = res.property;
      bylaws = res.bylaws;
      liabilityRow = res.liability;
    } else {
      const found = await lookupByAddress(searchAddress);
      if (found) {
        const res = await lookupProperty(found.id);
        property = res.property;
        bylaws = res.bylaws;
        liabilityRow = res.liability;
      }
    }

    if (!property) {
      setError("No property found matching that address.");
      setLoading(false);
      return;
    }

    if (!bylaws) {
      setError(`Property found (${property.address_raw}) but no processed documents yet.`);
      setLoading(false);
      return;
    }

    const mkField = (prefix: string): LiabilityField => ({
      summary: liabilityRow?.[`${prefix}_summary`] ?? null,
      confidence: liabilityRow?.[`${prefix}_confidence`] ?? null,
      responsible_party: liabilityRow?.[`${prefix}_responsible_party`] ?? null,
      source_phrase: liabilityRow?.[`${prefix}_source`] ?? null,
    });

    setResult({
      address_raw: property.address_raw,
      address_normalised: property.address_normalised ?? "",
      status: property.status,
      document_date: bylaws.document_date,
      confidence: bylaws.confidence,
      model_version: bylaws.model_version,
      processed_at: bylaws.processed_at,
      short_term_rental: { value: bylaws.short_term_rental_value, detail: bylaws.short_term_rental_detail, legal: bylaws.short_term_rental_legal },
      pets_allowed: { value: bylaws.pets_allowed_value, detail: bylaws.pets_allowed_detail, legal: bylaws.pets_allowed_legal },
      interior_renovations: { value: bylaws.interior_renovations_value, detail: bylaws.interior_renovations_detail, legal: bylaws.interior_renovations_legal },
      exterior_renovations: { value: bylaws.exterior_renovations_value, detail: bylaws.exterior_renovations_detail, legal: bylaws.exterior_renovations_legal },
      liability: liabilityRow ? {
        combustible_cladding:       mkField("combustible_cladding"),
        building_defect:            mkField("building_defect"),
        str_rules:                  mkField("str_rules"),
        maintenance_responsibility: mkField("maintenance_responsibility"),
        insurance_excess:           mkField("insurance_excess"),
        special_levy:               mkField("special_levy"),
        mixed_use_occupancy:        mkField("mixed_use_occupancy"),
        pets:                       mkField("pets"),
      } : null,
    });

    setLoading(false);
  }

  const detectedState = result ? detectState(result.address_normalised || result.address_raw) : null;
  const stateLaws = detectedState ? (STATE_LAWS[detectedState] ?? {}) : {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Property Lookup</h1>
        <p className="text-slate-400 text-sm mt-1">Preview what the API returns for any address</p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="flex gap-3">
        <div ref={wrapperRef} className="relative flex-1">
          <input
            value={address}
            onChange={(e) => { setAddress(e.target.value); setResult(null); setError(""); }}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="Search address e.g. Georgina St, Newtown"
            className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-4 py-2.5 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setAddress(toTitleCase(s.address_normalised ?? ""));
                    setShowSuggestions(false);
                    handleSearch(s.id, s.address_normalised ?? undefined);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  {toTitleCase(s.address_normalised ?? "")}
                </button>
              ))}
            </div>
          )}
        </div>
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
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-white font-semibold text-base">{result.address_raw}</p>
                <p className="text-slate-500 text-xs mt-0.5 font-mono">{toTitleCase(result.address_normalised)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {detectedState && (
                  <span className="text-xs px-2 py-1 rounded font-mono bg-slate-800 text-slate-400 uppercase">
                    {detectedState}
                  </span>
                )}
                <span className="text-xs px-2 py-1 rounded font-mono bg-emerald-950 text-emerald-400">
                  processed
                </span>
              </div>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AttributeCard label="Short-term rental" attr={result.short_term_rental} stateLaw={stateLaws.short_term_rental} />
            <AttributeCard label="Pets allowed" attr={result.pets_allowed} stateLaw={stateLaws.pets_allowed} />
            <AttributeCard label="Interior renovations" attr={result.interior_renovations} stateLaw={stateLaws.interior_renovations} />
            <AttributeCard label="Exterior renovations" attr={result.exterior_renovations} stateLaw={stateLaws.exterior_renovations} />
          </div>

          {/* Liability extraction fields */}
          {result.liability ? (
            <div className="space-y-3">
              <h2 className="text-white font-medium text-sm">Liability Extraction</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(
                  [
                    ["combustible_cladding",       "Combustible Cladding / Fire Risk"],
                    ["building_defect",            "Building Defect / Litigation"],
                    ["str_rules",                  "STR / Airbnb Rules"],
                    ["maintenance_responsibility", "Maintenance Responsibility"],
                    ["insurance_excess",           "Insurance Excess Recovery"],
                    ["special_levy",               "Special Levy / Capital Works"],
                    ["mixed_use_occupancy",        "Mixed-Use / Occupancy"],
                    ["pets",                       "Pets / Animals"],
                  ] as [keyof typeof result.liability, string][]
                ).map(([key, label]) => {
                  const f = result.liability![key];
                  return (
                    <LiabilityCard key={key} label={label} field={f} />
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
              <p className="text-slate-500 text-sm">Liability extraction not yet run for this property</p>
            </div>
          )}

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
