"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CrawlLocation } from "@/lib/crawler/suburbs-db";

type CrawlRecord = { suburb: string; docs_found: number; searched_at: string };
type DocRecord   = { id: string; label: string; source_url: string | null; processed_at: string | null; crawl_suburb: string | null };
type SuburbState = "idle" | "crawling" | "done" | "error" | "timeout";

type Props = {
  locations: CrawlLocation[];
  crawledMap: Record<string, CrawlRecord>;
  docsBySuburb: Record<string, DocRecord[]>;
};

const AU_STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"] as const;
const US_STATES = ["WA", "CA", "NY", "FL", "TX"] as const;

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg className={`w-3.5 h-3.5 text-slate-500 transition-transform shrink-0 ${open ? "rotate-90" : ""}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function DocRow({ doc, onDelete }: { doc: DocRecord; onDelete: (id: string) => void }) {
  const [deleting, setDeleting] = useState(false);
  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("documents").delete().eq("id", doc.id);
    onDelete(doc.id);
  }
  return (
    <div className="flex items-center justify-between gap-4 group">
      <div className="min-w-0">
        <p className="text-xs text-slate-300 truncate">{doc.label}</p>
        {doc.source_url && <p className="text-xs text-slate-600 truncate">{doc.source_url}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-xs font-mono ${doc.processed_at ? "text-emerald-400" : "text-amber-400"}`}>
          {doc.processed_at ? "processed" : "queued"}
        </span>
        <button onClick={handleDelete} disabled={deleting}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-red-400 disabled:opacity-30">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function LocationRow({
  location, crawled, docs: initialDocs, onToggle,
}: {
  location: CrawlLocation;
  crawled: CrawlRecord | undefined;
  docs: DocRecord[];
  onToggle: (id: string, enabled: boolean) => void;
}) {
  const [open, setOpen]     = useState(false);
  const [status, setStatus] = useState<SuburbState>("idle");
  const [result, setResult] = useState<{ docsFound: number; searched: number } | null>(null);
  const [docs, setDocs]     = useState<DocRecord[]>(initialDocs);
  const [errorMsg, setErrorMsg] = useState("");
  const [toggling, setToggling] = useState(false);

  async function handleCrawl(e: React.MouseEvent) {
    e.stopPropagation();
    setStatus("crawling"); setErrorMsg(""); setResult(null);
    const timeoutId = setTimeout(() => {
      setStatus("timeout");
      setErrorMsg("Timed out — Vercel limit reached. Try again.");
    }, 55000);
    try {
      const res = await fetch("/api/admin/crawl/suburb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suburb: location.name, region: location.region }),
      });
      clearTimeout(timeoutId);
      let data: { ok?: boolean; docsFound?: number; searched?: number; error?: string } = {};
      try { data = await res.json(); } catch {
        setStatus("error"); setErrorMsg(`Server returned non-JSON (${res.status})`); return;
      }
      if (!res.ok) { setStatus("error"); setErrorMsg(data.error ?? `Error ${res.status}`); return; }
      setResult({ docsFound: data.docsFound ?? 0, searched: data.searched ?? 0 });
      setStatus("done"); setOpen(true);
      const supabase = createClient();
      const { data: freshDocs } = await supabase.from("documents")
        .select("id, label, source_url, processed_at, crawl_suburb")
        .eq("crawl_suburb", location.name).order("created_at", { ascending: false });
      if (freshDocs) setDocs(freshDocs);
    } catch (err) {
      clearTimeout(timeoutId); setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Request failed");
    }
  }

  async function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();
    setToggling(true);
    await fetch("/api/admin/crawl/locations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: location.id, enabled: !location.enabled }),
    });
    onToggle(location.id, !location.enabled);
    setToggling(false);
  }

  const isCrawled = !!crawled;
  const docCount  = crawled?.docs_found ?? 0;
  const displayCount = status === "done" && result ? result.docsFound : docCount;

  return (
    <div className={`border rounded-lg overflow-hidden ${location.enabled ? "border-slate-800" : "border-slate-800/50 opacity-60"}`}>
      <div
        className={`flex items-center justify-between px-4 py-2.5 cursor-pointer select-none ${isCrawled ? "bg-slate-900" : "bg-slate-900/40"}`}
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <ChevronIcon open={open} />
          <span className={`text-sm ${isCrawled ? "text-white" : "text-slate-500"}`}>{location.display_name}</span>
          {location.postcode && <span className="text-xs text-slate-600 font-mono">{location.postcode}</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          {status === "crawling" && (
            <span className="flex items-center gap-1.5 text-xs text-amber-400">
              <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Crawling…
            </span>
          )}
          {status === "done" && result && (
            <span className="text-xs text-emerald-400">{result.docsFound} new</span>
          )}
          {(status === "error" || status === "timeout") && (
            <span className="text-xs text-red-400 max-w-[180px] truncate" title={errorMsg}>{errorMsg}</span>
          )}
          {status === "idle" && isCrawled && (
            <span className="text-xs font-mono text-emerald-400">{displayCount} doc{displayCount !== 1 ? "s" : ""}</span>
          )}
          {status === "idle" && !isCrawled && (
            <span className="text-xs text-slate-700 font-mono">pending</span>
          )}
          <button onClick={handleToggle} disabled={toggling}
            title={location.enabled ? "Disable" : "Enable"}
            className={`text-xs px-2 py-0.5 rounded border transition-colors ${location.enabled ? "border-slate-700 text-slate-500 hover:text-red-400 hover:border-red-800" : "border-slate-700 text-slate-600 hover:text-emerald-400 hover:border-emerald-800"}`}>
            {location.enabled ? "Disable" : "Enable"}
          </button>
          <button onClick={handleCrawl} disabled={status === "crawling" || !location.enabled}
            className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {isCrawled && status === "idle" ? "Re-crawl" : "Crawl"}
          </button>
        </div>
      </div>
      {(status === "error" || status === "timeout") && (
        <div className="border-t border-red-900/50 bg-red-950/30 px-4 py-2">
          <p className="text-xs text-red-400">{errorMsg}</p>
        </div>
      )}
      {status === "done" && result && (
        <div className="border-t border-emerald-900/50 bg-emerald-950/20 px-4 py-2">
          <p className="text-xs text-emerald-400">
            Complete — {result.searched} URLs searched, {result.docsFound} new doc{result.docsFound !== 1 ? "s" : ""} added.
          </p>
        </div>
      )}
      {open && (
        <div className="border-t border-slate-800 bg-slate-950 px-4 py-3 space-y-1.5">
          {docs.length === 0 && <p className="text-slate-600 text-xs">No documents scraped yet.</p>}
          {docs.map((doc) => (
            <DocRow key={doc.id} doc={doc} onDelete={(id) => setDocs((prev) => prev.filter((d) => d.id !== id))} />
          ))}
        </div>
      )}
    </div>
  );
}

