"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { searchAddresses, getStats } from "./actions";

type Suggestion = { id: string; address_raw: string };

const EXAMPLE_SEARCHES = [
  "66 Bowman Street, Pyrmont",
  "41 Refinery Drive",
  "Try a postcode: 2009",
];

const BROWSE: Record<string, { label: string; query: string }[]> = {
  NSW: [
    { label: "Sydney CBD",        query: "Sydney NSW 2000" },
    { label: "Pyrmont",           query: "Pyrmont NSW 2009" },
    { label: "Inner West",        query: "Newtown NSW"      },
    { label: "Eastern Suburbs",   query: "Bondi NSW"        },
    { label: "North Shore",       query: "North Sydney NSW" },
    { label: "Northern Beaches",  query: "Manly NSW"        },
    { label: "Parramatta",        query: "Parramatta NSW"   },
    { label: "Chatswood",         query: "Chatswood NSW"    },
  ],
  VIC: [
    { label: "Melbourne CBD",     query: "Melbourne VIC 3000" },
    { label: "Southbank",         query: "Southbank VIC"      },
    { label: "South Yarra",       query: "South Yarra VIC"    },
    { label: "Richmond",          query: "Richmond VIC"       },
    { label: "St Kilda",          query: "St Kilda VIC"       },
    { label: "Fitzroy",           query: "Fitzroy VIC"        },
  ],
  QLD: [
    { label: "Brisbane CBD",      query: "Brisbane QLD 4000" },
    { label: "Gold Coast",        query: "Surfers Paradise QLD" },
    { label: "Sunshine Coast",    query: "Maroochydore QLD"  },
    { label: "South Brisbane",    query: "South Brisbane QLD" },
  ],
  WA: [
    { label: "Perth CBD",         query: "Perth WA 6000"     },
    { label: "Fremantle",         query: "Fremantle WA"      },
    { label: "Subiaco",           query: "Subiaco WA"        },
  ],
  SA: [
    { label: "Adelaide CBD",      query: "Adelaide SA 5000"  },
    { label: "Glenelg",           query: "Glenelg SA"        },
    { label: "North Adelaide",    query: "North Adelaide SA" },
  ],
};

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
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [focused, setFocused] = useState(false);
  const [stats, setStats] = useState<{ propertyCount: number; documentCount: number } | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
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

  function selectProperty(p: Suggestion) {
    setSuggestions([]);
    setFocused(false);
    router.push(`/property/${p.id}`);
  }

  async function browseArea(areaQuery: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQuery(areaQuery);
    setNotFound(false);
    setSuggestions([]);
    setFocused(true);
    const data = await searchAddresses(areaQuery);
    setSuggestions(data);
    setNotFound(data.length === 0);
    inputRef.current?.focus();
  }

  function toggleState(state: string) {
    setSelectedState((s) => (s === state ? null : state));
  }

  const showDropdown = focused && (suggestions.length > 0 || (notFound && query.length >= 3) || (query.length === 0));

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Nav */}
      <nav className="border-b border-slate-800/60 bg-slate-950/90 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-white font-bold tracking-tight text-lg">ByLawsIndex.com</span>
          <div className="flex items-center gap-2">
            <Link href="/" className="text-slate-400 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors">Home</Link>
            <Link href="/about" className="text-slate-400 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors">About</Link>
            <Link href="/contact" className="text-slate-400 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors">Contact</Link>
            <Link href="/login" className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-sm px-4 py-1.5 rounded-lg transition-colors font-medium">API Access →</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
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

          {/* Browse by state */}
          <div className="mt-4 space-y-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-600 text-xs">Browse by state:</span>
              {["ALL", ...Object.keys(BROWSE)].map((state) => (
                <button
                  key={state}
                  onClick={() => toggleState(state)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                    selectedState === state
                      ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                      : "bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500"
                  }`}
                >
                  {state}
                </button>
              ))}
            </div>

            {selectedState && (
              <div className="flex items-center gap-2 flex-wrap pl-0.5">
                {(selectedState === "ALL" ? Object.values(BROWSE).flat() : BROWSE[selectedState]).map((area) => (
                  <button
                    key={area.label}
                    onClick={() => browseArea(area.query)}
                    className="text-xs px-3 py-1.5 rounded-full border border-slate-700/70 bg-slate-900 text-slate-400 hover:text-white hover:border-amber-500/40 hover:bg-amber-500/10 transition-colors"
                  >
                    {area.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <p className="text-slate-500 text-sm mt-3">
            Instant results · Original PDF included · NSW, VIC &amp; more
          </p>

          {stats && (
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

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 pb-20 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-4">
          <div className="space-y-14">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-6">How it works</p>
              <div className="space-y-6">
                {[
                  { step: "1", title: "Search an address or postcode", desc: "Enter any strata property address, suburb, or postcode — all matching properties appear instantly." },
                  { step: "2", title: "Click a property", desc: "Select the address you need. You'll see the categories covered in its by-laws." },
                  { step: "3", title: "Unlock & download", desc: "Pay $9.95 to unlock the full by-law summary and download the original PDF document." },
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
      </div>

      {/* Footer */}
      <div className="mt-auto border-t border-slate-800 bg-slate-900/50">
        <div className="max-w-5xl mx-auto px-6 py-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="text-white font-semibold text-lg">Built for property professionals</p>
            <p className="text-slate-400 text-sm mt-1 max-w-md">API access, bulk lookups, webhook delivery, and custom data fields for your platform.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/contact" className="border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white text-sm px-5 py-2.5 rounded-lg transition-colors font-medium">Get in touch</Link>
            <Link href="/login" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors">API Access →</Link>
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
