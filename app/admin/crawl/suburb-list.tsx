"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type CrawlRecord = {
  suburb: string;
  docs_found: number;
  searched_at: string;
};

type DocRecord = {
  id: string;
  label: string;
  source_url: string | null;
  processed_at: string | null;
  crawl_suburb: string | null;
};

type SuburbState = "idle" | "crawling" | "done" | "error" | "timeout";

type Props = {
  nswSuburbs: string[];
  vicSuburbs: string[];
  crawledMap: Record<string, CrawlRecord>;
  docsBySuburb: Record<string, DocRecord[]>;
};

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-3.5 h-3.5 text-slate-500 transition-transform shrink-0 ${open ? "rotate-90" : ""}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
    >
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
        {doc.source_url && (
          <p className="text-xs text-slate-600 truncate">{doc.source_url}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-xs font-mono ${doc.processed_at ? "text-emerald-400" : "text-amber-400"}`}>
          {doc.processed_at ? "processed" : "queued"}
        </span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-red-400 disabled:opacity-30"
          title="Remove document"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function SuburbRow({
  suburb,
  crawled,
  docs: initialDocs,
}: {
  suburb: string;
  crawled: CrawlRecord | undefined;
  docs: DocRecord[];
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<SuburbState>("idle");
  const [result, setResult] = useState<{ docsFound: number; searched: number } | null>(null);
  const [docs, setDocs] = useState<DocRecord[]>(initialDocs);
  const [errorMsg, setErrorMsg] = useState("");

  const isCrawled = !!crawled;
  const docCount = crawled?.docs_found ?? 0;

  async function handleCrawl(e: React.MouseEvent) {
    e.stopPropagation();
    setStatus("crawling");
    setErrorMsg("");
    setResult(null);

    const timeoutId = setTimeout(() => {
      setStatus("timeout");
      setErrorMsg("Timed out after 55s — Vercel limit reached. Try again or run from terminal.");
    }, 55000);

    try {
      const res = await fetch("/api/admin/crawl/suburb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suburb }),
      });
      clearTimeout(timeoutId);

      let data: { ok?: boolean; docsFound?: number; searched?: number; error?: string } = {};
      try {
        data = await res.json();
      } catch {
        setStatus("error");
        setErrorMsg(`Server returned non-JSON (status ${res.status}) — check Vercel logs`);
        return;
      }

      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data.error ?? `Server error ${res.status}`);
        return;
      }

      setResult({ docsFound: data.docsFound ?? 0, searched: data.searched ?? 0 });
      setStatus("done");
      setOpen(true);

      // Refresh doc list for this suburb
      const supabase = createClient();
      const { data: freshDocs } = await supabase
        .from("documents")
        .select("id, label, source_url, processed_at, crawl_suburb")
        .eq("crawl_suburb", suburb)
        .order("created_at", { ascending: false });
      if (freshDocs) setDocs(freshDocs);
    } catch (err) {
      clearTimeout(timeoutId);
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Request failed — check your connection.");
    }
  }

  const displayCount = status === "done" && result ? result.docsFound : docCount;

  return (
    <div className="border border-slate-800 rounded-lg overflow-hidden">
      <div
        className={`flex items-center justify-between px-4 py-2.5 cursor-pointer select-none ${
          isCrawled ? "bg-slate-900" : "bg-slate-900/40"
        }`}
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <ChevronIcon open={open} />
          <span className={`text-sm ${isCrawled ? "text-white" : "text-slate-500"}`}>{suburb}</span>
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-4">
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
            <span className="text-xs text-emerald-400">{result.docsFound} new doc{result.docsFound !== 1 ? "s" : ""}</span>
          )}
          {(status === "error" || status === "timeout") && (
            <span className="text-xs text-red-400 max-w-[200px] truncate" title={errorMsg}>{errorMsg}</span>
          )}
          {status === "idle" && isCrawled && (
            <span className="text-xs font-mono text-emerald-400">{displayCount} doc{displayCount !== 1 ? "s" : ""}</span>
          )}
          {status === "idle" && !isCrawled && (
            <span className="text-xs text-slate-700 font-mono">pending</span>
          )}

          <button
            onClick={handleCrawl}
            disabled={status === "crawling"}
            className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
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
            Crawl complete — {result.searched} URLs searched, {result.docsFound} new doc{result.docsFound !== 1 ? "s" : ""} added to queue.
          </p>
        </div>
      )}

      {open && (
        <div className="border-t border-slate-800 bg-slate-950 px-4 py-3 space-y-1.5">
          {docs.length === 0 && (
            <p className="text-slate-600 text-xs">No documents scraped yet.</p>
          )}
          {docs.map((doc) => (
            <DocRow
              key={doc.id}
              doc={doc}
              onDelete={(id) => setDocs((prev) => prev.filter((d) => d.id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SuburbList({ nswSuburbs, vicSuburbs, crawledMap, docsBySuburb }: Props) {
  const [tab, setTab] = useState<"nsw" | "vic">("nsw");

  const suburbs = tab === "nsw" ? nswSuburbs : vicSuburbs;

  const nswCrawled = nswSuburbs.filter((s) => crawledMap[s]).length;
  const vicCrawled = vicSuburbs.filter((s) => crawledMap[s]).length;

  return (
    <div>
      <div className="flex gap-1 mb-6">
        {(["nsw", "vic"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              tab === t
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {t.toUpperCase()}
            <span className="ml-2 text-xs font-mono opacity-60">
              {t === "nsw" ? `${nswCrawled}/${nswSuburbs.length}` : `${vicCrawled}/${vicSuburbs.length}`}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
        {suburbs.map((suburb) => (
          <SuburbRow
            key={suburb}
            suburb={suburb}
            crawled={crawledMap[suburb]}
            docs={docsBySuburb[suburb] ?? []}
          />
        ))}
      </div>
    </div>
  );
}