function AddLocationForm({ onAdded }: { onAdded: (loc: CrawlLocation) => void }) {
  const [open, setOpen]           = useState(false);
  const [displayName, setDisplay] = useState("");
  const [state, setState]         = useState("NSW");
  const [region, setRegion]       = useState<"au" | "us">("au");
  const [postcode, setPostcode]   = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await fetch("/api/admin/crawl/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: displayName, state, region, postcode: postcode || undefined }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed"); setLoading(false); return; }
    onAdded({
      id: crypto.randomUUID(),
      name: `${displayName} ${state}`,
      display_name: displayName,
      state,
      region,
      postcode: postcode || null,
      enabled: true,
    });
    setDisplay(""); setPostcode(""); setOpen(false); setLoading(false);
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white border border-dashed border-slate-700 hover:border-slate-500 rounded-lg px-3 py-2 transition-colors w-full justify-center">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Add location
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-700 rounded-lg p-4 space-y-3">
      <p className="text-sm font-medium text-white">Add new location</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500 block mb-1">Display name</label>
          <input value={displayName} onChange={(e) => setDisplay(e.target.value)} required
            placeholder="Bondi Beach"
            className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-500" />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Postcode / ZIP</label>
          <input value={postcode} onChange={(e) => setPostcode(e.target.value)}
            placeholder="2026"
            className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-500" />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Country</label>
          <select value={region} onChange={(e) => { setRegion(e.target.value as "au" | "us"); setState(e.target.value === "us" ? "WA" : "NSW"); }}
            className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-500">
            <option value="au">🇦🇺 Australia</option>
            <option value="us">🇺🇸 USA</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">State</label>
          <select value={state} onChange={(e) => setState(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-500">
            {(region === "au" ? AU_STATES : US_STATES).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => setOpen(false)}
          className="text-xs text-slate-500 hover:text-white px-3 py-1.5 rounded transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={loading}
          className="text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-4 py-1.5 rounded disabled:opacity-50 transition-colors">
          {loading ? "Adding…" : "Add location"}
        </button>
      </div>
    </form>
  );
}

