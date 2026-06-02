import { redirect } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";
import { findDocumentById } from "@/lib/db/documents";

const LIABILITY_LABELS: Record<string, { label: string; icon: string }> = {
  combustible_cladding:       { label: "Combustible cladding",      icon: "🔥" },
  building_defect:            { label: "Building defects",          icon: "🏗️" },
  str_rules:                  { label: "Short-term rental rules",   icon: "🏠" },
  maintenance_responsibility: { label: "Maintenance responsibility", icon: "🔧" },
  insurance_excess:           { label: "Insurance excess",          icon: "🛡️" },
  special_levy:               { label: "Special levy / assessment", icon: "💰" },
  mixed_use_occupancy:        { label: "Use restrictions",          icon: "🏢" },
  pets:                       { label: "Pets",                      icon: "🐾" },
};

const BY_LAW_FIELDS = [
  { label: "Pets",              icon: "🐾", key: "pets_allowed_value"         },
  { label: "Short-term rental", icon: "🏠", key: "short_term_rental_value"    },
  { label: "Interior reno",     icon: "🔨", key: "interior_renovations_value" },
  { label: "Exterior reno",     icon: "🏗️", key: "exterior_renovations_value" },
];

const VALUE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  yes:   { label: "Allowed",     color: "text-emerald-400", bg: "bg-emerald-500/10" },
  no:    { label: "Not allowed", color: "text-red-400",     bg: "bg-red-500/10"     },
  maybe: { label: "Conditional", color: "text-amber-400",   bg: "bg-amber-500/10"   },
};

const PARTY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  lot_owner:     { label: "Owner",         color: "text-amber-400",  bg: "bg-amber-500/10"  },
  strata:        { label: "Strata / HOA",  color: "text-indigo-400", bg: "bg-indigo-500/10" },
  shared:        { label: "Shared",        color: "text-purple-400", bg: "bg-purple-500/10" },
  not_mentioned: { label: "Not mentioned", color: "text-slate-500",  bg: "bg-slate-800/50"  },
};

