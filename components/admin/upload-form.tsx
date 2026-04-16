"use client";

import { useState, useRef } from "react";
import { flushSync } from "react-dom";
import { PDFParse } from "pdf-parse";

const DOC_TYPES = ["strata", "building_inspection", "contract", "lease", "council", "other"];

type UploadResult = { ok: true; documentId: string } | { ok: false; error: string };

type UploadFormProps = {
  uploadAction: (formData: FormData) => Promise<UploadResult>;
};

async function extractPdfText(file: File): Promise<{ text: string; pageCount: number; isScanned: boolean }> {
  const buffer = await file.arrayBuffer();
  const parser = new PDFParse({ data: Buffer.from(buffer) });
  const result = await parser.getText();
  const text = result.text.trim();
  const pageCount = result.totalPages ?? 1;
  const isScanned = text.length / pageCount < 50;
  return { text, pageCount, isScanned };
}

export function UploadForm({ uploadAction }: UploadFormProps) {
  const [status, setStatus] = useState<"idle" | "extracting" | "uploading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [extractInfo, setExtractInfo] = useState<{ chars: number; isScanned: boolean } | null>(null);
  const extractedRef = useRef<{ text: string | null; pageCount: number | null }>({ text: null, pageCount: null });

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) { setExtractInfo(null); return; }

    setStatus("extracting");
    setExtractInfo(null);
    try {
      const { text, pageCount, isScanned } = await extractPdfText(file);
      extractedRef.current = { text: isScanned ? null : text, pageCount };
      setExtractInfo({ chars: text.length, isScanned });
    } catch {
      extractedRef.current = { text: null, pageCount: null };
      setExtractInfo({ chars: 0, isScanned: true });
    }
    setStatus("idle");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    flushSync(() => setStatus("uploading"));

    const formData = new FormData(e.currentTarget);
    if (extractedRef.current.text) formData.append("extracted_text", extractedRef.current.text);
    if (extractedRef.current.pageCount) formData.append("page_count", String(extractedRef.current.pageCount));
    const result = await uploadAction(formData);

    if (result.ok) {
      setStatus("done");
      setMessage(`Uploaded. Document ID: ${result.documentId}`);
      setExtractInfo(null);
      extractedRef.current = { text: null, pageCount: null };
      (e.target as HTMLFormElement).reset();
    } else {
      setStatus("error");
      setMessage(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-slate-400 text-xs uppercase tracking-wide mb-1">Property Address</label>
          <input
            name="address"
            required
            placeholder="12 Smith St, Sydney NSW 2000"
            className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-slate-400 text-xs uppercase tracking-wide mb-1">Document Type</label>
          <select
            name="type"
            required
            className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            {DOC_TYPES.map((t) => (
              <option key={t} value={t}>{t.replace("_", " ")}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-slate-400 text-xs uppercase tracking-wide mb-1">Label</label>
          <input
            name="label"
            required
            placeholder="Strata Report — Feb 2025"
            className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-slate-400 text-xs uppercase tracking-wide mb-1">PDF File</label>
          <input
            name="file"
            type="file"
            accept=".pdf"
            required
            onChange={handleFileChange}
            className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 file:mr-3 file:bg-slate-700 file:border-0 file:text-white file:text-xs file:rounded file:px-2 file:py-1"
          />
          {status === "extracting" && <p className="text-slate-500 text-xs mt-1">Extracting text…</p>}
          {extractInfo && status !== "extracting" && (
            <p className="text-xs mt-1">
              {extractInfo.isScanned
                ? <span className="text-slate-400">Scanned PDF — will process with vision</span>
                : <span className="text-emerald-600">{extractInfo.chars.toLocaleString()} chars extracted</span>
              }
            </p>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={status === "uploading" || status === "extracting"}
        className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold text-sm px-6 py-2 rounded-lg transition-colors"
      >
        {status === "uploading" ? "Uploading…" : "Upload Document"}
      </button>

      {message && (
        <p className={`text-sm ${status === "done" ? "text-emerald-400" : "text-red-400"}`}>
          {message}
        </p>
      )}
    </form>
  );
}
