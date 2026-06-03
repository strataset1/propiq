"use client";

import { useState, useRef } from "react";
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

const AU_STATE_OPTIONS = [
  { value: "NSW", label: "New South Wales" },
  { value: "VIC", label: "Victoria" },
  { value: "QLD", label: "Queensland" },
  { value: "WA",  label: "Western Australia" },
  { value: "SA",  label: "South Australia" },
  { value: "TAS", label: "Tasmania" },
  { value: "ACT", label: "Australian Capital Territory" },
  { value: "NT",  label: "Northern Territory" },
];

const US_STATE_OPTIONS = [
  { value: "WA (Seattle)", label: "Washington (WA)"         },
  { value: "CA",           label: "California (CA)"          },
  { value: "FL",           label: "Florida (FL)"             },
  { value: "NY",           label: "New York (NY)"            },
  { value: "TX",           label: "Texas (TX)"               },
  { value: "AZ",           label: "Arizona (AZ)"             },
  { value: "CO",           label: "Colorado (CO)"            },
  { value: "IL",           label: "Illinois (IL)"            },
  { value: "GA",           label: "Georgia (GA)"             },
  { value: "NC",           label: "North Carolina (NC)"      },
  { value: "VA",           label: "Virginia (VA)"            },
  { value: "OR",           label: "Oregon (OR)"              },
  { value: "NV",           label: "Nevada (NV)"              },
  { value: "MA",           label: "Massachusetts (MA)"       },
  { value: "MD",           label: "Maryland (MD)"            },
  { value: "MI",           label: "Michigan (MI)"            },
  { value: "OH",           label: "Ohio (OH)"                },
  { value: "MN",           label: "Minnesota (MN)"           },
  { value: "PA",           label: "Pennsylvania (PA)"        },
  { value: "TN",           label: "Tennessee (TN)"           },
  { value: "AL",           label: "Alabama (AL)"             },
  { value: "AK",           label: "Alaska (AK)"              },
  { value: "AR",           label: "Arkansas (AR)"            },
  { value: "CT",           label: "Connecticut (CT)"         },
  { value: "DE",           label: "Delaware (DE)"            },
  { value: "HI",           label: "Hawaii (HI)"              },
  { value: "ID",           label: "Idaho (ID)"               },
  { value: "IN",           label: "Indiana (IN)"             },
  { value: "IA",           label: "Iowa (IA)"                },
  { value: "KS",           label: "Kansas (KS)"              },
  { value: "KY",           label: "Kentucky (KY)"            },
  { value: "LA",           label: "Louisiana (LA)"           },
  { value: "ME",           label: "Maine (ME)"               },
  { value: "MS",           label: "Mississippi (MS)"         },
  { value: "MO",           label: "Missouri (MO)"            },
  { value: "MT",           label: "Montana (MT)"             },
  { value: "NE",           label: "Nebraska (NE)"            },
  { value: "NH",           label: "New Hampshire (NH)"       },
  { value: "NJ",           label: "New Jersey (NJ)"          },
  { value: "NM",           label: "New Mexico (NM)"          },
  { value: "ND",           label: "North Dakota (ND)"        },
  { value: "OK",           label: "Oklahoma (OK)"            },
  { value: "RI",           label: "Rhode Island (RI)"        },
  { value: "SC",           label: "South Carolina (SC)"      },
  { value: "SD",           label: "South Dakota (SD)"        },
  { value: "UT",           label: "Utah (UT)"                },
  { value: "VT",           label: "Vermont (VT)"             },
  { value: "WV",           label: "West Virginia (WV)"       },
  { value: "WI",           label: "Wisconsin (WI)"           },
  { value: "WY",           label: "Wyoming (WY)"             },
];

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