export function SuburbList({ locations: initialLocations, crawledMap, docsBySuburb }: Props) {
  const [locations, setLocations] = useState<CrawlLocation[]>(initialLocations);
  const [seeding, setSeeding]     = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  // Group by region→state
  const auStates  = [...new Set(locations.filter((l) => l.region === "au").map((l) => l.state))].sort();
  const usStates  = [...new Set(locations.filter((l) => l.region === "us").map((l) => l.state))].sort();
  const allTabs   = [...auStates.map((s) => ({ key: `au:${s}`, label: s, region: "au" as const, state: s })),
                     ...usStates.map((s) => ({ key: `us:${s}`, label: `${s} (US)`, region: "us" as const, state: s }))];

  const [activeTab, setActiveTab] = useState(allTabs[0]?.key ?? "");

  const currentTab  = allTabs.find((t) => t.key === activeTab) ?? allTabs[0];
  const tabLocations = locations.filter((l) => currentTab && l.region === currentTab.region && l.state === currentTab.state);

  function handleToggle(id: string, enabled: boolean) {
    setLocations((prev) => prev.map((l) => l.id === id ? { ...l, enabled } : l));
  }

  function handleAdded(loc: CrawlLocation) {
    setLocations((prev) => [...prev, loc]);
    setActiveTab(`${loc.region}:${loc.state}`);
  }

  async function handleSeed() {
    setSeeding(true); setSeedResult(null);
    const res = await fetch("/api/admin/crawl/locations/seed", { method: "POST" });
    const data = await res.json();
    setSeedResult(res.ok ? `Seeded — ${data.total} locations processed.` : `Error: ${data.error}`);
    setSeeding(false);
    if (res.ok) window.location.reload();
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-4 flex-wrap">
        {allTabs.map((t) => {
          const tabLocs = locations.filter((l) => l.region === t.region && l.state === t.state);
          const crawledCount = tabLocs.filter((l) => crawledMap[l.name]).length;
          return (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${activeTab === t.key ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}>
              {t.label}
              <span className="ml-1.5 text-xs font-mono opacity-60">{crawledCount}/{tabLocs.length}</span>
            </button>
          );
        })}

        {/* Seed button (shown when table might be empty) */}
        {locations.length < 10 && (
          <button onClick={handleSeed} disabled={seeding}
            className="ml-auto text-xs px-3 py-1.5 rounded border border-amber-700/60 text-amber-400 hover:bg-amber-950/30 disabled:opacity-50 transition-colors">
            {seeding ? "Seeding…" : "Seed from built-in list"}
          </button>
        )}
      </div>

      {seedResult && (
        <div className={`mb-4 text-xs px-3 py-2 rounded border ${seedResult.startsWith("Error") ? "border-red-800 text-red-400 bg-red-950/20" : "border-emerald-800 text-emerald-400 bg-emerald-950/20"}`}>
          {seedResult}
        </div>
      )}

      <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1 mb-4">
        {tabLocations.map((loc) => (
          <LocationRow key={loc.id} location={loc} crawled={crawledMap[loc.name]}
            docs={docsBySuburb[loc.name] ?? []} onToggle={handleToggle} />
        ))}
        {tabLocations.length === 0 && (
          <p className="text-slate-600 text-xs py-4 text-center">No locations in this state yet.</p>
        )}
      </div>

      <AddLocationForm onAdded={handleAdded} />
    </div>
  );
}
