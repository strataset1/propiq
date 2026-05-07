export const dynamic = "force-dynamic";

import { createServiceClient } from "@/lib/supabase/server";
import { createBatch } from "@/lib/processing/batch";
import { ProcessButton } from "./process-button";
import { DocumentRow } from "./document-row";
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are a property document analyst specialising in Australian strata by-laws and property reports.
Extract the following attributes from the document. For each attribute respond with:
- value: "yes", "no", or "maybe"
- detail: brief plain-English note (1-2 sentences, or null if not mentioned)
- legal_summary: the exact by-law clause or legal language verbatim, or null if not present`;

const USER_PROMPT = (docType: string, text?: string) => `Document type: ${docType}

Extract these attributes and return ONLY a JSON code block with no other text:

\`\`\`json
{
  "address": "full street address of the property e.g. 12 Smith St, Newtown NSW 2042, or null if not found",
  "document_date": "YYYY-MM-DD or null if not found",
  "short_term_rental": { "value": "yes|no|maybe", "detail": "...", "legal_summary": "..." },
  "pets_allowed": { "value": "yes|no|maybe", "detail": "...", "legal_summary": "..." },
  "interior_renovations": { "value": "yes|no|maybe", "detail": "...", "legal_summary": "..." },
  "exterior_renovations": { "value": "yes|no|maybe", "detail": "...", "legal_summary": "..." },
  "confidence": 0.0
}
\`\`\`

For address: extract the full street address of the specific property or building this document relates to. Include street number, street name, suburb, state and postcode if present. Return null if no specific address is found.
For document_date: look for the date the by-law was registered, adopted, or last amended. Return in YYYY-MM-DD format, or null if not present.
${text ? `\nDocument text:\n${text.slice(0, 8000)}` : "\nExtract from the attached PDF document."}`;

async function saveExtraction(docId: string, propertyId: string, text: string) {
  const supabase = createServiceClient();
  const match = text.match(/```json\s*([\s\S]*?)```/) ?? [null, text.match(/\{[\s\S]*\}/)?.[0]];
  const raw = match[1];
  if (!raw) throw new Error("Unparseable response");
  const extraction = JSON.parse(raw);

  await supabase.from("strata_bylaws").upsert({
    document_id: docId,
    property_id: propertyId,
    document_date: extraction.document_date ?? null,
    short_term_rental_value: extraction.short_term_rental?.value,
    short_term_rental_detail: extraction.short_term_rental?.detail,
    short_term_rental_legal: extraction.short_term_rental?.legal_summary,
    pets_allowed_value: extraction.pets_allowed?.value,
    pets_allowed_detail: extraction.pets_allowed?.detail,
    pets_allowed_legal: extraction.pets_allowed?.legal_summary,
    interior_renovations_value: extraction.interior_renovations?.value,
    interior_renovations_detail: extraction.interior_renovations?.detail,
    interior_renovations_legal: extraction.interior_renovations?.legal_summary,
    exterior_renovations_value: extraction.exterior_renovations?.value,
    exterior_renovations_detail: extraction.exterior_renovations?.detail,
    exterior_renovations_legal: extraction.exterior_renovations?.legal_summary,
    confidence: extraction.confidence,
    model_version: "claude-sonnet-4-6",
    processed_at: new Date().toISOString(),
  });

  await supabase.from("documents").update({ processed_at: new Date().toISOString() }).eq("id", docId);

  // If Claude extracted a specific address, update the property record
  if (extraction.address) {
    const { normaliseAddress } = await import("@/lib/utils/address");
    const normalised = await normaliseAddress(extraction.address);
    await supabase.from("properties").update({
      address_raw: extraction.address,
      address_normalised: normalised,
      status: "ready",
    }).eq("id", propertyId);
  } else {
    await supabase.from("properties").update({ status: "ready" }).eq("id", propertyId);
  }
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
      const apiBatch = await anthropic.messages.batches.retrieve(batch.batch_id);

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
    } catch {
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

  const batchId = await createBatch(docs);

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

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let responseText: string;

  if (doc.storage_path) {
    // Always send the full PDF to Claude — handles both text-based and scanned
    const { data: fileData, error: dlError } = await supabase.storage
      .from("property-documents")
      .download(doc.storage_path);

    if (dlError || !fileData) return { ok: false, error: "Could not download PDF from storage" };

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const base64 = buffer.toString("base64");

    const message = await anthropic.beta.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      betas: ["pdfs-2024-09-25"],
      messages: [{
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: base64 },
          },
          { type: "text", text: USER_PROMPT(doc.type) },
        ],
      }],
    });
    responseText = message.content[0].type === "text" ? message.content[0].text : "";

  } else if (doc.extracted_text) {
    // Fallback: no PDF in storage, use extracted text
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: USER_PROMPT(doc.type, doc.extracted_text) }],
    });
    responseText = message.content[0].type === "text" ? message.content[0].text : "";

  } else {
    return { ok: false, error: "No PDF or extracted text available" };
  }

  try {
    await saveExtraction(docId, doc.property_id, responseText);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: `Failed to save: ${e instanceof Error ? e.message : "unknown"}` };
  }
}

export default async function AdminQueuePage() {
  const supabase = createServiceClient();

  const { data: docs } = await supabase
    .from("documents")
    .select("id, label, type, ingested_via, processed_at, created_at, extracted_text, storage_path, properties(address_raw)")
    .is("processed_at", null)
    .order("created_at", { ascending: false })
    .limit(500);

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
          <p className="text-slate-400 text-sm mt-1">{docs?.length ?? 0} documents awaiting processing</p>
        </div>
        {docsWithText.length > 0 && <ProcessButton processAction={processQueue} />}
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