function LocationRow({ location, crawled, docs: initialDocs, onToggle }: {
  location: CrawlLocation;
  crawled: CrawlRecord | undefined;
  docs: DocRecord[];
  onToggle: (id: string, enabled: boolean) => void;
}) {
  const [open, setOpen]         = useState(false);
  const [status, setStatus]     = useState<SuburbState>("idle");
  const [result, setResult]     = useState<{ docsFound: number; searched: number } | null>(null);
  const [docs, setDocs]         = useState<DocRecord[]>(initialDocs);
  const [errorMsg, setErrorMsg] = useState("");
  const [toggling, setToggling] = useState(false);

  async function handleCrawl(e: React.MouseEvent) {
    e.stopPropagation();
    setStatus("crawling"); setErrorMsg(""); setResult(null);
    const timeoutId = setTimeout(() => { setStatus("timeout"); setErrorMsg("Timed out — try again."); }, 55000);
    try {
      const res = await fetch("/api/admin/crawl/suburb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suburb: location.name, region: location.region }),
      });
      clearTimeout(timeoutId);
      const data = await res.json().catch(() => ({}));
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

  const isCrawled    = !!crawled;
  const displayCount = status === "done" && result ? result.docsFound : (crawled?.docs_found ?? 0);

  return (
    <div className={`border rounded-lg overflow-hidden ${location.enabled ? "border-slate-800" : "border-slate-800/50 opacity-60"}`}>
      <div className={`flex items-center justify-between px-4 py-2.5 cursor-pointer select-none ${isCrawled ? "bg-slate-900" : "bg-slate-900/40"}`}
        onClick={() => setOpen((o) => !o)}>
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
              </svg>Crawling…
            </span>
          )}
          {status === "done" && result && <span className="text-xs text-emerald-400">{result.docsFound} new</span>}
          {(status === "error" || status === "timeout") && (
            <span className="text-xs text-red-400 max-w-[180px] truncate" title={errorMsg}>{errorMsg}</span>
          )}
          {status === "idle" && isCrawled && <span className="text-xs font-mono text-emerald-400">{displayCount} doc{displayCount !== 1 ? "s" : ""}</span>}
          {status === "idle" && !isCrawled && <span className="text-xs text-slate-700 font-mono">pending</span>}
          <button onClick={handleToggle} disabled={toggling} title={location.enabled ? "Disable" : "Enable"}
            className={`text-xs px-2 py-0.5 rounded border transition-colors ${location.enabled ? "border-slate-700 text-slate-500 hover:text-red-400 hover:border-red-800" : "border-slate-700 text-slate-600 hover:text-emerald-400 hover:border-emerald-800"}`}>
            {location.enabled ? "Disable" : "Enable"}
          </button>
          <button onClick={handleCrawl} disabled={status === "crawling" || !location.enabled}
            className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 disabled:opacity-40 transition-colors">
            {isCrawled && status === "idle" ? "Re-crawl" : "Crawl"}
          </button>
        </div>
      </div>
      {status === "done" && result && (
        <div className="border-t border-emerald-900/50 bg-emerald-950/20 px-4 py-2">
          <p className="text-xs text-emerald-400">{result.searched} URLs searched — {result.docsFound} new doc{result.docsFound !== 1 ? "s" : ""} added.</p>
        </div>
      )}
      {(status === "error" || status === "timeout") && (
        <div className="border-t border-red-900/50 bg-red-950/30 px-4 py-2">
          <p className="text-xs text-red-400">{errorMsg}</p>
        </div>
      )}
      {open && (
        <div className="border-t border-slate-800 bg-slate-950 px-4 py-3 space-y-1.5">
          {docs.length === 0 && <p className="text-slate-600 text-xs">No documents scraped yet.</p>}
          {docs.map((doc) => (
            <DocRow key={doc.id} doc={doc} onDelete={(id) => setDocs((p) => p.filter((d) => d.id !== id))} />
          ))}
        </div>
      )}
    </div>
  );
}

