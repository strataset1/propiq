const BASE_URL = "https://api.propiq.com.au/v1";

const endpoints = [
  {
    method: "GET",
    path: "/property/search?address={address}",
    desc: "Main lookup. Returns full property data or 202 if still processing.",
    responses: ["200 — ready", "202 — processing (returns job_id)", "429 — quota exceeded"],
  },
  {
    method: "GET",
    path: "/property/{id}",
    desc: "Fetch property by ID. Faster than address search for repeat lookups.",
    responses: ["200 — property data", "404 — not found"],
  },
  {
    method: "GET",
    path: "/property/{id}/documents",
    desc: "All documents for a property with 15-minute signed download URLs.",
    responses: ["200 — document list with URLs"],
  },
  {
    method: "GET",
    path: "/documents/{id}/download",
    desc: "Get a signed URL to download the original PDF.",
    responses: ["200 — { url, expires_in }"],
  },
  {
    method: "GET",
    path: "/jobs/{id}",
    desc: "Poll a discovery job returned from a 202 response.",
    responses: ["200 — { status: processing | ready | failed }"],
  },
  {
    method: "GET",
    path: "/account/usage",
    desc: "Current month usage, quota remaining, and plan details.",
    responses: ["200 — usage summary"],
  },
];

export default function DocsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">API Reference</h1>
        <p className="text-slate-400 text-sm mt-1">Base URL: <code className="font-mono text-sky-400">{BASE_URL}</code></p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-white">Authentication</h2>
        <p className="text-slate-400 text-sm">All requests require an API key in the Authorization header:</p>
        <pre className="bg-slate-950 rounded-lg p-3 text-sky-400 text-xs font-mono overflow-x-auto">
          {`Authorization: Bearer sk_live_xxxxxxxxxxxx`}
        </pre>
      </div>

      <div className="space-y-3">
        {endpoints.map((ep) => (
          <div key={ep.path} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-baseline gap-3">
              <span className="text-sky-400 font-mono text-sm font-bold">{ep.method}</span>
              <code className="text-white font-mono text-sm">{BASE_URL}{ep.path}</code>
            </div>
            <p className="text-slate-400 text-sm mt-2">{ep.desc}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {ep.responses.map((r) => (
                <span key={r} className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded font-mono">{r}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
