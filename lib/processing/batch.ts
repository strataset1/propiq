import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildCombinedBatchRequest,
  parseCombinedResponse,
  COMBINED_MODEL,
} from "@/lib/processing/extract-combined";
import { saveAllExtractions } from "@/lib/db/liability-extractions";

type DocInput = {
  id: string;
  type: string;
  extracted_text: string | null;
};

export function buildBatchRequests(docs: DocInput[]) {
  return docs.map((doc) =>
    buildCombinedBatchRequest({ id: doc.id, type: doc.type, extracted_text: doc.extracted_text ?? "" })
  );
}

export async function createBatch(docs: DocInput[]): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const requests = buildBatchRequests(docs);
  const batch = await client.messages.batches.create({ requests });
  return batch.id;
}

export async function pollAndWriteResults(
  batchId: string,
  supabase: SupabaseClient
): Promise<{ processed: number; failed: number }> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let processed = 0;
  let failed = 0;

  for await (const result of await client.messages.batches.results(batchId)) {
    if (result.result.type !== "succeeded") {
      failed++;
      continue;
    }

    const content = result.result.message.content[0];
    const text = content.type === "text" ? content.text : null;
    if (!text) { failed++; continue; }

    const extraction = parseCombinedResponse(text);
    if (!extraction) { failed++; continue; }

    const docId = result.custom_id;

    const { data: doc } = await supabase
      .from("documents")
      .select("property_id")
      .eq("id", docId)
      .single();

    if (!doc) { failed++; continue; }

    try {
      await saveAllExtractions(doc.property_id, docId, extraction, supabase);
      processed++;
    } catch (e) {
      console.error("[batch write]", docId, e instanceof Error ? e.message : e);
      failed++;
    }
  }

  return { processed, failed };
}
