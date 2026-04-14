import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { extractText } from "@/lib/processing/extract-text";
import { createBatch } from "@/lib/processing/batch";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Fetch unprocessed documents that have a storage path
  const { data: docs, error } = await supabase
    .from("documents")
    .select("id, storage_path, type, extracted_text")
    .is("processed_at", null)
    .not("storage_path", "is", null)
    .limit(25); // Claude batch limit is 10k but keep it sane

  if (error) {
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }

  if (!docs || docs.length === 0) {
    return NextResponse.json({ message: "No documents to process", queued: 0 });
  }

  // Extract text from any docs that don't have it yet
  const docsWithText: { id: string; type: string; extracted_text: string | null }[] = [];

  for (const doc of docs) {
    if (doc.extracted_text) {
      docsWithText.push({ id: doc.id, type: doc.type, extracted_text: doc.extracted_text });
      continue;
    }

    // Download from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("property-documents")
      .download(doc.storage_path!);

    if (downloadError || !fileData) {
      console.error(`Failed to download ${doc.id}:`, downloadError);
      continue;
    }

    // Extract text
    try {
      const buffer = Buffer.from(await fileData.arrayBuffer());
      const { text, pageCount } = await extractText(buffer);

      // Save extracted text back to the document
      await supabase
        .from("documents")
        .update({ extracted_text: text, page_count: pageCount })
        .eq("id", doc.id);

      docsWithText.push({ id: doc.id, type: doc.type, extracted_text: text });
    } catch (e) {
      console.error(`Failed to extract text from ${doc.id}:`, e);
    }
  }

  if (docsWithText.length === 0) {
    return NextResponse.json({ error: "Could not extract text from any documents" }, { status: 500 });
  }

  // Submit to Claude Batch API
  const batchId = await createBatch(docsWithText);

  // Record the batch
  await supabase.from("processing_batches").insert({
    batch_id: batchId,
    doc_ids: docsWithText.map((d) => d.id),
    status: "in_progress",
  });

  return NextResponse.json({ batchId, queued: docsWithText.length });
}
