import { redirect } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";
import { findDocumentById } from "@/lib/db/documents";

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
        const { data, error } = await supabase.storage
          .from("property-documents")
          .createSignedUrl(doc.storage_path, 60 * 60);

        if (error || !data) {
          errorMessage = "Failed to generate download link. Please contact support.";
        } else {
          downloadUrl = data.signedUrl;
          docLabel = doc.label;
        }
      }
    }
  } catch {
    errorMessage = "Something went wrong. Please contact support.";
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
        {errorMessage ? (
          <>
            <div className="text-4xl mb-4">⚠️</div>
            <h1 className="text-white font-semibold text-lg mb-2">Something went wrong</h1>
            <p className="text-slate-400 text-sm mb-6">{errorMessage}</p>
            <Link
              href="/"
              className="inline-block bg-slate-800 hover:bg-slate-700 text-white text-sm px-6 py-2.5 rounded-lg transition-colors"
            >
              Back to search
            </Link>
          </>
        ) : (
          <>
            <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-white font-semibold text-lg mb-1">Payment successful</h1>
            <p className="text-slate-400 text-sm mb-6">
              {docLabel ?? "Your document"} is ready to download.
            </p>
            <a
              href={downloadUrl!}
              download
              className="inline-block bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm px-8 py-3 rounded-lg transition-colors"
            >
              Download PDF
            </a>
            <p className="text-slate-600 text-xs mt-4">Link expires in 1 hour</p>
            <Link
              href="/"
              className="block text-slate-500 hover:text-slate-400 text-xs mt-3 transition-colors"
            >
              Back to search
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
