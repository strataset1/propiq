"use client";

import { useState } from "react";

const DOC_TYPES = ["strata", "building_inspection", "contract", "lease", "council", "other"];

export function UploadForm() {
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("uploading");

    const formData = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/upload", {
      method: "POST",
      headers: { "x-admin-secret": process.env.NEXT_PUBLIC_ADMIN_SECRET ?? "" },
      body: formData,
    });

    const data = await res.json();
    if (res.ok) {
      setStatus("done");
      setMessage(`Uploaded. Document ID: ${data.document_id}`);
      (e.target as HTMLFormElement).reset();
    } else {
      setStatus("error");
      setMessage(data.error ?? "Upload failed");
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
            className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 file:mr-3 file:bg-slate-700 file:border-0 file:text-white file:text-xs file:rounded file:px-2 file:py-1"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={status === "uploading"}
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
