import { createServiceClient } from "@/lib/supabase/server";
import { createBatch } from "@/lib/processing/batch";
import { ProcessButton } from "./process-button";

async function processQueue(): Promise<{ ok: true; queued: number; batchId: string } | { ok: false; error: string; queued?: number }> {
  "use server";

  const supabase = createServiceClient();

  // Only process docs that already have extracted_text (set by the local crawler)
  const { data: docs, error } = await supabase
    .from("documents")
    .select("id, type, extracted_text")
    .is("processed_at", null)
    .not("extracted_text", "is", null)
    .limit(25);

  if (error) return { ok: false, error: "Failed to fetch documents" };
  if (!docs || docs.length === 0) return { ok: false, error: "No documents with extracted text in queue" };

  const batchId = await createBatch(docs);

  await supabase.from("processing_batches").insert({
    batch_id: batchId,
    doc_ids: docs.map((d) => d.id),
    status: "in_progress",
  });

  return { ok: true, queued: docs.length, batchId };
}

export default async function AdminQueuePage() {
  const supabase = createServiceClient();

  const { data: docs } = await supabase
    .from("documents")
    .select("id, label, type, ingested_via, processed_at, created_at, properties(address_raw)")
    .is("processed_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: batches } = await supabase
    .from("processing_batches")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Processing Queue</h1>
          <p className="text-slate-400 text-sm mt-1">{docs?.length ?? 0} documents awaiting processing</p>
        </div>
        {(docs?.length ?? 0) > 0 && <ProcessButton processAction={processQueue} />}
      </div>

      {batches && batches.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Claude Batches</h2>
          {batches.map((batch) => (
            <div key={batch.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-white font-mono text-xs">{batch.batch_id}</p>
                <p className="text-slate-500 text-xs mt-0.5">{batch.doc_ids.length} documents</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded font-mono ${
                batch.status === "in_progress" ? "bg-amber-950 text-amber-400" :
                batch.status === "complete" ? "bg-emerald-950 text-emerald-400" :
                "bg-red-950 text-red-400"
              }`}>
                {batch.status}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Unprocessed Documents</h2>
        {docs?.length === 0 && (
          <p className="text-slate-500 text-sm py-4 text-center">Queue is empty.</p>
        )}
        {docs?.map((doc) => (
          <div key={doc.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm">{doc.label}</p>
                <p className="text-slate-500 text-xs mt-0.5 font-mono">
                  {(doc.properties as { address_raw: string } | null)?.address_raw} · {doc.type} · via {doc.ingested_via}
                </p>
              </div>
              <span className="text-amber-400 text-xs bg-amber-950 px-2 py-0.5 rounded">pending</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
