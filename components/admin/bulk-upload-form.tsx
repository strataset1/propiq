"use client";

import { useState, useRef } from "react";
import { flushSync } from "react-dom";
import { PDFParse } from "pdf-parse";

const DOC_TYPES = ["strata", "building_inspection", "contract", "lease", "council", "other"];

type FileEntry = {
  id: string;
  file: File;
  address: string;
  type: string;
  label: string;
  status: "extracting" | "pending" | "uploading" | "done" | "duplicate" | "error";
  message: string;
  extractedText: string | null;
  pageCount: number | null;
  isScanned: boolean;
};

type UploadResult =
  | { ok: true; documentId: string }
  | { ok: true; duplicate: true; documentId: string }
  | { ok: false; error: string };

type BulkUploadFormProps = {
  uploadAction: (formData: FormData) => Promise<UploadResult>;
};

async function extractPdfText(file: File): Promise<{ text: string; pageCount: number; isScanned: boolean }> {
  const buffer = await file.arrayBuffer();
  const parser = new PDFParse({ data: Buffer.from(buffer) });
  const result = await parser.getText();
  const text = result.text.trim();
  const pageCount = result.total ?? 1;
  const isScanned = text.length / pageCount < 50;
  return { text, pageCount, isScanned };
}

export function BulkUploadForm({ uploadAction }: BulkUploadFormProps) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function update(id: string, patch: Partial<FileEntry>) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  function remove(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (inputRef.current) inputRef.current.value = "";

    const newEntries: FileEntry[] = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      address: "",
      type: "strata",
      label: file.name.replace(/\.pdf$/i, ""),
      status: "extracting",
      message: "",
      extractedText: null,
      pageCount: null,
      isScanned: false,
    }));

    setEntries((prev) => [...prev, ...newEntries]);

    // Extract text for each file in the browser
    for (const entry of newEntries) {
      try {
        const { text, pageCount, isScanned } = await extractPdfText(entry.file);
        update(entry.id, {
          status: "pending",
          extractedText: isScanned ? null : text,
          pageCount,
          isScanned,
        });
      } catch {
        update(entry.id, { status: "pending", extractedText: null, pageCount: null, isScanned: true });
      }
    }
  }

  async function handleUploadAll() {
    const pending = entries.filter((e) => e.status === "pending");
    if (pending.length === 0) return;

    setUploading(true);

    for (const entry of pending) {
      flushSync(() => update(entry.id, { status: "uploading", message: "" }));

      const formData = new FormData();
      formData.append("file", entry.file);
      formData.append("address", entry.address);
      formData.append("type", entry.type);
      formData.append("label", entry.label);
      if (entry.extractedText) formData.append("extracted_text", entry.extractedText);
      if (entry.pageCount) formData.append("page_count", String(entry.pageCount));

      const result = await uploadAction(formData);

      if (!result.ok) {
        update(entry.id, { status: "error", message: result.error });
      } else if ("duplicate" in result && result.duplicate) {
        update(entry.id, { status: "duplicate", message: "Already exists — skipped" });
      } else {
        update(entry.id, { status: "done", message: "Uploaded" });
      }
    }

    setUploading(false);
  }

  const pendingCount = entries.filter((e) => e.status === "pending").length;
  const doneCount = entries.filter((e) => e.status === "done" || e.status === "duplicate").length;

  return (
    <div className="space-y-6">
      {/* Progress summary */}
      {entries.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-slate-500 text-sm">
            {doneCount} of {entries.length} uploaded
            {pendingCount > 0 && ` · ${pendingCount} pending`}
          </p>
          <div className="flex gap-3">
            {pendingCount === 0 && doneCount > 0 && (
              <button
                onClick={() => setEntries([])}
                className="text-slate-400 hover:text-white text-sm px-4 py-2 rounded-lg border border-slate-700 transition-colors"
              >
                Clear
              </button>
            )}
            {pendingCount > 0 && (
              <button
                onClick={handleUploadAll}
                disabled={uploading}
                className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold text-sm px-6 py-2 rounded-lg transition-colors"
              >
                {uploading ? "Uploading…" : `Upload ${pendingCount} document${pendingCount === 1 ? "" : "s"}`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* File picker */}
      <div
        className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center cursor-pointer hover:border-amber-500 transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept=".pdf" multiple className="hidden" onChange={handleFiles} />
        <p className="text-slate-400 text-sm">Click to select PDFs, or drag and drop</p>
        <p className="text-slate-600 text-xs mt-1">Select multiple files at once</p>
      </div>

      {/* Entry list */}
      {entries.length > 0 && (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className={`bg-slate-900 border rounded-xl p-4 space-y-3 ${
                entry.status === "done" || entry.status === "duplicate"
                  ? "border-emerald-800"
                  : entry.status === "error"
                  ? "border-red-800"
                  : "border-slate-800"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-white text-sm font-mono truncate">{entry.file.name}</p>
                  {entry.status === "extracting" && (
                    <span className="text-slate-500 text-xs shrink-0">extracting…</span>
                  )}
                  {entry.status !== "extracting" && entry.isScanned && (
                    <span className="text-xs bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded shrink-0">scanned</span>
                  )}
                  {entry.status !== "extracting" && !entry.isScanned && entry.extractedText && (
                    <span className="text-xs text-emerald-600 shrink-0">{entry.extractedText.length.toLocaleString()} chars</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {entry.status === "pending" && (
                    <button onClick={() => remove(entry.id)} className="text-slate-500 hover:text-red-400 text-xs">
                      Remove
                    </button>
                  )}
                  {entry.status === "uploading" && <span className="text-amber-400 text-xs">Uploading…</span>}
                  {entry.status === "done" && <span className="text-emerald-400 text-xs">✓ Uploaded</span>}
                  {entry.status === "duplicate" && <span className="text-slate-400 text-xs">Already exists</span>}
                  {entry.status === "error" && <span className="text-red-400 text-xs">{entry.message}</span>}
                </div>
              </div>

              {(entry.status === "pending" || entry.status === "error") && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-3">
                    <input
                      value={entry.address}
                      onChange={(e) => update(entry.id, { address: e.target.value })}
                      placeholder="Property address (optional)"
                      className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <select
                      value={entry.type}
                      onChange={(e) => update(entry.id, { type: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      {DOC_TYPES.map((t) => (
                        <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      value={entry.label}
                      onChange={(e) => update(entry.id, { label: e.target.value })}
                      placeholder="Label"
                      className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
