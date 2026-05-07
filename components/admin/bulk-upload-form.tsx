"use client";

import { useState, useRef } from "react";
import { flushSync } from "react-dom";
import { PDFParse } from "pdf-parse";
import { createClient } from "@/lib/supabase/client";

const DOC_TYPES = ["strata", "building_inspection", "contract", "lease", "council", "other"];

type FileEntry = {
  id: string;
  file: File;
  fileHash: string | null;
  address: string;
  type: string;
  label: string;
  status: "extracting" | "pending" | "uploading" | "done" | "duplicate" | "error";
  message: string;
  extractedText: string | null;
  pageCount: number | null;
  isScanned: boolean;
};

type PrepareResult =
  | { ok: true; signedUrl: string; token: string; storagePath: string; propertyId: string }
  | { ok: true; duplicate: true; documentId: string }
  | { ok: false; error: string };

type FinalizeResult =
  | { ok: true; documentId: string }
  | { ok: false; error: string };

type BulkUploadFormProps = {
  prepareUpload: (input: {
    filename: string; type: string; label: string; address: string;
    pageCount: number | null; fileHash: string;
  }) => Promise<PrepareResult>;
  finalizeUpload: (input: {
    propertyId: string; storagePath: string; fileHash: string; type: string;
    label: string; extractedText: string | null; pageCount: number | null;
  }) => Promise<FinalizeResult>;
};

async function computeHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function extractPdfText(file: File): Promise<{ text: string; pageCount: number; isScanned: boolean }> {
  const buffer = await file.arrayBuffer();
  const parser = new PDFParse({ data: Buffer.from(buffer) });
  const result = await parser.getText();
  const text = result.text.trim();
  const pageCount = result.total ?? 1;
  const isScanned = text.length / pageCount < 50;
  return { text, pageCount, isScanned };
}

export function BulkUploadForm({ prepareUpload, finalizeUpload }: BulkUploadFormProps) {
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
      fileHash: null,
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

    for (const entry of newEntries) {
      try {
        const [{ text, pageCount, isScanned }, fileHash] = await Promise.all([
          extractPdfText(entry.file),
          computeHash(entry.file),
        ]);
        update(entry.id, {
          status: "pending",
          extractedText: isScanned ? null : text,
          pageCount,
          isScanned,
          fileHash,
        });
      } catch {
        const fileHash = await computeHash(entry.file).catch(() => null);
        update(entry.id, { status: "pending", extractedText: null, pageCount: null, isScanned: true, fileHash });
      }
    }
  }

  async function handleUploadAll() {
    const pending = entries.filter((e) => e.status === "pending");
    if (pending.length === 0) return;

    setUploading(true);
    const supabase = createClient();

    for (const entry of pending) {
      if (!entry.fileHash) {
        update(entry.id, { status: "error", message: "Could not hash file" });
        continue;
      }

      flushSync(() => update(entry.id, { status: "uploading", message: "" }));

      try {
        // Step 1: check duplicate + get signed upload URL (metadata only, no file)
        const prepared = await prepareUpload({
          filename: entry.file.name,
          type: entry.type,
          label: entry.label,
          address: entry.address,
          pageCount: entry.pageCount,
          fileHash: entry.fileHash,
        });

        if (!prepared.ok) {
          update(entry.id, { status: "error", message: prepared.error });
          continue;
        }

        if ("duplicate" in prepared && prepared.duplicate) {
          update(entry.id, { status: "duplicate", message: "Already exists — skipped" });
          continue;
        }

        // Step 2: upload file directly from browser to Supabase (no server action, no size limits)
        const { error: uploadError } = await supabase.storage
          .from("property-documents")
          .uploadToSignedUrl(prepared.storagePath, prepared.token, entry.file, {
            contentType: "application/pdf",
          });

        if (uploadError) {
          update(entry.id, { status: "error", message: `Storage upload failed: ${uploadError.message}` });
          continue;
        }

        // Step 3: save document record
        const finalised = await finalizeUpload({
          propertyId: prepared.propertyId,
          storagePath: prepared.storagePath,
          fileHash: entry.fileHash,
          type: entry.type,
          label: entry.label,
          extractedText: entry.extractedText,
          pageCount: entry.pageCount,
        });

        if (!finalised.ok) {
          update(entry.id, { status: "error", message: finalised.error });
        } else {
          update(entry.id, { status: "done", message: "Uploaded" });
        }
      } catch (err) {
        update(entry.id, { status: "error", message: err instanceof Error ? err.message : "Unexpected error" });
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
