"use client";

import Link from "next/link";
import { useState } from "react";

const SUBJECTS = [
  "API access & pricing",
  "Data coverage question",
  "Business partnership",
  "Technical support",
  "Media / press inquiry",
  "Other",
];

export default function ContactPage() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [form, setForm] = useState({ name: "", email: "", subject: SUBJECTS[0], message: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setStatus("sent");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <nav className="border-b border-slate-800/60 bg-slate-950/90 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-white font-bold tracking-tight text-lg">ByLawsIndex.com</Link>
          <div className="flex items-center gap-2">
            <Link href="/" className="text-slate-400 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors">Home</Link>
            <Link href="/about" className="text-slate-400 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors">About</Link>
            <Link href="/contact" className="text-white text-sm px-3 py-1.5 rounded-lg bg-slate-800">Contact</Link>
            <Link href="/login" className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-sm px-4 py-1.5 rounded-lg transition-colors font-medium">API Access →</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-xl mx-auto px-6 py-20 w-full">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-white mb-3">Get in touch</h1>
          <p className="text-slate-400 text-lg leading-relaxed">
            Whether you&apos;re interested in API access, have a data question, or just want to say hi — fill in the form and we&apos;ll get back to you within one business day.
          </p>
        </div>

        {status === "sent" ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-8 text-center">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-white font-semibold text-lg">Message sent!</p>
            <p className="text-slate-400 text-sm mt-2">We&apos;ll get back to you at {form.email} within one business day.</p>
            <Link href="/" className="mt-6 inline-block text-amber-400 hover:text-amber-300 text-sm transition-colors">← Back to search</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">Name</label>
                <input
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Your name"
                  className="w-full bg-slate-900 border border-slate-700 hover:border-slate-600 focus:border-amber-500 text-white rounded-lg px-4 py-3 text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-colors"
                />
              </div>
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">Email</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="you@example.com"
                  className="w-full bg-slate-900 border border-slate-700 hover:border-slate-600 focus:border-amber-500 text-white rounded-lg px-4 py-3 text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Subject</label>
              <select
                value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 hover:border-slate-600 focus:border-amber-500 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-colors"
              >
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Message</label>
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                placeholder="Tell us what you need…"
                className="w-full bg-slate-900 border border-slate-700 hover:border-slate-600 focus:border-amber-500 text-white rounded-lg px-4 py-3 text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-colors resize-none"
              />
            </div>

            {status === "error" && (
              <p className="text-red-400 text-sm">Something went wrong. Please email us directly at bylawsindex@gmail.com</p>
            )}

            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {status === "sending" ? (
                <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Sending…</>
              ) : "Send message"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
