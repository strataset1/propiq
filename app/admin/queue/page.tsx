export const dynamic = "force-dynamic";

import { createServiceClient } from "@/lib/supabase/server";
import { createBatch } from "@/lib/processing/batch";
import { ProcessButton } from "./process-button";
import { BackfillLiabilityButton } from "./backfill-button";
import { DocumentRow } from "./document-row";
import Anthropic from "@anthropic-ai/sdk";
import { extractCombined, COMBINED_SYSTEM_PROMPT, buildCombinedPrompt, COMBINED_MODEL } from "@/lib/processing/extract-combined";
import { saveAllExtractions } from "@/lib/db/liability-extractions";

async function processAllVision(): Promise<{ ok: true; queued: number; batchId: string } | { ok: false; error: string }> {
  "use server";

  const supabase = createServiceClient();
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const { data: docs } = await supabase
    .from("documents")
    .select("id, type, storage_path")
    .is("processed_at", null)
    .not("storage_path", "is", null)
    .limit(100);

  if (!docs || docs.length === 0) return { ok: false, error: "No documents with storage in queue" };

  // Generate signed URLs — Anthropic fetches the PDFs directly, nothing is downloaded server-side
  const requests = (await Promise.all(docs.map(async (doc) => {
    const { data: signed } = await supabase.storage
      .from("property-documents")
      .createSignedUrl(doc.storage_path!, 7200); // 2 hour expiry
    if (!signed?.signedUrl) return null;
    return {
      custom_id: doc.id,
      params: {
        model: COMBINED_MODEL,
        max_tokens: 4096,
        system: COMBINED_SYSTEM_PROMPT,
        betas: ["pdfs-2024-09-25"] as string[],
        messages: [{
          role: "user" as const,
          content: [
            { type: "document" as const, source: { type: "url" as const, url: signed.signedUrl } },
            { type: "text" as const, text: buildCombinedPrompt(doc.type) },
          ],
        }],
      },
    };
  }))).filter(Boolean) as NonNullable<Awaited<ReturnType<typeof Promise.all<any>>>>[0][];

  if (requests.length === 0) return { ok: false, error: "Could not generate signed URLs" };

  let batch;
  try {
    batch = await anthropic.beta.messages.batches.create({ requests: requests as any });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Anthropic API error" };
  }

  await supabase.from("processing_batches").insert({
    batch_id: batch.id,
    doc_ids: requests.map((r: any) => r.custom_id),
    status: "in_progress",
  });

  return { ok: true, queued: requests.length, batchId: batch.id };
}

async function checkBatches(): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  "use server";

  const supabase = createServiceClient();
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const { data: batches } = await supabase
    .from("processing_batches")
    .select("*")
    .eq("status", "in_progress");

  if (!batches || batches.length === 0) return { ok: false, error: "No in-progress batches" };

  let processed = 0;
  let expired = 0;
  let failed = 0;

  for (const batch of batches) {
    try {
      const apiBatch = await anthropic.beta.messages.batches.retrieve(batch.batch_id);

      if (apiBatch.processing_status === "ended") {
        const { pollAndWriteResults } = await import("@/lib/processing/batch");
        const result = await pollAndWriteResults(batch.batch_id, supabase);
        processed += result.processed;
        failed += result.failed;
        await supabase.from("processing_batches").update({ status: "complete" }).eq("id", batch.id);
      } else if (apiBatch.processing_status === "canceling" || (apiBatch as any).expired_at) {
        await supabase.from("processing_batches").update({ status: "expired" }).eq("id", batch.id);
        expired++;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown error";
      if (msg.toLowerCase().includes("credit") || msg.toLowerCase().includes("billing")) {
        return { ok: false, error: msg };
      }
      await supabase.from("processing_batches").update({ status: "expired" }).eq("id", batch.id);
      expired++;
    }
  }

  return {
    ok: true,
    message: `Done — ${processed} docs written, ${failed} failed, ${expired} batches expired`,
  };
}

async function processQueue(): Promise<{ ok: true; queued: number; batchId: string } | { ok: false; error: string; queued?: number }> {
  "use server";

  const supabase = createServiceClient();

  const { data: docs, error } = await supabase
    .from("documents")
    .select("id, type, extracted_text")
    .is("processed_at", null)
    .not("extracted_text", "is", null)
    .limit(25);

  if (error) return { ok: false, error: "Failed to fetch documents" };
  if (!docs || docs.length === 0) return { ok: false, error: "No documents with extracted text in queue" };

  let batchId: string;
  try {
    batchId = await createBatch(docs);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Anthropic API error" };
  }

  await supabase.from("processing_batches").insert({
    batch_id: batchId,
    doc_ids: docs.map((d) => d.id),
    status: "in_progress",
  });

  return { ok: true, queued: docs.length, batchId };
}

async function deleteOne(docId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  "use server";

  const supabase = createServiceClient();

  const { data: doc } = await supabase
    .from("documents")
    .select("storage_path")
    .eq("id", docId)
    .single();

  await supabase.from("strata_bylaws").delete().eq("document_id", docId);

  if (doc?.storage_path) {
    await supabase.storage.from("property-documents").remove([doc.storage_path]);
  }

  const { error } = await supabase.from("documents").delete().eq("id", docId);
  if (error) return { ok: false, error: "Failed to delete document" };

  return { ok: true };
}

