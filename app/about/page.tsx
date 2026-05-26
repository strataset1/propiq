import Link from "next/link";

export const metadata = { title: "About — Strataset" };

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <nav className="border-b border-slate-800/60 bg-slate-950/90 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-white font-bold tracking-tight text-lg">Strataset</Link>
          <div className="flex items-center gap-2">
            <Link href="/about" className="text-white text-sm px-3 py-1.5 rounded-lg bg-slate-800">About</Link>
            <Link href="/contact" className="text-slate-400 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors">Contact</Link>
            <Link href="/login" className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-sm px-4 py-1.5 rounded-lg transition-colors font-medium">API Access →</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-20 w-full space-y-20">

        {/* Headline */}
        <div>
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1 mb-6">
            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
            <span className="text-amber-400 text-xs font-medium">About Strataset</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-5">
            Australia&apos;s strata<br />
            <span className="text-amber-400">by-law intelligence platform.</span>
          </h1>
          <p className="text-slate-300 text-xl leading-relaxed">
            Strataset makes strata by-law data accessible to everyone — whether you&apos;re a renter checking if you can keep a dog, a buyer assessing investment risk, or a PropTech platform needing bulk data at scale.
          </p>
        </div>

        {/* What is strata? */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">What is strata?</h2>
          <p className="text-slate-300 text-lg leading-relaxed mb-4">
            Over 3 million Australians live in strata properties — apartments, townhouses, and units governed by a body corporate or owners corporation. Every strata scheme has a set of by-laws: legally binding rules that dictate what owners and tenants can and can&apos;t do.
          </p>
          <p className="text-slate-300 text-lg leading-relaxed">
            These by-laws cover everything from whether you can keep pets and renovate your kitchen, to who&apos;s financially responsible when the building&apos;s cladding needs to be replaced. Until now, accessing this information has required knowing exactly where to look — and often paying a solicitor to interpret it.
          </p>
        </div>

        {/* What we do */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">What we do</h2>
          <p className="text-slate-300 text-lg leading-relaxed mb-6">
            We source by-law documents directly from licensed strata managers and official Australian state land registries, then use AI trained on Australian property law to extract the key data points that actually matter.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: "🔍", title: "Instant search", desc: "Search any address or suburb and see by-law data in seconds." },
              { icon: "🤖", title: "AI extraction", desc: "Claude AI reads every document and extracts 12 structured data points per property." },
              { icon: "📄", title: "Original documents", desc: "Download the verified PDF directly — not a summary, the actual document." },
              { icon: "🔌", title: "API access", desc: "Integrate strata intelligence into your own platform via our REST API." },
            ].map((f) => (
              <div key={f.title} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <span className="text-2xl">{f.icon}</span>
                <p className="text-white font-semibold mt-3 mb-1">{f.title}</p>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Who it's for */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Who is Strataset for?</h2>
          <p className="text-slate-300 text-lg leading-relaxed mb-6">
            Strataset serves two types of users:
          </p>
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <p className="text-white font-semibold text-lg mb-2">Consumers — buyers, renters, and investors</p>
              <p className="text-slate-400 leading-relaxed">
                Anyone can use the public search to look up a property and see its by-law summary for free. If you want the original PDF document, it&apos;s a one-time purchase for $9.95 — no account required.
              </p>
              <ul className="mt-3 space-y-1.5">
                {["Renters checking pet and renovation rules before signing", "Buyers assessing levy exposure and defect risk", "Investors evaluating short-term rental viability"].map(i => (
                  <li key={i} className="text-slate-400 text-sm flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">→</span>{i}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <p className="text-white font-semibold text-lg mb-2">Businesses — PropTech, legal, and real estate platforms</p>
              <p className="text-slate-400 leading-relaxed">
                Professional teams access Strataset via API. Business accounts get a monthly quota of property lookups, bulk search, webhook delivery, and custom data fields. Pricing is based on usage volume.
              </p>
              <ul className="mt-3 space-y-1.5">
                {["Property portals embedding strata insights in listings", "Conveyancers running automated due diligence", "Mortgage brokers and valuers assessing strata risk at scale"].map(i => (
                  <li key={i} className="text-slate-400 text-sm flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">→</span>{i}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Data legitimacy */}
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-6">
          <div className="flex gap-4">
            <svg className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div>
              <p className="text-emerald-400 font-semibold mb-2">Official, verified data</p>
              <p className="text-slate-300 leading-relaxed">
                All documents on Strataset are sourced from licensed strata managers and official Australian state land registries. We do not scrape third-party listing sites. Every document is the actual registered by-law — the same one a solicitor would reference in a legal dispute. AI extraction is performed by Claude, trained on Australian property law and cross-referenced against the source document.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-6 py-3 rounded-lg transition-colors text-center">
            Search a property
          </Link>
          <Link href="/contact" className="border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white px-6 py-3 rounded-lg transition-colors text-center">
            Get in touch
          </Link>
        </div>

      </div>
    </div>
  );
}