export function SuburbList({ locations: initialLocations, crawledMap, docsBySuburb }: Props) {
  const [locations, setLocations] = useState<CrawlLocation[]>(initialLocations);

  // Import state panel
  const [importCountry, setImportCountry] = useState<"au" | "us">("au");
  const [importState, setImportState]     = useState("");
  const [importing, setImporting]         = useState(false);
  const [importMsg, setImportMsg]         = useState<{ text: string; ok: boolean } | null>(null);

  // Bulk crawl state
  const [bulkCrawling, setBulkCrawling] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{
    current: number; total: number; suburb: string; docsFound: number; errors: number;
  } | null>(null);
  const stopBulkRef = useRef(false);

  // Active tab
  const allTabs = [
    ...[ ...new Set(locations.filter((l) => l.region === "au").map((l) => l.state))].sort()
        .map((s) => ({ key: `au:${s}`, label: s, region: "au" as const, state: s })),
    ...[ ...new Set(locations.filter((l) => l.region === "us").map((l) => l.state))].sort()
        .map((s) => ({ key: `us:${s}`, label: `${s} (US)`, region: "us" as const, state: s })),
  ];
  const [activeTab, setActiveTab] = useState(allTabs[0]?.key ?? "");
  const currentTab    = allTabs.find((t) => t.key === activeTab) ?? allTabs[0];
  const tabLocations  = locations.filter((l) => currentTab && l.region === currentTab.region && l.state === currentTab.state);
  const pendingCount  = tabLocations.filter((l) => l.enabled && !crawledMap[l.name]).length;

  function handleToggle(id: string, enabled: boolean) {
    setLocations((prev) => prev.map((l) => l.id === id ? { ...l, enabled } : l));
  }

  async function handleImport() {
    if (!importState) return;
    setImporting(true); setImportMsg(null);
    const res = await fetch("/api/admin/crawl/locations/seed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: importState }),
    });
    const data = await res.json();
    if (res.ok) {
      const msg = data.newlyAdded > 0
        ? `${data.newlyAdded} new suburb${data.newlyAdded !== 1 ? "s" : ""} added${data.alreadyExisted > 0 ? `, ${data.alreadyExisted} already existed` : ""}.`
        : `All ${data.total} suburbs already existed — nothing new to add.`;
      setImportMsg({ ok: true, text: msg });
      if (data.newlyAdded > 0) setTimeout(() => window.location.reload(), 1500);
    } else {
      setImportMsg({ ok: false, text: data.error ?? "Import failed" });
    }
    setImporting(false);
  }

  const stateOptions = importCountry === "au" ? AU_STATE_OPTIONS : US_STATE_OPTIONS;

  async function handleBulkCrawl(recrawlAll = false) {
    const pending = recrawlAll
      ? tabLocations.filter((l) => l.enabled)
      : tabLocations.filter((l) => l.enabled && !crawledMap[l.name]);
    if (pending.length === 0) return;
    stopBulkRef.current = false;
    setBulkCrawling(true);
    setBulkProgress({ current: 0, total: pending.length, suburb: "", docsFound: 0, errors: 0 });

    let totalDocs = 0;
    let totalErrors = 0;

    for (let i = 0; i < pending.length; i++) {
      if (stopBulkRef.current) break;
      const loc = pending[i];
      setBulkProgress({ current: i + 1, total: pending.length, suburb: loc.display_name, docsFound: totalDocs, errors: totalErrors });

      try {
        const res = await fetch("/api/admin/crawl/suburb", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ suburb: loc.name, region: loc.region }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) totalDocs += data.docsFound ?? 0;
        else totalErrors++;
      } catch {
        totalErrors++;
      }
    }

    setBulkCrawling(false);
    setBulkProgress((p) => p ? { ...p, suburb: "Done", current: stopBulkRef.current ? p.current : pending.length } : null);
    stopBulkRef.current = false;
  }

  return (
    <div className="space-y-6">
      {/* ── Import a new state ── */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
        <p className="text-sm font-semibold text-white mb-1">Import suburbs for a state</p>
        <p className="text-xs text-slate-400 mb-4">Select a country and state to load all known suburbs into the crawler list. Then use the Crawl buttons below.</p>
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="text-xs text-slate-500 block mb-1.5">Country</label>
            <div className="flex gap-1">
              {(["au", "us"] as const).map((c) => (
                <button key={c} onClick={() => { setImportCountry(c); setImportState(""); }}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${importCountry === c ? "bg-amber-500/15 border-amber-500/40 text-amber-400" : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"}`}>
                  {c === "au" ? "🇦🇺 Australia" : "🇺🇸 USA"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1.5">State</label>
            <select value={importState} onChange={(e) => setImportState(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500 transition-colors min-w-[240px]">
              <option value="">Select a state…</option>
              {stateOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <button onClick={handleImport} disabled={!importState || importing}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-semibold text-sm px-5 py-1.5 rounded-lg transition-colors flex items-center gap-2">
            {importing ? (
              <><svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>Importing…</>
            ) : (
              <>Import all suburbs</>
            )}
          </button>
        </div>
        {importMsg && (
          <p className={`mt-3 text-xs ${importMsg.ok ? "text-emerald-400" : "text-red-400"}`}>{importMsg.text}</p>
        )}
      </div>

      {/* ── State tabs ── */}
      {allTabs.length > 0 && (
        <div>
          <div className="flex items-center gap-1 mb-4 flex-wrap">
            {allTabs.map((t) => {
              const tabLocs     = locations.filter((l) => l.region === t.region && l.state === t.state);
              const crawledCount = tabLocs.filter((l) => crawledMap[l.name]).length;
              return (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${activeTab === t.key ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}>
                  {t.label}
                  <span className="ml-1.5 text-xs font-mono opacity-60">{crawledCount}/{tabLocs.length}</span>
                </button>
              );
            })}

            {/* Bulk crawl controls */}
            <div className="ml-auto flex items-center gap-2">
              {bulkCrawling ? (
                <>
                  <span className="text-xs text-amber-400 flex items-center gap-1.5">
                    <svg className="animate-spin w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    {bulkProgress ? `${bulkProgress.current}/${bulkProgress.total} — ${bulkProgress.suburb}` : "Starting…"}
                  </span>
                  <button
                    onClick={() => { stopBulkRef.current = true; }}
                    className="text-xs px-2.5 py-1 rounded border border-red-800 text-red-400 hover:bg-red-950/30 transition-colors">
                    Stop
                  </button>
                </>
              ) : bulkProgress?.suburb === "Done" ? (
                <span className="text-xs text-emerald-400">
                  Done — {bulkProgress.docsFound} doc{bulkProgress.docsFound !== 1 ? "s" : ""} found
                  {bulkProgress.errors > 0 && `, ${bulkProgress.errors} error${bulkProgress.errors !== 1 ? "s" : ""}`}
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  {pendingCount > 0 && (
                    <button
                      onClick={() => handleBulkCrawl(false)}
                      className="text-xs px-3 py-1.5 rounded bg-indigo-700 hover:bg-indigo-600 text-white border border-indigo-600 transition-colors flex items-center gap-1.5">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Crawl pending ({pendingCount})
                    </button>
                  )}
                  {tabLocations.filter((l) => l.enabled).length > 0 && (
                    <button
                      onClick={() => handleBulkCrawl(true)}
                      className="text-xs px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white border border-slate-600 transition-colors flex items-center gap-1.5">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Recrawl all ({tabLocations.filter((l) => l.enabled).length})
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {bulkCrawling && bulkProgress && (
            <div className="mb-3">
              <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all duration-300"
                  style={{ width: `${Math.round((bulkProgress.current / bulkProgress.total) * 100)}%` }}
                />
              </div>
            </div>
          )}

          <div className="space-y-1 max-h-[520px] overflow-y-auto pr-1">
            {tabLocations.length === 0 && (
              <p className="text-slate-600 text-xs py-6 text-center">
                No suburbs in this state yet — use &ldquo;Import all suburbs&rdquo; above.
              </p>
            )}
            {tabLocations.map((loc) => (
              <LocationRow key={loc.id} location={loc} crawled={crawledMap[loc.name]}
                docs={docsBySuburb[loc.name] ?? []} onToggle={handleToggle} />
            ))}
          </div>
        </div>
      )}

      {allTabs.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
          <p className="text-slate-400 text-sm font-medium">No states imported yet</p>
          <p className="text-slate-600 text-xs mt-1">Use the panel above to import a state and populate its suburbs.</p>
        </div>
      )}
    </div>
  );
}