export default async function DownloadPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const { session: sessionId } = await searchParams;
  if (!sessionId) redirect("/");

  let errorMessage: string | null = null;
  let downloadUrl: string | null = null;
  let docLabel: string | null = null;
  let address: string | null = null;
  let bylaws: Record<string, string | number | null> | null = null;
  let liab: Record<string, string | number | null> | null = null;

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      errorMessage = "Payment not completed. Please try again.";
    } else if (session.metadata?.type !== "doc_purchase" || !session.metadata.document_id) {
      errorMessage = "Invalid purchase session.";
    } else {
      const supabase = createServiceClient();
      const doc = await findDocumentById(session.metadata.document_id, supabase);

      if (!doc?.storage_path) {
        errorMessage = "Document not available. Please contact support.";
      } else {
        const { data: signed, error } = await supabase.storage
          .from("property-documents")
          .createSignedUrl(doc.storage_path, 60 * 60);

        if (error || !signed) {
          errorMessage = "Failed to generate download link. Please contact support.";
        } else {
          downloadUrl = signed.signedUrl;
          docLabel = doc.label;

          // Fetch full extracted data — gated here, behind verified Stripe payment
          const [propResult, bylawsResult, liabResult] = await Promise.all([
            supabase.from("properties").select("address_raw").eq("id", doc.property_id).maybeSingle(),
            supabase
              .from("strata_bylaws")
              .select("pets_allowed_value, short_term_rental_value, interior_renovations_value, exterior_renovations_value, confidence")
              .eq("property_id", doc.property_id)
              .order("processed_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
            supabase
              .from("strata_liability_extractions")
              .select("combustible_cladding_summary, combustible_cladding_responsible_party, combustible_cladding_source, building_defect_summary, building_defect_responsible_party, building_defect_source, str_rules_summary, str_rules_responsible_party, str_rules_source, maintenance_responsibility_summary, maintenance_responsibility_responsible_party, maintenance_responsibility_source, insurance_excess_summary, insurance_excess_responsible_party, insurance_excess_source, special_levy_summary, special_levy_responsible_party, special_levy_source, mixed_use_occupancy_summary, mixed_use_occupancy_responsible_party, mixed_use_occupancy_source, pets_summary, pets_responsible_party, pets_source")
              .eq("property_id", doc.property_id)
              .order("processed_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
          ]);

          address = propResult.data?.address_raw ?? null;
          bylaws = (bylawsResult.data ?? null) as Record<string, string | number | null> | null;
          liab = (liabResult.data ?? null) as Record<string, string | number | null> | null;
        }
      }
    }
  } catch {
    errorMessage = "Something went wrong. Please contact support.";
  }

  if (errorMessage) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-white font-semibold text-lg mb-2">Something went wrong</h1>
          <p className="text-slate-400 text-sm mb-6">{errorMessage}</p>
          <Link href="/" className="inline-block bg-slate-800 hover:bg-slate-700 text-white text-sm px-6 py-2.5 rounded-lg transition-colors">
            Back to search
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <nav className="border-b border-slate-800/60 bg-slate-950/90 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-white font-bold tracking-tight text-lg">ByLawsIndex.com</Link>
          <Link href="/" className="text-slate-400 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors">← Search another property</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 pt-10 pb-20 w-full space-y-6">
        {/* Success header */}
        <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-5 flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-white font-semibold text-sm">{address ?? docLabel ?? "Your property"}</p>
              <span className="text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">Unlocked</span>
            </div>
            <p className="text-slate-400 text-sm">Payment successful — your full by-law summary and PDF are ready below.</p>
            <p className="text-slate-600 text-xs mt-1">Download link expires in 1 hour.</p>
          </div>
          <a
            href={downloadUrl!}
            download
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm px-6 py-3 rounded-lg transition-colors flex items-center gap-2 shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download PDF
          </a>
        </div>

        {/* By-law summary */}
        {bylaws && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">By-law summary</p>
              {bylaws.confidence != null && (
                <span className="text-xs text-slate-500">
                  AI confidence: <span className="text-slate-300 font-medium">{Math.round((bylaws.confidence as number) * 100)}%</span>
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {BY_LAW_FIELDS.map(({ label, icon, key }) => {
                const raw = bylaws![key] as string | null;
                const cfg = raw ? VALUE_CONFIG[raw] : null;
                return (
                  <div key={key} className={`flex items-center gap-2.5 px-3 py-3 rounded-lg ${cfg ? cfg.bg : "bg-slate-800/50"}`}>
                    <span className="text-lg shrink-0">{icon}</span>
                    <div>
                      <p className="text-slate-400 text-xs">{label}</p>
                      {cfg ? (
                        <p className={`text-sm font-semibold whitespace-nowrap ${cfg.color}`}>{cfg.label}</p>
                      ) : (
                        <p className="text-slate-500 text-xs font-medium">Not mentioned</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Liability & risk */}
        {liab && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Liability &amp; risk summary</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(LIABILITY_LABELS).map(([key, meta]) => {
                const summary = liab![`${key}_summary`] as string | null;
                const party   = liab![`${key}_responsible_party`] as string | null;
                const source  = liab![`${key}_source`] as string | null;
                const partyCfg = party ? PARTY_CONFIG[party] : null;

                return (
                  <div key={key} className={`bg-slate-900 border rounded-xl p-4 ${summary ? "border-slate-700" : "border-slate-800"}`}>
                    <div className="flex items-start gap-3">
                      <span className={`text-base shrink-0 mt-0.5 ${summary ? "" : "opacity-40"}`}>{meta.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                          <p className={`text-sm font-medium ${summary ? "text-white" : "text-slate-400"}`}>{meta.label}</p>
                          {summary && partyCfg && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${partyCfg.bg} ${partyCfg.color} whitespace-nowrap`}>
                              {partyCfg.label}
                            </span>
                          )}
                        </div>
                        {summary ? (
                          <>
                            <p className="text-slate-300 text-sm leading-relaxed">{summary}</p>
                            {source && (
                              <p className="text-slate-600 text-xs mt-2 italic border-l-2 border-slate-700 pl-2 leading-relaxed">
                                &ldquo;{source}&rdquo;
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-slate-600 text-xs">Not mentioned in this document</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