async function processOne(docId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  "use server";

  const supabase = createServiceClient();

  const { data: doc } = await supabase
    .from("documents")
    .select("id, type, extracted_text, storage_path, property_id")
    .eq("id", docId)
    .single();

  if (!doc) return { ok: false, error: "Document not found" };

  try {
    const extraction = await extractCombined(doc, supabase);
    if (!extraction) return { ok: false, error: "Extraction returned null — no PDF or text available" };
    await saveAllExtractions(doc.property_id, docId, extraction, supabase);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Anthropic API error" };
  }

  return { ok: true };
}

async function getPendingLiabilityIds(): Promise<string[]> {
  "use server";
  const supabase = createServiceClient();

  const { data: docs } = await supabase
    .from("documents")
    .select("id")
    .not("processed_at", "is", null)
    .not("property_id", "is", null);

  if (!docs?.length) return [];

  // Return ALL processed docs — saveAllExtractions uses upsert so re-running is safe.
  // The old separate extractor left rows with null summaries; re-extracting fixes them.
  return docs.map((d) => d.id);
}

async function processLiabilityBatch(
  ids: string[]
): Promise<{ ok: true; processed: number } | { ok: false; error: string }> {
  "use server";
  const supabase = createServiceClient();

  const { data: docs } = await supabase
    .from("documents")
    .select("id, type, extracted_text, storage_path, property_id")
    .in("id", ids);

  if (!docs?.length) return { ok: true, processed: 0 };

  let processed = 0;
  for (const doc of docs) {
    try {
      const extraction = await extractCombined(doc as any, supabase);
      if (extraction) {
        await saveAllExtractions(doc.property_id!, doc.id, extraction, supabase);
        processed++;
      }
    } catch (e) {
      console.error("[backfill]", doc.id, e instanceof Error ? e.message : e);
    }
  }

  return { ok: true, processed };
}

async function importGreencliff(): Promise<{ ok: true; queued: number } | { ok: false; error: string }> {
  "use server";

  const supabase = createServiceClient();

  // Scrape the Greencliff public by-laws index page
  let html: string;
  try {
    const res = await fetch("https://www.greencliff.com.au/strata-bylaws", {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return { ok: false, error: `Greencliff page returned ${res.status}` };
    html = await res.text();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to fetch Greencliff page" };
  }

  const urls = [...new Set(html.match(/https?:\/\/[^"]*\.pdf/gi) ?? [])];
  if (urls.length === 0) return { ok: false, error: "No PDFs found on Greencliff page" };

  // Check which URLs are already ingested
  const { data: existing } = await supabase
    .from("documents")
    .select("source_url")
    .in("source_url", urls);

  const existingUrls = new Set((existing ?? []).map((d) => d.source_url));
  const newUrls = urls.filter((u) => !existingUrls.has(u));

  if (newUrls.length === 0) return { ok: false, error: "All Greencliff docs already imported" };

  // Queue each new PDF — property + address resolved during Claude processing
  let queued = 0;
  for (const url of newUrls) {
    const filename = decodeURIComponent(url.split("/").pop() ?? "");
    const label = filename.replace(/-[a-f0-9]{12,}\.pdf$/i, "").replace(/[_-]/g, " ").trim();

    const { data: property } = await supabase
      .from("properties")
      .insert({ address_raw: label, address_normalised: null, status: "processing" })
      .select()
      .single();

    if (!property) continue;

    const storagePath = `${property.id}/${Date.now()}-${filename}`;

    // Download and upload to storage
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const buffer = Buffer.from(await res.arrayBuffer());

      const { error: uploadErr } = await supabase.storage
        .from("property-documents")
        .upload(storagePath, buffer, { contentType: "application/pdf" });

      if (uploadErr) continue;
    } catch {
      continue;
    }

    await supabase.from("documents").insert({
      property_id: property.id,
      type: "strata",
      label,
      source_url: url,
      storage_path: storagePath,
      ingested_via: "crawler",
    });

    queued++;
  }

  return { ok: true, queued };
}

export default async function AdminQueuePage() {
  const supabase = createServiceClient();

  const [{ data: docs }, { count: totalPending }] = await Promise.all([
    supabase
      .from("documents")
      .select("id, label, type, ingested_via, processed_at, created_at, extracted_text, storage_path, source_url, properties(address_raw)")
      .is("processed_at", null)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .is("processed_at", null),
  ]);

  const { data: batches } = await supabase
    .from("processing_batches")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  const docsWithText = docs?.filter((d) => d.extracted_text && d.extracted_text.length > 200) ?? [];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Processing Queue</h1>
          <p className="text-slate-400 text-sm mt-1">{totalPending ?? 0} documents awaiting processing</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <BackfillLiabilityButton getPending={getPendingLiabilityIds} processBatch={processLiabilityBatch} />
          <ProcessButton processAction={importGreencliff} label="Import Greencliff (123 docs)" />
          {docsWithText.length > 0 && <ProcessButton processAction={processQueue} label="Batch Process (text)" />}
          {(totalPending ?? 0) > 0 && <ProcessButton processAction={processAllVision} label={`Process All ${totalPending} (vision)`} />}
        </div>
      </div>

      {batches && batches.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Claude Batches</h2>
            {batches.some((b) => b.status === "in_progress") && (
              <ProcessButton processAction={checkBatches} label="Check Batches" />
            )}
          </div>
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
          <DocumentRow
            key={doc.id}
            doc={{
              id: doc.id,
              label: doc.label,
              type: doc.type,
              ingested_via: doc.ingested_via,
              properties: doc.properties as { address_raw: string } | null,
              source_url: doc.source_url ?? null,
              isScanned: !doc.extracted_text || doc.extracted_text.length <= 200,
              hasStorage: !!doc.storage_path,
            }}
            processOne={processOne}
            deleteOne={deleteOne}
          />
        ))}
      </div>
    </div>
  );
}
